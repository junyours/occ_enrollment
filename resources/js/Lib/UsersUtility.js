export const userRoles = ({ exclude = [], include = null } = {}) => {
    const roles = [
        { value: 'announcement_admin', label: 'Announcement Admin' },
        { value: 'evaluator', label: 'Evaluator' },
        { value: 'faculty', label: 'Faculty' },
        { value: 'librarian', label: 'Librarian' },
        { value: 'guidance', label: 'Guidance' },
        { value: 'gened_coordinator', label: 'Gened Coordinator' },
        { value: 'mis', label: 'MIS' },
        { value: 'nstp_director', label: 'NSTP Director' },
        { value: 'ojt_coordinator', label: 'Ojt Coordinator' },
        { value: 'president', label: 'President' },
        { value: 'program_head', label: 'Program Head' },
        { value: 'registrar', label: 'Registrar' },
        { value: 'research_coordinator', label: 'Research Coordinator' },
        { value: 'super_admin', label: 'Super Admin' },
        { value: 'student', label: 'Student' },
        { value: 'vpaa', label: 'Vpaa' },
    ];

    if (include) {
        return roles.filter(role => include.includes(role.value));
    }

    return roles.filter(role => !exclude.includes(role.value));
};