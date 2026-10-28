export const isEnabled = (value) => value === true || value === 1 || value === '1';

const isValidDate = (value) => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

const localDate = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export function getEnrollmentStatus(schoolYear, today) {
    if (!today && schoolYear.enrollment_status) {
        const status = schoolYear.enrollment_status.toLowerCase();
        if (['open', 'paused', 'scheduled', 'closed'].includes(status)) return status[0].toUpperCase() + status.slice(1);
    }
    const date = today || schoolYear.status_date || localDate();
    const start = schoolYear.start_date?.slice(0, 10);
    const end = schoolYear.end_date?.slice(0, 10);
    if (!isValidDate(start) || !isValidDate(end) || start > end) return 'Closed';
    if (date < start) return 'Scheduled';
    if (date > end) return 'Closed';
    return isEnabled(schoolYear.allow_enrollment) ? 'Open' : 'Paused';
}

export const getEnrollmentStatusClass = (status) => ({
    Open: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    Scheduled: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
    Paused: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300',
    Closed: 'border-border bg-muted text-muted-foreground',
}[status] || 'border-border bg-muted text-muted-foreground');

export function getNextSchoolYear(schoolYears) {
    const latest = [...schoolYears].sort((a, b) => Number(b.start_year) - Number(a.start_year) || Number(b.end_year) - Number(a.end_year) || Number(b.semester_id) - Number(a.semester_id))[0];
    const nextAcademicYear = latest && Number(latest.semester_id) === 3;
    const startYear = latest ? Number(nextAcademicYear ? latest.end_year : latest.start_year) : new Date().getFullYear();
    return {
        start_year: String(startYear),
        end_year: String(latest && !nextAcademicYear ? latest.end_year : startYear + 1),
        semester_id: latest && !nextAcademicYear ? Number(latest.semester_id) + 1 : 1,
        start_date: '', end_date: '',
    };
}

export function validateSchoolYear(form, schoolYears) {
    const errors = {};
    if (!/^[1-9]\d{3}$/.test(String(form.start_year))) errors.start_year = 'Enter a valid four-digit starting year.';
    if (!/^[1-9]\d{3}$/.test(String(form.end_year))) errors.end_year = 'Enter a valid four-digit ending year.';
    else if (Number(form.end_year) <= Number(form.start_year)) errors.end_year = 'Ending year must be after starting year.';
    if (![1, 2, 3].includes(Number(form.semester_id))) errors.semester_id = 'Choose a semester.';
    if (!form.start_date) errors.start_date = 'Choose when enrollment starts.';
    else if (!isValidDate(form.start_date)) errors.start_date = 'Enter a valid enrollment starting date.';
    if (!form.end_date) errors.end_date = 'Choose when enrollment ends.';
    else if (!isValidDate(form.end_date)) errors.end_date = 'Enter a valid enrollment ending date.';
    else if (form.start_date && form.end_date < form.start_date) errors.end_date = 'Enrollment must end on or after the starting date.';
    if (schoolYears.some((year) => String(year.id) !== String(form.id) && Number(year.start_year) === Number(form.start_year) && Number(year.end_year) === Number(form.end_year) && Number(year.semester_id) === Number(form.semester_id))) errors.semester_id = 'This semester already exists for the selected academic year.';
    return errors;
}

