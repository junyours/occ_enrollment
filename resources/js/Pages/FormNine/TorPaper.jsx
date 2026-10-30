import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { TorFooter, TorHeader, TorStudentDetails } from './TorChrome';
import { TorLastPageNotes } from './TorLastPageNotes';
import { paginateTorRecords } from './torPagination';
import { isDroppedGrade } from './recordGrades';
import './TorPaper.css';

const HEADINGS = ['Subject Code', 'Descriptive Title', 'Grade', 'Re-exam', 'Credits'];

function earnedUnits(subject) {
    const grade = subject.grade;
    const number = Number(grade);
    const units = Number(subject.credit_units);
    if (grade == null || String(grade).trim() === '' || !Number.isFinite(number)
        || number <= 0 || number > 3 || !Number.isFinite(units) || units < 0) return 0;
    return units;
}

function creditText(subject) {
    if (isDroppedGrade(subject.grade)) return 0;
    if (subject.grade == null || String(subject.grade).trim() === '') return '';
    return Number.isFinite(Number(subject.grade)) ? earnedUnits(subject) : '';
}

function SemesterHeading({ record, continued = false, measureKey }) {
    return (
        <tr className="tor-semester-heading" data-tor-measure={measureKey}>
            <th colSpan={5} scope="rowgroup">
                <span>{[String(record.course_name_abbreviation ?? '').trim() || record.program, record.semester && `${record.semester?.charAt(0).toUpperCase() + record.semester?.slice(1).toLowerCase()} Semester`, record.schoolyear && `SY ${record.schoolyear}`].filter(Boolean).join(' - ')}</span>
                {continued && <span> (continued)</span>}
                {record.school && <small>{record.school}</small>}
            </th>
        </tr>
    );
}

function SubjectRow({ subject, measureKey }) {
    return (
        <tr className="tor-subject-row" data-tor-measure={measureKey}>
            <td>{subject.subject_code ?? ''}</td>
            <td>{subject.descriptive_title ?? ''}</td>
            <td>{subject.grade ?? ''}</td>
            <td>{subject.re_exam ?? ''}</td>
            <td>{creditText(subject)}</td>
        </tr>
    );
}

function GradeTable({ children }) {
    return (
        <table className="tor-grades-table">
            <colgroup>
                <col style={{ width: '18%' }} />
                <col style={{ width: '49%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
                <col style={{ width: '11%' }} />
            </colgroup>
            <thead>
                <tr>{HEADINGS.map(heading => <th key={heading} scope="col">{heading}</th>)}</tr>
            </thead>
            <tbody>{children}</tbody>
        </table>
    );
}

function TotalRow({ total }) {
    return (
        <tr className="tor-total-row" data-tor-measure="total">
            <th colSpan={4} scope="row">Total earned units</th>
            <td>{Number(total.toFixed(2))}</td>
        </tr>
    );
}

function PageFrame({ data, options, first, last, pageNumber, totalPages, children, measurement, photoOptions, onPhotoFramingChange, photoEditingDisabled, photoActions }) {
    return (
        <section className="tor-page" data-tor-page={measurement || pageNumber} aria-label={measurement ? undefined : `Transcript page ${pageNumber} of ${totalPages}`}>
            <TorHeader data={data} />
            {first && <TorStudentDetails data={data} options={options} photoOptions={photoOptions} onPhotoFramingChange={onPhotoFramingChange} photoEditingDisabled={photoEditingDisabled} photoActions={photoActions} />}
            <div className="tor-record-area">
                <h2 className="tor-record-title">COLLEGIATE RECORD</h2>
                <GradeTable>{children}</GradeTable>
                <p className="tor-flow-marker">{pageNumber < totalPages ? '*** More entries on the next page ***' : '*** Transcript Closed ***'}</p>
            </div>
            {last && <TorLastPageNotes data={data} options={options} />}
            <TorFooter options={options} pageNumber={pageNumber} totalPages={totalPages} />
        </section>
    );
}

export default function TorPaper({ data, options, onReadyChange, onPhotoFramingChange, photoEditingDisabled = false, photoActions }) {
    const measurementRef = useRef(null);
    const notesMeasurementRef = useRef(null);
    const [layout, setLayout] = useState({ data: null, options: null, pages: [], error: null });
    const records = Array.isArray(data?.enrollmentRecord) ? data.enrollmentRecord : [];
    const currentLayout = layout.data === data && layout.options === options;
    // Keep the last complete pages mounted while the next layout is measured.
    // Their rows, header, notes, and footer must all use that same snapshot.
    const pages = layout.pages;
    const layoutError = currentLayout ? layout.error : null;
    // Photo framing has fixed dimensions, so it can update live while layout-affecting content keeps its measured snapshot.
    const visibleRecords = Array.isArray(layout.data?.enrollmentRecord) ? layout.data.enrollmentRecord : [];
    const total = records.reduce((sum, record) => sum + (record.subjects || []).reduce((units, subject) => units + earnedUnits(subject), 0), 0);
    const visibleTotal = visibleRecords.reduce((sum, record) => sum + (record.subjects || []).reduce((units, subject) => units + earnedUnits(subject), 0), 0);

    useLayoutEffect(() => {
        let cancelled = false;
        let assetsReady = false;
        let frame;
        const root = measurementRef.current;
        onReadyChange?.(false);
        setLayout(previous => ({ ...previous, error: null }));
        if (!root) return;

        const measure = () => {
            if (cancelled || window.matchMedia('print').matches) return;
            try {
                const first = root.querySelector('[data-tor-page="first"]');
                const next = root.querySelector('[data-tor-page="continuation"]');
                const height = element => element.getBoundingClientRect().height;
                const budget = page => {
                    const area = page.querySelector('.tor-record-area');
                    return height(area)
                        - height(area.querySelector('.tor-record-title'))
                        - height(area.querySelector('thead'))
                        - height(area.querySelector('.tor-flow-marker'))
                        - 4; // Room for fractional table borders and browser rounding.
                };
                const rowHeight = key => height(first.querySelector(`[data-tor-measure="${key}"]`));
                const groups = records.map((record, groupIndex) => ({
                    headingHeight: rowHeight(`heading-${groupIndex}`),
                    continuationHeadingHeight: rowHeight(`continued-${groupIndex}`),
                    rowHeights: (record.subjects?.length ? record.subjects : [null]).map((_, subjectIndex) => rowHeight(`subject-${groupIndex}-${subjectIndex}`)),
                }));
                const pages = paginateTorRecords(groups, {
                    firstPageHeight: budget(first),
                    continuationPageHeight: budget(next),
                    totalHeight: rowHeight('total'),
                    finalBlockHeight: notesMeasurementRef.current ? height(notesMeasurementRef.current) : 0,
                    keepWholeGroups: false,
                });
                if (!cancelled) {
                    setLayout({ data, options, pages, error: null });
                    onReadyChange?.(true);
                }
            } catch (error) {
                if (!cancelled) {
                    setLayout({ data, options, pages: [], error: error.message || 'Unable to lay out the transcript.' });
                    onReadyChange?.(false);
                }
            }
        };
        const schedule = () => {
            if (cancelled) return;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(measure);
        };
        const images = [...root.querySelectorAll('img')];
        const imageLoads = images.map(image => image.complete ? Promise.resolve() : new Promise(resolve => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
        }));
        Promise.all([document.fonts?.ready || Promise.resolve(), ...imageLoads]).then(() => {
            if (cancelled) return;
            assetsReady = true;
            schedule();
        });
        const observer = new ResizeObserver(() => {
            if (window.matchMedia('print').matches) return;
            onReadyChange?.(false);
            if (assetsReady) schedule();
        });
        root.querySelectorAll('.tor-header, .tor-student-details, .tor-footer, .tor-last-page-notes, [data-tor-measure]').forEach(element => observer.observe(element));
        return () => {
            cancelled = true;
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [data, options, onReadyChange]);

    const measurement = (
        <div className="tor-document tor-measure-host" ref={measurementRef} aria-hidden="true">
            <PageFrame data={data} options={options} first pageNumber={1} totalPages={2} measurement="first">
                {records.flatMap((record, groupIndex) => [
                    <SemesterHeading key={`heading-${groupIndex}`} record={record} measureKey={`heading-${groupIndex}`} />,
                    <SemesterHeading key={`continued-${groupIndex}`} record={record} continued measureKey={`continued-${groupIndex}`} />,
                    ...(record.subjects?.length ? record.subjects : [null]).map((subject, subjectIndex) => subject
                        ? <SubjectRow key={`subject-${groupIndex}-${subjectIndex}`} subject={subject} measureKey={`subject-${groupIndex}-${subjectIndex}`} />
                        : <tr key={`subject-${groupIndex}-0`} data-tor-measure={`subject-${groupIndex}-0`}><td colSpan={5}>No subjects recorded.</td></tr>),
                ])}
                <TotalRow total={total} />
            </PageFrame>
            <PageFrame data={data} options={options} pageNumber={2} totalPages={2} measurement="continuation" />
            <div ref={notesMeasurementRef} style={{ width: '186mm' }}><TorLastPageNotes data={data} options={options} /></div>
        </div>
    );

    return (
        <div className="tor-document" data-tor-ready={currentLayout && pages.length > 0 && !layoutError ? 'true' : 'false'}>
            <style media="print">{'@page { size: A4 portrait; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }'}</style>
            {layoutError && <div className="tor-layout-error" role="alert">Cannot prepare the TOR: {layoutError} Shorten the last-page notes, additional details, or remarks and try again.</div>}
            {!pages.length && !layoutError && <p role="status">Preparing transcript pages...</p>}
            {pages.map((page, pageIndex) => (
                <PageFrame key={pageIndex} data={layout.data} options={layout.options} photoOptions={options} onPhotoFramingChange={onPhotoFramingChange} photoEditingDisabled={photoEditingDisabled} photoActions={photoActions} first={pageIndex === 0} last={pageIndex === pages.length - 1} pageNumber={pageIndex + 1} totalPages={pages.length}>
                    {page.segments.flatMap(segment => {
                        const record = visibleRecords[segment.groupIndex];
                        const subjects = record.subjects?.length ? record.subjects : [null];
                        return [
                            <SemesterHeading key={`heading-${segment.groupIndex}`} record={record} continued={segment.continued} />,
                            ...subjects.slice(segment.subjectStart, segment.subjectEnd).map((subject, index) => subject
                                ? <SubjectRow key={`subject-${segment.groupIndex}-${segment.subjectStart + index}`} subject={subject} />
                                : <tr key={`empty-${segment.groupIndex}`}><td colSpan={5}>No subjects recorded.</td></tr>),
                        ];
                    })}
                    {page.showTotal && <TotalRow total={visibleTotal} />}
                </PageFrame>
            ))}
            {createPortal(measurement, document.body)}
        </div>
    );
}
