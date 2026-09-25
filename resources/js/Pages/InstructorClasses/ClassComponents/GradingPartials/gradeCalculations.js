export const CLASS_STANDING_WEIGHT = 70
export const EXAM_WEIGHT = 30

// Round the final percentage once, immediately before applying the grade scale.
export function gradeEquivalent(percentage) {
    const value = numberOrNull(percentage)

    if (value === null || value < 0 || value > 100) return null

    const rounded = Math.round(value + 1e-9)

    if (rounded >= 95) return 1
    if (rounded < 75) return 5

    return (105 - rounded) / 10
}

function numberOrNull(value) {
    if (
        value === null ||
        value === undefined ||
        String(value).trim() === ''
    ) {
        return null
    }

    if (typeof value !== 'number' && typeof value !== 'string') {
        return null
    }

    const number = Number(value)

    return Number.isFinite(number) ? number : null
}

const scoreKey = (itemId, studentSubjectId) =>
    `${itemId}:${studentSubjectId}`

function indexScores(rows, idField) {
    const index = new Map()

    for (const row of rows) {
        const key = scoreKey(row[idField], row.student_subject_id)

        // Do not silently choose one score if duplicate database rows exist.
        index.set(
            key,
            index.has(key)
                ? { duplicate: true }
                : { score: row.score }
        )
    }

    return index
}

function readScore(index, itemId, studentSubjectId, maximum) {
    const record = index.get(scoreKey(itemId, studentSubjectId))

    if (record?.duplicate) {
        return { status: 'invalid', value: null }
    }

    if (
        !record ||
        record.score === null ||
        record.score === undefined ||
        record.score === ''
    ) {
        return { status: 'incomplete', value: null }
    }

    const value = numberOrNull(record.score)

    if (
        value === null ||
        maximum === null ||
        value < 0 ||
        value > maximum
    ) {
        return { status: 'invalid', value: null }
    }

    return { status: 'complete', value }
}

function summarizeCategory(category, studentSubjectId, scoreIndex) {
    const assessments = category.assessments.map(assessment => {
        const maximum = numberOrNull(assessment.max_score)

        const result = readScore(
            scoreIndex,
            assessment.id,
            studentSubjectId,
            maximum
        )

        const record = scoreIndex.get(
            scoreKey(assessment.id, studentSubjectId)
        )

        return {
            id: assessment.id,
            name: assessment.name || `Assessment ${assessment.id}`,
            score: numberOrNull(record?.score),
            maximum,
            status: result.status,
        }
    })

    const enteredAssessments = assessments.filter(
        item => item.status === 'complete'
    )

    const earned = enteredAssessments.reduce(
        (total, item) => total + item.score,
        0
    )

    const entered = enteredAssessments.length

    const invalid = assessments.some(
        item => item.status === 'invalid'
    )

    const complete =
        category.valid &&
        !invalid &&
        entered === category.assessments.length

    const percentage = complete
        ? (earned / category.maximum) * 100
        : null

    return {
        id: category.id,
        name: category.name,
        weight: category.weight,
        assessments,
        earned,
        maximum: category.maximum,
        entered,
        total: category.assessments.length,
        percentage,

        weighted_percentage:
            category.weight === 0
                ? 0
                : percentage !== null && category.weight !== null
                    ? percentage * category.weight / 100
                    : null,

        status:
            category.weight === 0
                ? 'excluded'
                : !category.valid
                    ? 'configuration'
                    : invalid
                        ? 'invalid'
                        : complete
                            ? 'complete'
                            : 'incomplete',
    }
}

export function buildGradeSummary(snapshot, period) {
    const source = snapshot ?? {}

    const categories = (source.categories ?? [])
        .filter(
            category =>
                category.period === period &&
                !category.deleted_at
        )
        .map(category => {
            const assessments = (category.assessments ?? []).filter(
                item => !item.deleted_at
            )

            const maxima = assessments.map(
                item => numberOrNull(item.max_score)
            )

            const valid =
                maxima.length > 0 &&
                maxima.every(value => value !== null && value > 0)

            return {
                ...category,
                weight: numberOrNull(category.weight),
                assessments,
                maximum: valid
                    ? maxima.reduce((sum, value) => sum + value, 0)
                    : null,
                valid,
            }
        })
        .sort(
            (a, b) =>
                Number(a.sort_order) - Number(b.sort_order) ||
                Number(a.id) - Number(b.id)
        )

    const issues = []

    const allocatedWeight = categories.reduce(
        (sum, category) => sum + (category.weight ?? 0),
        0
    )

    if (!categories.length) {
        issues.push('Add grading categories for this period.')
    }

    if (
        categories.some(
            category =>
                category.weight === null ||
                category.weight < 0 ||
                category.weight > 100
        )
    ) {
        issues.push('Each category weight must be between 0% and 100%.')
    }

    if (Math.abs(allocatedWeight - 100) > 1e-9) {
        issues.push(
            `Category weights total ${allocatedWeight}%. They must total 100%.`
        )
    }

    for (const category of categories) {
        if (category.weight > 0 && !category.valid) {
            issues.push(
                `${category.name} needs at least one assessment, with a positive maximum for every assessment.`
            )
        }
    }

    const exams = (source.exams ?? []).filter(
        exam => exam.period === period && !exam.deleted_at
    )

    const exam = exams.length === 1 ? exams[0] : null
    const examMaximum = numberOrNull(exam?.max_score)

    if (!exam) {
        issues.push('Configure exactly one exam for this period.')
    } else if (examMaximum === null || examMaximum <= 0) {
        issues.push('Set the exam maximum above zero.')
    }

    const assessmentIndex = indexScores(
        source.assessment_scores ?? [],
        'assessment_id'
    )

    const examIndex = indexScores(
        source.exam_scores ?? [],
        'exam_id'
    )

    const rows = (source.students ?? [])
        .filter(
            student =>
                student.dropped === null ||
                student.dropped === undefined ||
                Number(student.dropped) === 0
        )
        .map(student => {
            const categoryResults = categories.map(category =>
                summarizeCategory(
                    category,
                    student.student_subject_id,
                    assessmentIndex
                )
            )

            const requiredResults = categoryResults.filter(
                (_, index) => categories[index].weight > 0
            )

            const standingReady =
                categories.length > 0 &&
                Math.abs(allocatedWeight - 100) < 1e-9 &&
                categories.every(
                    category =>
                        category.weight !== null &&
                        category.weight >= 0 &&
                        category.weight <= 100
                ) &&
                requiredResults.every(
                    result => result.status === 'complete'
                )

            const classStanding = standingReady
                ? categoryResults.reduce(
                    (sum, result, index) =>
                        sum +
                        (result.percentage ?? 0) *
                        categories[index].weight / 100,
                    0
                )
                : null

            const examResult =
                exam && examMaximum > 0
                    ? readScore(
                        examIndex,
                        exam.id,
                        student.student_subject_id,
                        examMaximum
                    )
                    : { status: 'configuration', value: null }

            const examPercentage =
                examResult.status === 'complete'
                    ? examResult.value / examMaximum * 100
                    : null

            const invalid =
                requiredResults.some(
                    result => result.status === 'invalid'
                ) ||
                examResult.status === 'invalid'

            const complete =
                issues.length === 0 &&
                classStanding !== null &&
                examPercentage !== null

            const percentage = complete
                ? classStanding * CLASS_STANDING_WEIGHT / 100 +
                examPercentage * EXAM_WEIGHT / 100
                : null

            const equivalent = gradeEquivalent(percentage)

            const missing =
                requiredResults.reduce(
                    (sum, result) => sum + result.total - result.entered,
                    0
                ) +
                (examResult.status === 'incomplete' ? 1 : 0)

            const status = issues.length
                ? 'configuration'
                : invalid
                    ? 'invalid'
                    : getGradeStatus(equivalent)

            return {
                ...student,

                name: [
                    student.last_name,
                    [student.first_name, student.middle_name]
                        .filter(Boolean)
                        .join(' '),
                ]
                    .filter(Boolean)
                    .join(', ') || `Student ${student.student_id}`,

                category_results: categoryResults,
                class_standing: classStanding,

                exam: {
                    score: examResult.value,
                    maximum: examMaximum,
                    percentage: examPercentage,
                    status: examResult.status,
                },

                percentage,

                rounded_percentage:
                    percentage === null
                        ? null
                        : Math.round(percentage + 1e-9),

                equivalent,
                missing,
                status,
            }
        })

    const completed = rows.filter(row => row.equivalent !== null)

    return {
        categories,
        exam,
        issues,
        rows,

        totals: {
            students: rows.length,

            passed: rows.filter(
                row => row.status === 'passed'
            ).length,

            failed: rows.filter(
                row => row.status === 'failed'
            ).length,

            pending: rows.filter(
                row => !['passed', 'failed'].includes(row.status)
            ).length,

            average: completed.length
                ? completed.reduce(
                    (sum, row) => sum + row.percentage,
                    0
                ) / completed.length
                : null,
        },
    }
}

export function getGradeStatus(equivalent) {
    const value = numberOrNull(equivalent)

    if (value === null || value < 1 || value > 5) {
        return 'incomplete'
    }

    return value > 3 ? 'failed' : 'passed'
}

export function matchesGradeStatus(student, filter) {
    if (filter === 'all') return true

    const target = filter === 'pending'
        ? 'incomplete'
        : filter

    return [student.midterm, student.final].some(
        term => getGradeStatus(term?.equivalent) === target
    )
}