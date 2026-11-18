// Where a class in the student's list opens: its classwork page. NSTP
// classes have no classwork, and dropped classes can't be opened.
export function classLink(classInfo) {
    if (
        classInfo.type === 'nstp'
        || !classInfo.hashed_year_section_subject_id
        || Number(classInfo.dropped) === 1
    ) {
        return null
    }

    return `/classes/classroom/${classInfo.hashed_year_section_subject_id}`
}

export function isDropped(classInfo) {
    return Number(classInfo.dropped) === 1
}
