// Score boxes accept digits and one dot while typing, so a decimal can be
// pointed out instead of silently losing its dot.
export const TYPABLE_SCORE = /^\d*(?:\.\d*)?$/

/**
 * Why a typed score can't be saved, or '' when it can. Scores are whole
 * numbers from 0 to the maximum; an empty box means "not graded".
 */
export function scoreProblem(text, maximum) {
    const value = String(text ?? '').trim()

    if (value === '') return ''
    if (!/^\d+$/.test(value)) return 'Whole numbers only'
    if (Number(maximum) > 0 && Number(value) > Number(maximum)) return `Over ${maximum}`

    return ''
}

/** The score to save for valid text: a number, or null for an empty box. */
export function scoreValue(text) {
    const value = String(text ?? '').trim()
    return value === '' ? null : Number(value)
}
