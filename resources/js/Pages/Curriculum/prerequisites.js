// Shared prerequisite helpers for the curriculum page.

const ORDINAL = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };

export const yearStandingLabel = (yearLevelId) => (yearLevelId ? `${ORDINAL[yearLevelId] ?? yearLevelId} Year Standing` : "");

// Earlier = earlier year, or same year and earlier semester (Summer comes after Second).
// Mirrors CurriculumController::setPrerequisites.
export const isEarlierTerm = (candidate, current) => {
    const cy = Number(candidate.year_level_id), cs = Number(candidate.semester_id);
    const y = Number(current.year_level_id), s = Number(current.semester_id);
    return cy < y || (cy === y && cs < s);
};

export const linkedPrerequisites = (entry) => (entry?.pre_requisite_subjects ?? []).filter((p) => p.required_entry?.subject);

export const hasPrerequisites = (entry) => linkedPrerequisites(entry).length > 0 || Boolean(Number(entry?.required_year_level_id));

// Reverse lookup: curriculum entry id -> later entries that require it, in curriculum order.
export const dependentsByEntryId = (allTerms) => {
    const map = {};
    allTerms.forEach((term) => (term.curriculum_term_subject ?? []).forEach((entry) => {
        linkedPrerequisites(entry).forEach((p) => {
            (map[Number(p.required_term_subject_id)] ??= []).push(entry);
        });
    }));
    return map;
};

// A term's subjects can only have prerequisites if an earlier term has subjects
// (in practice: everything except First Year, First Semester).
export const termCanHavePrerequisites = (term, allTerms) =>
    allTerms.some((t) => isEarlierTerm(t, term) && (t.curriculum_term_subject ?? []).some((s) => s.subject));
