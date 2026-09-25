const PALETTES = [
    ['334155', 'F1F5F9'], // Student names
    ['1D4ED8', 'EFF6FF'], // Blue
    ['6D28D9', 'F5F3FF'], // Violet
    ['0F766E', 'F0FDFA'], // Teal
    ['92400E', 'FFFBEB'], // Amber
    ['172554', 'E0E7FF'], // Result
]

const STATUS_COLORS = {
    Passed: ['166534', 'DCFCE7'],
    Failed: ['991B1B', 'FEE2E2'],
    Incomplete: ['92400E', 'FEF3C7'],
    'Check scores': ['991B1B', 'FEE2E2'],
    'Check settings': ['92400E', 'FEF3C7'],
}

const fill = rgb => ({
    patternType: 'solid',
    fgColor: { rgb },
})

const line = (rgb = 'CBD5E1', style = 'thin') => ({
    style,
    color: { rgb },
})

function cellAt(sheet, utils, row, column) {
    const address = utils.encode_cell({
        r: row,
        c: column,
    })

    return sheet[address] ?? (
        sheet[address] = { t: 's', v: '' }
    )
}

function cellStyle({
    color = '1E293B',
    background = 'FFFFFF',
    bold = false,
    size = 11,
    left = false,
} = {}) {
    return {
        font: {
            name: 'Calibri',
            sz: size,
            bold,
            color: { rgb: color },
        },
        fill: fill(background),
        alignment: {
            horizontal: left ? 'left' : 'center',
            vertical: 'center',
            wrapText: true,
        },
        border: {
            top: line(),
            bottom: line(),
            left: line(),
            right: line(),
        },
    }
}

function lineCount(value, width) {
    return String(value ?? '')
        .split('\n')
        .reduce(
            (sum, part) =>
                sum + Math.max(
                    1,
                    Math.ceil(
                        part.length / Math.max(4, width - 3)
                    )
                ),
            0
        )
}

function displayedValue(cell) {
    if (typeof cell.v !== 'number') return cell.v

    if (cell.z === '0%') {
        return `${Math.round(cell.v * 100)}%`
    }

    if (cell.z === '0.00') return cell.v.toFixed(2)
    if (cell.z === '0.0') return cell.v.toFixed(1)

    return cell.v
}

export function styleGradeSheet(sheet, utils, layout) {
    const {
        columns,
        groups,
        firstDataRow,
        rowCount,
        maxima,
        footerStart,
        footer,
    } = layout

    const widths = columns.map(column => column.width ?? 14)
    const fullWidth = widths.reduce((sum, width) => sum + width, 0)

    sheet['!cols'] = widths.map(wch => ({ wch }))
    sheet['!rows'] = []

    function paint(row, column, style) {
        const cell = cellAt(sheet, utils, row, column)

        cell.s = {
            ...style,
            ...(cell.z ? { numFmt: cell.z } : {}),
        }
    }

    function band(row, style, minHeight = 26) {
        for (let column = 0; column < columns.length; column++) {
            paint(row, column, style)
        }

        const text = cellAt(sheet, utils, row, 0).v

        sheet['!rows'][row] = {
            hpt: Math.min(
                409,
                Math.max(
                    minHeight,
                    lineCount(text, fullWidth) * 15 + 12
                )
            ),
        }
    }

    // Title and instructions.
    band(
        0,
        cellStyle({
            size: 22,
            bold: true,
            color: 'FFFFFF',
            background: '172554',
            left: true,
        }),
        42
    )

    band(
        1,
        cellStyle({
            color: 'DBEAFE',
            background: '172554',
            left: true,
        })
    )

    band(
        2,
        cellStyle({
            size: 10,
            color: '475569',
            background: 'F1F5F9',
            left: true,
        })
    )

    band(
        3,
        cellStyle({
            size: 10,
            color: '475569',
            left: true,
        })
    )

    // Category headers, assessment numbers, and maximum points.
    const starts = new Set()
    let start = 0
    let groupHeight = 36

    for (const group of groups) {
        const [dark, light] = PALETTES[group.palette ?? 0]

        const groupWidth = widths
            .slice(start, start + group.count)
            .reduce((sum, width) => sum + width, 0)

        groupHeight = Math.max(
            groupHeight,
            lineCount(group.label, groupWidth) * 15 + 12
        )

        starts.add(start)

        for (
            let column = start;
            column < start + group.count;
            column++
        ) {
            paint(
                4,
                column,
                cellStyle({
                    color: 'FFFFFF',
                    background: dark,
                    bold: true,
                })
            )

            paint(
                5,
                column,
                cellStyle({
                    color: dark,
                    background: light,
                    bold: true,
                    size: 10,
                })
            )

            if (maxima) {
                paint(
                    6,
                    column,
                    cellStyle({
                        background: 'FEF9C3',
                        color: '854D0E',
                        bold: true,
                    })
                )
            }
        }

        start += group.count
    }

    sheet['!rows'][4] = {
        hpt: Math.min(409, groupHeight),
    }

    sheet['!rows'][5] = {
        hpt: Math.min(
            409,
            Math.max(
                32,
                ...columns.map(
                    (column, index) =>
                        lineCount(column.label, widths[index]) * 13 + 10
                )
            )
        ),
    }

    if (maxima) {
        sheet['!rows'][6] = { hpt: 26 }
    }

    // Student scores and calculated results.
    for (let index = 0; index < rowCount; index++) {
        const row = firstDataRow + index
        let height = 30

        columns.forEach((column, columnIndex) => {
            const cell = cellAt(sheet, utils, row, columnIndex)
            const total = column.kind === 'total'

            const style = cellStyle({
                background: total
                    ? 'EFF6FF'
                    : index % 2
                        ? 'F8FAFC'
                        : 'FFFFFF',
                bold: total,
                left: column.kind === 'text',
                size: total ? 12 : 11,
            })

            let tone

            if (column.kind === 'grade') {
                const valid =
                    typeof cell.v === 'number' &&
                    Number.isFinite(cell.v) &&
                    cell.v >= 1 &&
                    cell.v <= 5

                tone = valid
                    ? STATUS_COLORS[cell.v > 3 ? 'Failed' : 'Passed']
                    : ['64748B', 'F1F5F9']

                style.font.sz = 16
            } else if (column.kind === 'status') {
                tone = STATUS_COLORS[cell.v]
            }

            if (tone) {
                style.font.bold = true
                style.font.color = { rgb: tone[0] }
                style.fill = fill(tone[1])
            }

            if (starts.has(columnIndex)) {
                style.border.left = line('94A3B8', 'medium')
            }

            paint(row, columnIndex, style)

            height = Math.max(
                height,
                lineCount(
                    displayedValue(cell),
                    widths[columnIndex]
                ) * 15 + 10
            )
        })

        sheet['!rows'][row] = {
            hpt: Math.min(409, height),
        }
    }

    // Assessment names and explanations for incomplete grades.
    footer.forEach((item, index) => {
        band(
            footerStart + index,
            cellStyle({
                size: 10,
                bold: Boolean(item.heading),
                left: true,
                color: item.heading ? 'FFFFFF' : '475569',
                background: item.heading ? '334155' : 'F8FAFC',
            })
        )
    })
}