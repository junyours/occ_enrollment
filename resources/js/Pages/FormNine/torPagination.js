const HEIGHT_EPSILON = 1e-7;

const fits = (height, available) => height <= available + HEIGHT_EPSILON;

function requireHeight(value, label) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new Error(`TOR pagination: ${label} must be a finite, non-negative number.`);
    }
    return value;
}

/**
 * Paginate measured TOR semester groups without splitting a subject row.
 *
 * Page heights are the available table-body space after the caller reserves all
 * headers, footers, and end markers. Segment subjectEnd is exclusive. Empty
 * rowHeights groups are skipped; supply a measured synthetic row to show an
 * empty semester. A first page containing only biodata is a valid result.
 * Set keepWholeGroups to false to fill pages across semester boundaries.
 * finalBlockHeight reserves an optional notes block only on the final page,
 * alongside the total row. The caller renders that block outside the table;
 * include its complete outer height here and do not subtract it from every
 * page's body budget. An extra final page is emitted when both cannot fit.
 *
 * @param {Array<{headingHeight: number, continuationHeadingHeight: number, rowHeights: number[]}>} groups
 * @param {{firstPageHeight: number, continuationPageHeight: number, totalHeight: number, keepWholeGroups?: boolean, finalBlockHeight?: number}} options
 * @returns {Array<{segments: Array<{groupIndex: number, subjectStart: number, subjectEnd: number, continued: boolean}>, showTotal: boolean}>}
 */
export function paginateTorRecords(groups, options = {}) {
    if (!Array.isArray(groups)) {
        throw new Error('TOR pagination: groups must be an array.');
    }

    const firstPageHeight = requireHeight(options.firstPageHeight, 'firstPageHeight');
    const continuationPageHeight = requireHeight(options.continuationPageHeight, 'continuationPageHeight');
    const totalHeight = requireHeight(options.totalHeight, 'totalHeight');
    const finalBlockHeight = requireHeight(options.finalBlockHeight === undefined ? 0 : options.finalBlockHeight, 'finalBlockHeight');
    const finalContentHeight = requireHeight(totalHeight + finalBlockHeight, 'combined total and final-block height');
    const keepWholeGroups = options.keepWholeGroups === undefined ? true : options.keepWholeGroups;
    if (typeof keepWholeGroups !== 'boolean') {
        throw new Error('TOR pagination: keepWholeGroups must be a boolean when supplied.');
    }

    // Validate all measurements before planning pages, including skipped groups.
    const measuredGroups = Array.from(groups, (group, groupIndex) => {
        if (!group || !Array.isArray(group.rowHeights)) {
            throw new Error(`TOR pagination: group ${groupIndex + 1} must contain a rowHeights array.`);
        }

        const headingHeight = requireHeight(group.headingHeight, `group ${groupIndex + 1} headingHeight`);
        const continuationHeadingHeight = requireHeight(
            group.continuationHeadingHeight,
            `group ${groupIndex + 1} continuationHeadingHeight`,
        );
        const prefixHeights = [0];

        for (let subjectIndex = 0; subjectIndex < group.rowHeights.length; subjectIndex += 1) {
            const height = group.rowHeights[subjectIndex];
            requireHeight(height, `group ${groupIndex + 1} subject ${subjectIndex + 1} height`);
            const sum = prefixHeights[prefixHeights.length - 1] + height;
            if (!Number.isFinite(sum)) {
                throw new Error(`TOR pagination: group ${groupIndex + 1} combined row heights are too large.`);
            }
            prefixHeights.push(sum);
        }

        return { headingHeight, continuationHeadingHeight, rowHeights: group.rowHeights, prefixHeights };
    });

    const pages = [{ segments: [], showTotal: false }];
    let usedHeight = 0;

    const currentPage = () => pages[pages.length - 1];
    const currentCapacity = () => pages.length === 1 ? firstPageHeight : continuationPageHeight;
    const newPage = () => {
        pages.push({ segments: [], showTotal: false });
        usedHeight = 0;
    };

    measuredGroups.forEach((group, groupIndex) => {
        const { rowHeights, prefixHeights } = group;
        let start = 0;

        while (start < rowHeights.length) {
            const continued = start > 0;
            const headingHeight = continued ? group.continuationHeadingHeight : group.headingHeight;
            const remainingRowsHeight = prefixHeights[rowHeights.length] - prefixHeights[start];
            const remainingGroupHeight = headingHeight + remainingRowsHeight;
            const available = currentCapacity() - usedHeight;

            // Complete groups always stay together if they fit here. The
            // default policy also moves a group intact to a fresh page.
            if (fits(remainingGroupHeight, available)) {
                currentPage().segments.push({ groupIndex, subjectStart: start, subjectEnd: rowHeights.length, continued });
                usedHeight += remainingGroupHeight;
                break;
            }

            if (keepWholeGroups && fits(remainingGroupHeight, continuationPageHeight)) {
                newPage();
                currentPage().segments.push({ groupIndex, subjectStart: start, subjectEnd: rowHeights.length, continued });
                usedHeight = remainingGroupHeight;
                break;
            }

            const rowsAvailable = available - headingHeight;
            let end = start;
            let segmentRowsHeight = 0;

            while (end < rowHeights.length && fits(segmentRowsHeight + rowHeights[end], rowsAvailable)) {
                segmentRowsHeight += rowHeights[end];
                end += 1;
            }

            if (end === start) {
                if (pages.length === 1 || currentPage().segments.length > 0) {
                    newPage();
                    continue;
                }

                throw new Error(
                    `TOR pagination: group ${groupIndex + 1}, subject ${start + 1} requires ` +
                    `${headingHeight + rowHeights[start]}px including its heading, exceeding the ` +
                    `${continuationPageHeight}px continuation-page body. Shorten the content or adjust the layout.`,
                );
            }

            // Do not strand one last subject when moving one row from this page
            // lets the next page contain two. If two cannot fit there, the
            // single-row continuation is unavoidable and is retained intact.
            if (rowHeights.length - end === 1 && end - start >= 2) {
                const lastTwoHeight = group.continuationHeadingHeight +
                    rowHeights[rowHeights.length - 2] + rowHeights[rowHeights.length - 1];
                if (fits(lastTwoHeight, continuationPageHeight)) {
                    end -= 1;
                    segmentRowsHeight -= rowHeights[end];
                }
            }

            // Compact flow should not begin a multi-row segment with one row
            // at the bottom if the next page can accommodate at least two.
            // This check follows tail balancing, which can reduce two rows to
            // one. The page-content check makes advancing provably finite.
            if (!keepWholeGroups && end - start === 1 && rowHeights.length - start >= 2) {
                const firstTwoHeight = headingHeight + rowHeights[start] + rowHeights[start + 1];
                if (fits(firstTwoHeight, continuationPageHeight)
                    && (pages.length === 1 || currentPage().segments.length > 0)) {
                    newPage();
                    continue;
                }
            }

            currentPage().segments.push({ groupIndex, subjectStart: start, subjectEnd: end, continued });
            usedHeight += headingHeight + segmentRowsHeight;
            start = end;
            if (start < rowHeights.length) newPage();
        }
    });

    if (!fits(finalContentHeight, currentCapacity() - usedHeight)) {
        if (!fits(finalContentHeight, continuationPageHeight)) {
            const contentDescription = finalBlockHeight > 0 ? 'final total and notes block' : 'total-units row';
            throw new Error(
                `TOR pagination: ${contentDescription} requires ${finalContentHeight}px, exceeding the ` +
                `${continuationPageHeight}px continuation-page body. Adjust the layout.`,
            );
        }
        newPage();
    }
    currentPage().showTotal = true;

    return pages;
}
