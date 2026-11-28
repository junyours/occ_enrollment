// Unit-load checks for the curriculum page. They only warn; nothing is blocked.

const YEAR_NAMES = { 1: "1st Year", 2: "2nd Year", 3: "3rd Year", 4: "4th Year" };
const SEMESTER_NAMES = { 1: "1st semester", 2: "2nd semester", 3: "Summer" };

export const termName = (term) => `${YEAR_NAMES[term.year_level_id] ?? `Year ${term.year_level_id}`} · ${SEMESTER_NAMES[term.semester_id] ?? "Semester"}`;

// A curriculum whose total is below this share of the program's largest one probably isn't fully encoded.
const INCOMPLETE_SHARE = 0.6;

/**
 * @param terms         curriculum terms with their subjects (curriculum_term_subject[].subject)
 * @param limits        unit_limits from the server (program limits, curriculum's required total, defaults)
 * @param programTotals every curriculum year of the program: [{ id, label, units }]
 * @param curriculumId  this curriculum's id
 */
export function unitChecks({ terms = [], limits = null, programTotals = [], curriculumId = null }) {
    const maxSemester = limits?.max_semester_units ?? limits?.default_semester_units ?? 26;
    const maxSummer = limits?.max_summer_units ?? limits?.default_summer_units ?? 9;
    const required = limits?.required_total_units ?? null;

    const ordered = [...terms].sort((a, b) => Number(a.year_level_id) - Number(b.year_level_id) || Number(a.semester_id) - Number(b.semester_id));
    const perTerm = {};
    const issues = [];
    const empty = [];
    let total = 0;

    for (const term of ordered) {
        const subjects = (term.curriculum_term_subject ?? []).filter((entry) => entry.subject);
        const units = subjects.reduce((sum, entry) => sum + (Number(entry.subject.credit_units) || 0), 0);
        const isSummer = Number(term.semester_id) === 3;
        const max = isSummer ? maxSummer : maxSemester;
        total += units;
        perTerm[term.id] = { units, max, isSummer, over: units > max, empty: subjects.length === 0 };
        if (units > max) issues.push({ kind: "over", term, units, max, isSummer });
        if (subjects.length === 0) empty.push(term);
    }

    if (required) {
        if (total < required) issues.push({ kind: "short", total, required });
        else if (total > required) issues.push({ kind: "excess", total, required });
    } else {
        // No required total set: compare with the program's other curriculum years.
        const largest = programTotals
            .filter((c) => Number(c.id) !== Number(curriculumId) && c.units > 0)
            .sort((a, b) => b.units - a.units)[0];
        if (largest && total < largest.units * INCOMPLETE_SHARE) issues.push({ kind: "incomplete", total, compare: largest });
    }

    if (empty.length > 0) issues.push({ kind: "empty", terms: empty });

    return {
        total,
        required,
        maxSemester,
        maxSummer,
        semesterIsDefault: limits?.max_semester_units == null,
        summerIsDefault: limits?.max_summer_units == null,
        perTerm,
        issues,
    };
}
