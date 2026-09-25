import XLSX from 'xlsx-js-style'
import { styleGradeSheet } from './gradeExcelStyles'
import {
    CLASS_STANDING_WEIGHT,
    EXAM_WEIGHT,
} from './gradeCalculations'

const { utils } = XLSX

const STATUS_LABELS = {
    passed: 'Passed',
    failed: 'Failed',
    complete: 'Complete',
    incomplete: 'Incomplete',
    invalid: 'Check scores',
    configuration: 'Check settings',
    excluded: 'Excluded (0% weight)',
}

const FORMATS = {
    percentage: '0%',
    points: '0.00',
    score: 'General',
    grade: '0.0',
    text: '@',
}

const GROUP_ROW = 4
const HEADER_ROW = 5

const statusLabel = status =>
    STATUS_LABELS[status] ?? 'Incomplete'

const numeric = value =>
    typeof value === 'number' && Number.isFinite(value)
        ? value
        : null

const percentage = value =>
    numeric(value) === null ? null : value / 100

const points = (value, weight) =>
    numeric(value) === null ? null : (value * weight) / 100

const studentNumber = student =>
    String(student.user_id_no ?? student.student_id ?? '')

const maximum = value =>
    Number.isFinite(Number(value)) && Number(value) > 0
        ? Number(value)
        : null

function localDate(date) {
    const pad = value => String(value).padStart(2, '0')

    return [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate()),
    ].join('-')
}

function textCell(value) {
    // Keep IDs and names as text, including leading zeros.
    return {
        t: 's',
        v: String(value ?? ''),
    }
}

function dataCell(value, format) {
    if (value === null || value === undefined) return null

    if (typeof value !== 'number') {
        return {
            ...textCell(value),
            ...(format ? { z: format } : {}),
        }
    }

    if (!Number.isFinite(value)) return null

    return {
        t: 'n',
        v: value,
        ...(format ? { z: format } : {}),
    }
}

function createSheet({
    title,
    metadata,
    notes,
    groups,
    columns,
    rows,
    maxima,
    footer = [],
}) {
    const groupHeaders = Array(columns.length).fill(null)
    const merges = []
    let start = 0

    for (const group of groups) {
        groupHeaders[start] = textCell(group.label)

        if (group.count > 1) {
            merges.push({
                s: { r: GROUP_ROW, c: start },
                e: {
                    r: GROUP_ROW,
                    c: start + group.count - 1,
                },
            })
        }

        start += group.count
    }

    const values = [
        [textCell(title)],
        [textCell(metadata)],
        [textCell(notes[0] ?? '')],
        [textCell(notes[1] ?? '')],
        groupHeaders,
        columns.map(column => textCell(column.label)),
    ]

    if (maxima) {
        values.push(
            maxima.map((value, index) =>
                dataCell(
                    value,
                    columns[index].format === FORMATS.percentage
                        ? FORMATS.percentage
                        : FORMATS.score
                )
            )
        )

        // Merge the identity columns for "Maximum points".
        merges.push({
            s: { r: 6, c: 0 },
            e: { r: 6, c: 3 },
        })
    }

    const firstDataRow = values.length

    values.push(
        ...rows.map(row =>
            row.map((value, index) =>
                dataCell(value, columns[index].format)
            )
        )
    )

    const footerStart = values.length + 1

    if (footer.length) {
        values.push([])

        footer.forEach((item, index) => {
            values.push([textCell(item.text)])

            merges.push({
                s: { r: footerStart + index, c: 0 },
                e: {
                    r: footerStart + index,
                    c: columns.length - 1,
                },
            })
        })
    }

    for (let row = 0; row < GROUP_ROW; row++) {
        merges.push({
            s: { r: row, c: 0 },
            e: { r: row, c: columns.length - 1 },
        })
    }

    const sheet = utils.aoa_to_sheet(values)
    sheet['!merges'] = merges

    // Enable filtering on Summary only, so the maximum-points
    // row on the period sheets isn't treated as a student.
    if (!maxima) {
        sheet['!autofilter'] = {
            ref: utils.encode_range({
                s: { r: HEADER_ROW, c: 0 },
                e: {
                    r: HEADER_ROW + rows.length,
                    c: columns.length - 1,
                },
            }),
        }
    }

    styleGradeSheet(sheet, utils, {
        columns,
        groups,
        firstDataRow,
        rowCount: rows.length,
        maxima,
        footerStart,
        footer,
    })

    return sheet
}

function identityColumns() {
    return [
        { label: '#', width: 7 },
        {
            label: 'Student ID',
            width: 20,
            kind: 'text',
            format: FORMATS.text,
        },
        {
            label: 'Student',
            width: 38,
            kind: 'text',
            format: FORMATS.text,
        },
    ]
}

function summarySheet(summaries, metadata) {
    const columns = identityColumns()

    for (const label of ['Midterm', 'Final']) {
        columns.push(
            {
                label: `${label} percentage`,
                width: 18,
                kind: 'total',
                format: FORMATS.percentage,
            },
            {
                label: `${label} grade`,
                width: 14,
                kind: 'grade',
                format: FORMATS.grade,
            },
            {
                label: `${label} status`,
                width: 20,
                kind: 'status',
            }
        )
    }

    const rows = summaries.students.map((student, index) => [
        index + 1,
        studentNumber(student),
        student.name,
        ...[student.midterm, student.final].flatMap(term => [
            percentage(term?.rounded_percentage),
            numeric(term?.equivalent),
            statusLabel(term?.status),
        ]),
    ])

    return createSheet({
        title: 'Student Grade Summary',
        metadata,
        notes: [
            `Class Standing ${CLASS_STANDING_WEIGHT}% + Exam ${EXAM_WEIGHT}%. Passed: grade 3.0 or better. Failed: above 3.0.`,
            'Calculated snapshot of all active students. Missing grades stay blank. Re-export after changing scores.',
        ],
        groups: [
            { label: 'Student', count: 3, palette: 0 },
            { label: 'Midterm', count: 3, palette: 1 },
            { label: 'Final', count: 3, palette: 2 },
        ],
        columns,
        rows,
    })
}

function resultNotes(row) {
    const notes = []

    for (const category of row.category_results) {
        if (category.status === 'excluded') continue

        for (const assessment of category.assessments) {
            if (assessment.status !== 'complete') {
                notes.push(
                    `${category.name} / ${assessment.name}: ${statusLabel(assessment.status)}`
                )
            }
        }
    }

    if (row.exam.status !== 'complete') {
        notes.push(`Exam: ${statusLabel(row.exam.status)}`)
    }

    return notes.join('; ')
}

function termSheet(summary, label, metadata) {
    const columns = [
        {
            label: 'Student ID',
            width: 19,
            kind: 'text',
            format: FORMATS.text,
        },
        { label: 'Last name', width: 20, kind: 'text' },
        { label: 'First name', width: 22, kind: 'text' },
        { label: 'Middle name', width: 18, kind: 'text' },
    ]

    const groups = [
        { label: 'Student', count: 1, palette: 0 },
        { label: 'Name of students', count: 3, palette: 0 },
    ]

    // This row appears directly above the student scores.
    const maxima = ['Maximum points', null, null, null]

    const footer = [
        {
            text: 'ASSESSMENT KEY — Numbers restart within each category.',
            heading: true,
        },
    ]

    summary.categories.forEach((category, index) => {
        const name = category.name || `Category ${category.id}`

        columns.push(
            ...category.assessments.map((_, assessmentIndex) => ({
                label: String(assessmentIndex + 1),
                width: 6,
                format: FORMATS.score,
            })),
            {
                label: 'Student total',
                width: 11,
                kind: 'total',
                format: FORMATS.score,
            },
            {
                label: 'Score earned %',
                width: 13,
                kind: 'total',
                format: FORMATS.percentage,
            }
        )

        groups.push({
            label: `${name}\n${numeric(category.weight) ?? '?'}% of class standing`,
            count: category.assessments.length + 2,
            palette: 1 + (index % 4),
        })

        maxima.push(
            // Maximum points for each individual assessment.
            ...category.assessments.map(assessment =>
                maximum(assessment.max_score)
            ),

            // Combined maximum points for this category.
            numeric(category.maximum),

            // Excel stores 100% as 1.
            1
        )

        const assessmentNames = category.assessments
            .map(
                (assessment, assessmentIndex) =>
                    `${assessmentIndex + 1} = ${assessment.name ||
                    `Assessment ${assessment.id}`
                    }`
            )
            .join('  •  ')

        footer.push({
            text: `${name}: ${assessmentNames || 'No assessments yet.'
                }`,
        })
    })

    columns.push(
        {
            label: 'Score',
            width: 11,
            format: FORMATS.score,
        },
        {
            label: `Class standing / ${CLASS_STANDING_WEIGHT}`,
            width: 14,
            kind: 'total',
            format: FORMATS.points,
        },
        {
            label: `Exam / ${EXAM_WEIGHT}`,
            width: 11,
            kind: 'total',
            format: FORMATS.points,
        },
        {
            label: 'Term %',
            width: 10,
            kind: 'total',
            format: FORMATS.percentage,
        },
        {
            label: 'Grade',
            width: 10,
            kind: 'grade',
            format: FORMATS.grade,
        },
        {
            label: 'Status',
            width: 18,
            kind: 'status',
        }
    )

    groups.push(
        {
            label: `${label}\nExam`,
            count: 1,
            palette: 3,
        },
        {
            label: `${label} Result`,
            count: 5,
            palette: 5,
        }
    )

    maxima.push(
        maximum(summary.exam?.max_score),
        CLASS_STANDING_WEIGHT,
        EXAM_WEIGHT,
        1,
        null,
        null
    )

    const rows = summary.rows.map(student => {
        // Match categories by ID, not their names or positions.
        const byCategory = new Map(
            student.category_results.map(category => [
                String(category.id),
                category,
            ])
        )

        const values = [
            studentNumber(student),
            student.last_name ?? '',
            student.first_name ?? '',
            student.middle_name ?? '',
        ]

        for (const category of summary.categories) {
            const result = byCategory.get(String(category.id))

            const byAssessment = new Map(
                (result?.assessments ?? []).map(assessment => [
                    String(assessment.id),
                    assessment,
                ])
            )

            values.push(
                // Individual assessment scores.
                ...category.assessments.map(assessment =>
                    numeric(
                        byAssessment.get(
                            String(assessment.id)
                        )?.score
                    )
                ),

                // Total valid points entered by this student.
                // A real zero remains zero; missing scores stay blank.
                result?.entered > 0
                    ? numeric(result.earned)
                    : null,

                // Uses the category percentage already calculated
                // by gradeCalculations.js.
                // Example: 90 becomes 0.9, displayed as 90%.
                percentage(result?.percentage)
            )
        }

        values.push(
            numeric(student.exam.score),
            points(
                student.class_standing,
                CLASS_STANDING_WEIGHT
            ),
            points(
                student.exam.percentage,
                EXAM_WEIGHT
            ),
            percentage(student.rounded_percentage),
            numeric(student.equivalent),
            statusLabel(student.status)
        )

        return values
    })

    const attention = [
        ...summary.issues,
        ...summary.rows.flatMap(student => {
            const notes = resultNotes(student)

            return notes
                ? [
                    `${studentNumber(student)} — ${student.name
                    }: ${notes}`,
                ]
                : []
        }),
    ]

    if (attention.length) {
        footer.push(
            {
                text: 'NEEDS ATTENTION',
                heading: true,
            },
            ...attention.map(text => ({ text }))
        )
    }

    return createSheet({
        title: `${label} Grade Breakdown`,
        metadata,
        notes: [
            `Class standing (${CLASS_STANDING_WEIGHT} points) + Exam (${EXAM_WEIGHT} points) = term result. Category weights apply within class standing.`,
            'Score earned % = Student total / Maximum points × 100. Student totals include valid entered scores. Missing scores stay blank; category percentages appear when all its scores are valid and entered.',
        ],
        groups,
        columns,
        rows,
        maxima,
        footer,
    })
}

export function createGradeSummaryWorkbook({
    summaries,
    classId,
    generatedAt = new Date(),
}) {
    if (!summaries?.students?.length) {
        throw new Error('There are no active students to export.')
    }

    if (!summaries.midterm || !summaries.final) {
        throw new Error('Both grading periods are required for export.')
    }

    const metadata =
        `Class ${classId}. ` +
        `${summaries.students.length} students. ` +
        `Exported ${generatedAt.toLocaleString()}.`

    const workbook = utils.book_new()

    workbook.Props = {
        Title: `Grade Summary - Class ${classId}`,
        CreatedDate: generatedAt,
    }

    utils.book_append_sheet(
        workbook,
        summarySheet(summaries, metadata),
        'Summary'
    )

    utils.book_append_sheet(
        workbook,
        termSheet(summaries.midterm, 'Midterm', metadata),
        'Midterm'
    )

    utils.book_append_sheet(
        workbook,
        termSheet(summaries.final, 'Final', metadata),
        'Final'
    )

    return workbook
}

export function downloadGradeSummary(options) {
    const generatedAt = options.generatedAt ?? new Date()

    const workbook = createGradeSummaryWorkbook({
        ...options,
        generatedAt,
    })

    const classPart = String(options.classId)
        .replace(/[^a-zA-Z0-9_-]/g, '_')

    XLSX.writeFile(
        workbook,
        `Grade_Summary_Class_${classPart}_${localDate(generatedAt)}.xlsx`,
        {
            bookType: 'xlsx',
            compression: true,
        }
    )
}