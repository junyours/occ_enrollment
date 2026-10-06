import ExcelJS from 'exceljs'
import { studentName } from './attendanceUtils'

const HEADER = 8
const FIRST = HEADER + 1

const colors = {
    navy: 'FF172D4D',
    blue: 'FF245CB3',
    ink: 'FF243247',
    muted: 'FF64748B',
    stripe: 'FFF3F6FA',
    line: 'FFD9E2EF',
    white: 'FFFFFFFF',
}

const statuses = [
    ['Present', 'FFDCFCE7', 'FF166534'],
    ['Late', 'FFFEF3C7', 'FF92400E'],
    ['Absent', 'FFFFE4E6', 'FF9F1239'],
    ['Excused', 'FFE0F2FE', 'FF075985'],
    ['Unmarked', 'FFF1F5F9', 'FF64748B'],
]

const fill = (argb) => ({
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb },
})

const label = (status) =>
    statuses.find(
        ([name]) => name.toLowerCase() === status
    )?.[0] || 'Unmarked'

const dateValue = (date) =>
    new Date(`${date}T00:00:00Z`)

const formula = (expression, result) => ({
    formula: expression,
    result,
})

function meetingState(session) {
    if (session.status === 'cancelled') return 'Cancelled'
    if (session.locked_at) return 'Locked'
    if (!session.roster_initialized_at) return 'Not started'
    return 'Open'
}

function setupSheet(
    workbook,
    name,
    title,
    headers,
    widths,
    data
) {
    const sheet = workbook.addWorksheet(name, {
        views: [{
            state: 'frozen',
            xSplit: name === 'Student totals' ? 2 : 0,
            ySplit: HEADER,
            showGridLines: false,
        }],
        pageSetup: {
            orientation: 'landscape',
            paperSize: 9,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            printTitlesRow: `1:${HEADER}`,
        },
        properties: {
            tabColor: { argb: colors.blue },
        },
    })

    sheet.columns = widths.map((width) => ({ width }))

    sheet.getCell('A2').value = title
    sheet.getCell('A2').font = {
        name: 'Arial',
        size: 16,
        bold: true,
        color: { argb: colors.navy },
    }
    sheet.getRow(2).height = 28

    const classLabel =
        data.class_label || `Class ${data.class_id}`

    sheet.getCell('A3').value =
        `${classLabel} — ${data.date || 'All dates (Midterm and Final)'
        }`

    const timeZone = data.time_zone || 'Asia/Manila'
    const generated = new Intl.DateTimeFormat('en-PH', {
        timeZone,
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(data.generated_at))

    const periodLabel = {
        all: 'All periods',
        midterm: 'Midterm',
        final: 'Final',
    }[data.period || 'all']

    sheet.getCell('A3').value =
        `${data.class_label || `Class ${data.class_id}`} — ` +
        `${data.date || 'All dates'} · ${periodLabel}`

    sheet.getCell('A5').value =
        'Counts exclude cancelled meetings. Attendance = ' +
        '(Present + Late) ÷ (Present + Late + Absent).'

    const cancelled = data.sessions.filter(
        (session) => session.status === 'cancelled'
    ).length

    const unstarted = data.sessions.filter(
        (session) => !session.roster_initialized_at
    ).length

    sheet.getCell('A6').value =
        `${data.sessions.length} meetings. ` +
        `${cancelled} cancelled. ` +
        `${unstarted} without a captured roster. ` +
        'Blank rates have no counted meetings.'

    for (let row = 3; row <= 6; row += 1) {
        sheet.getCell(`A${row}`).font = {
            name: 'Arial',
            size: 10,
            color: { argb: colors.muted },
        }
        sheet.getRow(row).height = 20
    }

    sheet.getRow(HEADER).values = headers
    sheet.getRow(HEADER).height = 32

    sheet.getRow(HEADER).eachCell((cell) => {
        cell.font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: { argb: colors.white },
        }

        cell.fill = fill(colors.navy)

        cell.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true,
        }

        cell.border = {
            right: {
                style: 'thin',
                color: { argb: colors.white },
            },
        }
    })

    return sheet
}

function bodyRow(sheet, values) {
    const row = sheet.addRow(
        values.map((value) => value === '' ? null : value)
    )

    row.height = 26

    row.eachCell({ includeEmpty: true }, (cell) => {
        cell.font = {
            name: 'Arial',
            size: 10,
            color: { argb: colors.ink },
        }

        cell.alignment = {
            vertical: 'middle',
            horizontal:
                typeof cell.value === 'number' ? 'right' : 'left',
        }

        if ((row.number - FIRST) % 2) {
            cell.fill = fill(colors.stripe)
        }
    })

    return row
}

export async function createAttendanceWorkbook(data) {

    if (
        !Array.isArray(data.sessions) ||
        !Array.isArray(data.records)
    ) {
        throw new Error('Invalid attendance export response.')
    }

    if (!data.sessions.length) {
        throw new Error('There are no meetings in this range.')
    }

    const sessions = [...data.sessions].sort(
        (a, b) =>
            a.attendance_date.localeCompare(b.attendance_date) ||
            a.session_number - b.session_number
    )

    const sessionMap = new Map(
        sessions.map((session) => [String(session.id), session])
    )

    const students = new Map()

    for (const record of data.records) {
        const id = String(record.student_subject_id)
        const sessionId = String(record.attendance_session_id)

        if (!sessionMap.has(sessionId)) {
            throw new Error('Invalid meeting in export.')
        }

        if (!students.has(id)) {
            students.set(id, {
                ...record,
                marks: new Map(),
                counts: statuses.map(() => 0),
            })
        }

        const student = students.get(id)

        if (student.marks.has(sessionId)) {
            throw new Error('Duplicate attendance record in export.')
        }

        student.marks.set(sessionId, record)

        if (sessionMap.get(sessionId).status !== 'cancelled') {
            const index = statuses.findIndex(
                ([name]) => name === label(record.status)
            )

            student.counts[index] += 1
        }
    }

    const sorted = [...students.values()].sort(
        (a, b) =>
            studentName(a).localeCompare(studentName(b)) ||
            String(a.student_subject_id).localeCompare(
                String(b.student_subject_id)
            )
    )

    if (
        sessions.length + 8 > 16384 ||
        sorted.length + HEADER + 1 > 1048576
    ) {
        throw new Error(
            'This export exceeds Excel limits. Choose a smaller date range.'
        )
    }

    const workbook = new ExcelJS.Workbook()

    workbook.creator = 'Attendance'
    workbook.created = new Date(data.generated_at)
    workbook.calcProperties.fullCalcOnLoad = true

    const summary = setupSheet(
        workbook,
        'Student totals',
        'Attendance summary',
        [
            'Student ID',
            'Student name',
            ...statuses.map(([name]) => name),
            'Counted',
            'Attendance %',
            'Enrollment ID',
        ],
        [20, 40, 11, 11, 11, 11, 12, 12, 17, 20],
        data
    )

    const records = setupSheet(
        workbook,
        'Attendance records',
        'Attendance by meeting',
        [
            'Student ID',
            'Student name',
            ...sessions.map((session) =>
                dateValue(session.attendance_date)
            ),
            'Enrollment ID',
            ...statuses.map(([name]) => name),
        ],
        [
            20,
            40,
            ...sessions.map(() => 20),
            20,
            ...statuses.map(() => 12),
        ],
        data
    )

    // Freeze student ID + name, and all rows above the students.
    records.views = [{
        state: 'frozen',
        xSplit: 2,
        ySplit: HEADER,
        topLeftCell: 'C9',
        activeCell: 'C9',
        showGridLines: false,
    }]

    // Wide exports print across pages without shrinking every date.
    records.pageSetup.fitToPage = false
    records.pageSetup.scale = 85
    records.pageSetup.printTitlesColumn = 'A:B'

    records.getCell('A5').value =
        '— = not in this meeting’s roster. ' +
        'Unmarked = no status recorded. ' +
        'Cell notes contain remarks.'

    records.getRow(1).hidden = true
    records.getRow(7).height = 34
    records.getRow(HEADER).height = 28

    const lastDate = records.getColumn(
        sessions.length + 2
    ).letter

    const identityColumn = sessions.length + 3
    const identityLetter = records.getColumn(identityColumn).letter

    const lastColumn = records.getColumn(
        sessions.length + 8
    ).letter

    // Hidden enrollment identity and calculated status totals.
    for (
        let column = identityColumn;
        column <= sessions.length + 8;
        column += 1
    ) {
        records.getColumn(column).hidden = true
    }

    summary.getColumn(10).hidden = true

    // Meeting information above each date.
    sessions.forEach((session, index) => {
        const column = index + 3
        const cancelled = session.status === 'cancelled'

        const meetingState = cancelled
            ? 'Cancelled'
            : session.locked_at
                ? 'Locked'
                : session.roster_initialized_at
                    ? 'Open'
                    : 'Not started'

        // Separate flag keeps cancelled columns out of calculations.
        records.getRow(1).getCell(column).value =
            cancelled ? 'Cancelled' : 'Included'

        const meta = records.getRow(7).getCell(column)

        meta.value =
            `${session.period === 'final' ? 'Final' : 'Midterm'}` +
            ` · Meeting ${session.session_number}\n${meetingState}`

        meta.font = {
            name: 'Arial',
            size: 10,
            color: { argb: colors.ink },
        }

        meta.fill = fill(
            cancelled ? 'FFE2E8F0' : 'FFE6EEF9'
        )

        meta.alignment = {
            horizontal: 'center',
            vertical: 'middle',
            wrapText: true,
        }

        records.getRow(HEADER).getCell(column).numFmt =
            'mmm d, yyyy'
    })

    // One row per student.
    for (const student of sorted) {
        const attendanceValues = sessions.map((session) => {
            const record = student.marks.get(String(session.id))

            if (record) return label(record.status)

            return session.roster_initialized_at
                ? '—'
                : 'Not started'
        })

        const row = bodyRow(records, [
            String(student.user_id_no ?? ''),
            studentName(student),
            ...attendanceValues,
            String(student.student_subject_id),
            ...student.counts,
        ])

        const r = row.number

        row.getCell(1).numFmt = '@'
        row.getCell(identityColumn).numFmt = '@'

        row.getCell(2).alignment = {
            vertical: 'middle',
            wrapText: true,
        }

        row.height = Math.max(
            28,
            Math.ceil(studentName(student).length / 35) * 15
        )

        sessions.forEach((session, index) => {
            const cell = row.getCell(index + 3)

            cell.alignment = {
                horizontal: 'center',
                vertical: 'middle',
            }

            const remark = student.marks.get(
                String(session.id)
            )?.remarks

            if (remark) {
                cell.note = String(remark)
            }
        })

        // These hidden formulas feed the Student totals sheet.
        statuses.forEach(([name], index) => {
            row.getCell(identityColumn + 1 + index).value =
                formula(
                    `COUNTIFS(C${r}:${lastDate}${r},"${name}",` +
                    `$C$1:$${lastDate}$1,"<>Cancelled")`,
                    student.counts[index]
                )
        })
    }

    const lastStudent = HEADER + sorted.length

    const matrixRange = (column) =>
        `'Attendance records'!$${column}$${FIRST}:` +
        `$${column}$${lastStudent}`

    // Summary matches enrollment IDs, so sorting either sheet is safe.
    for (const student of sorted) {
        const row = bodyRow(summary, [
            String(student.user_id_no ?? ''),
            studentName(student),
            ...student.counts,
            0,
            null,
            String(student.student_subject_id),
        ])

        const r = row.number

        statuses.forEach((_, index) => {
            const countColumn = records.getColumn(
                identityColumn + 1 + index
            ).letter

            row.getCell(index + 3).value = formula(
                `SUMIFS(${matrixRange(countColumn)},` +
                `${matrixRange(identityLetter)},$J${r})`,
                student.counts[index]
            )
        })

        const counted =
            student.counts[0] +
            student.counts[1] +
            student.counts[2]

        row.getCell(8).value = formula(
            `SUM(C${r}:E${r})`,
            counted
        )

        row.getCell(9).value = formula(
            `IF(H${r}=0,"",SUM(C${r}:D${r})/H${r})`,
            counted
                ? (student.counts[0] + student.counts[1]) / counted
                : ''
        )

        row.getCell(1).numFmt = '@'
        row.getCell(10).numFmt = '@'

        row.getCell(2).alignment = {
            vertical: 'middle',
            wrapText: true,
        }

        row.height = Math.max(
            28,
            Math.ceil(studentName(student).length / 35) * 15
        )

        for (let column = 3; column <= 9; column += 1) {
            row.getCell(column).alignment = {
                horizontal: 'right',
                vertical: 'middle',
            }
        }

        row.getCell(9).numFmt = '0%'
        row.getCell(9).font = {
            name: 'Arial',
            size: 10,
            bold: true,
            color: { argb: colors.blue },
        }
    }

    if (sorted.length) {
        const totals = statuses.map((_, index) =>
            sorted.reduce(
                (sum, student) => sum + student.counts[index],
                0
            )
        )

        const counted = totals[0] + totals[1] + totals[2]

        const total = bodyRow(summary, [
            'Total student-meetings',
            null,
            ...totals,
            counted,
            null,
        ])

        const r = total.number

        summary.mergeCells(`A${r}:B${r}`)

        for (let column = 3; column <= 8; column += 1) {
            const letter = summary.getColumn(column).letter

            total.getCell(column).value = formula(
                `SUM(${letter}${FIRST}:${letter}${lastStudent})`,
                column === 8 ? counted : totals[column - 3]
            )
        }

        total.getCell(9).value = formula(
            `IF(H${r}=0,"",SUM(C${r}:D${r})/H${r})`,
            counted ? (totals[0] + totals[1]) / counted : ''
        )

        total.getCell(9).numFmt = '0%'

        total.eachCell((cell, column) => {
            cell.font = {
                name: 'Arial',
                size: 10,
                bold: true,
                color: { argb: colors.navy },
            }

            cell.fill = fill('FFE6EEF9')
            cell.alignment = {
                horizontal: column >= 3 ? 'right' : 'left',
                vertical: 'middle',
            }
        })

        // Include hidden identity/count columns when sorting.
        summary.autoFilter = `A${HEADER}:J${lastStudent}`
        records.autoFilter =
            `A${HEADER}:${lastColumn}${lastStudent}`

        // Color the entire student-by-date attendance area.
        statuses.forEach(([name, background, foreground]) => {
            records.addConditionalFormatting({
                ref: `C${FIRST}:${lastDate}${lastStudent}`,
                rules: [{
                    type: 'expression',
                    formulae: [`C${FIRST}="${name}"`],
                    style: {
                        fill: fill(background),
                        font: {
                            bold: true,
                            color: { argb: foreground },
                        },
                    },
                }],
            })
        })
    } else {
        for (const sheet of [records, summary]) {
            sheet.getCell(`A${FIRST}`).value =
                'No captured students in this range.'
        }
    }

    statuses.forEach(([, , foreground], index) => {
        summary.getRow(HEADER).getCell(index + 3).fill =
            fill(foreground)
    })

    summary.pageSetup.printArea = `A1:I${summary.rowCount}`
    records.pageSetup.printArea =
        `A1:${lastDate}${records.rowCount}`

    return workbook
}

export function downloadAttendanceWorkbook(bytes, data, section) {
    const blob = new Blob([bytes], {
        type:
            'application/vnd.openxmlformats-officedocument.' +
            'spreadsheetml.sheet',
    })

    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')

    anchor.href = url
    anchor.download =
        `${section}-` +
        `${data.date || 'all-dates'}-` +
        `${data.period || 'all'}.xlsx`

    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()

    setTimeout(() => URL.revokeObjectURL(url), 10000)
}