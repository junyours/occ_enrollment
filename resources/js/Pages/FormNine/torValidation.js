import { createTorLastPageDefaults, getTorLastPageBlocks } from './torNoteTemplates';
import { isDroppedGrade } from './recordGrades';

const EMPTY_VALUE = /^(?:none|null|undefined|unknown|n\s*[/.]\s*a(?:\s*\.)?|[_\s]+)$/i;
const SIGNATORIES = [
    ['preparedBy', 'Prepared by name'], ['preparedByTitle', 'Prepared by position'],
    ['checkedBy', 'Checked by name'], ['checkedByTitle', 'Checked by position'],
    ['certifiedBy', 'Certified correct name'], ['certifiedByTitle', 'Certified correct position'],
];
const NOTE_FIELDS = {
    nstp: ['nstpNote', 'NSTP note'], completion: ['completionNote', 'Completion statement'],
    ched: ['chedNote', 'CHED special order'], other: ['otherLastPageNotes', 'Other last-page notes'],
};

function text(value) {
    return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ')
        : typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}

function missing(value) {
    const normalized = text(value);
    return normalized === '' || EMPTY_VALUE.test(normalized);
}

function validDate(value) {
    const normalized = text(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized) || Number(normalized.slice(0, 4)) === 0) return false;
    const date = new Date(`${normalized}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === normalized;
}

/** Checks recorded fields only; printing policy remains with the calling workspace. */
export function validateTorForPrint(data, options = {}) {
    const values = options && typeof options === 'object' ? options : {};
    const info = data?.info || {};
    const information = info.information || {};
    const education = info.preliminary_education || {};
    const records = Array.isArray(data?.enrollmentRecord) ? data.enrollmentRecord : [];
    const program = records[records.length - 1]?.program;
    const errors = [];
    const warnings = [];
    const add = (list, id, label, area, field, context = {}) => list.push({ id, label, area, ...(field ? { field } : {}), ...context });

    for (const [field, label, value] of [
        ['first_name', 'Student first name', information.first_name],
        ['last_name', 'Student last name', information.last_name],
        ['user_id_no', 'Student ID', info.user_id_no],
    ]) {
        if (missing(value)) add(errors, `student-${field}`, `${label} is missing.`, 'student', field);
    }
    if (missing(program)) add(errors, 'records-program', 'The latest academic record is missing its program.', 'records', 'program');

    let subjectCount = 0;
    records.forEach((record, recordIndex) => {
        const subjects = Array.isArray(record?.subjects) ? record.subjects : [];
        subjects.forEach((subject, subjectIndex) => {
            const context = { recordIndex, subjectIndex };
            const prefix = `record-${recordIndex}-subject-${subjectIndex}`;
            if (!subject || typeof subject !== 'object' || Array.isArray(subject)) {
                add(errors, `${prefix}-row`, `Subject ${subjectIndex + 1} (record ${recordIndex + 1}): the academic subject row is missing or malformed.`, 'records', undefined, context);
                return;
            }
            if (['subject_code', 'descriptive_title', 'grade', 'credit_units'].some(field => !missing(subject[field]))) subjectCount += 1;
            const subjectLabel = missing(subject.subject_code) ? `Subject ${subjectIndex + 1}` : text(subject.subject_code);
            const location = `${subjectLabel} (record ${recordIndex + 1})`;
            for (const [field, label] of [['subject_code', 'Subject code'], ['descriptive_title', 'Subject title']]) {
                if (missing(subject[field])) add(errors, `${prefix}-${field}`, `${location}: ${label.toLowerCase()} is missing.`, 'records', field, context);
            }
            const grade = text(subject.grade);
            const numericGrade = Number(grade);
            const dropped = isDroppedGrade(subject.grade);
            if (missing(subject.grade)) {
                add(errors, `${prefix}-grade`, `${location}: grade is missing.`, 'records', 'grade', context);
            } else if ((Number.isFinite(numericGrade) && numericGrade < 0) || /^[+-]?(?:infinity|nan)$/i.test(grade)) {
                add(errors, `${prefix}-grade`, `${location}: grade is invalid.`, 'records', 'grade', context);
            } else if (dropped || !Number.isFinite(numericGrade)) {
                add(warnings, `${prefix}-grade-status`, `${location}: review the recorded grade/status “${dropped ? 'Dropped' : grade}”.`, 'records', 'grade', context);
            }
            const credits = text(subject.credit_units);
            if (missing(subject.credit_units)) {
                if (!dropped) add(errors, `${prefix}-credit_units`, `${location}: credits are missing.`, 'records', 'credit_units', context);
            } else if (!Number.isFinite(Number(credits)) || Number(credits) < 0) {
                add(errors, `${prefix}-credit_units`, `${location}: credits must be zero or a positive number.`, 'records', 'credit_units', context);
            }
        });
    });
    if (subjectCount === 0) add(errors, 'records-empty', 'Add at least one academic subject.', 'records');

    SIGNATORIES.forEach(([field, label]) => {
        if (missing(values[field])) add(errors, `signatories-${field}`, `${label} is missing.`, 'signatories', field);
    });
    if (missing(values.purpose)) add(errors, 'issuance-purpose', 'The purpose of issuance is missing.', 'issuance', 'purpose');
    if (!validDate(values.dateIssued)) add(errors, 'issuance-dateIssued', 'Enter a valid date issued.', 'issuance', 'dateIssued');

    for (const [field, label, value] of [
        ['birthday', 'Date of birth', information.birthday],
        ['place_of_birth', 'Place of birth', information.place_of_birth],
        ['gender', 'Sex', information.gender],
        ['address', 'Home address', information.address],
        ['citizenship', 'Citizenship', values.citizenship || information.nationality],
        ['admissionCredentials', 'Admission credentials', values.admissionCredentials],
    ]) {
        if (missing(value)) add(warnings, `student-${field}`, `${label} is missing; review the student details.`, 'student', field);
    }
    if (!missing(information.birthday) && !validDate(text(information.birthday).split('T')[0])) {
        add(warnings, 'student-birthday', 'Review the date of birth; the recorded date is invalid.', 'student', 'birthday');
    }
    for (const [level, label] of [['elementary', 'Elementary'], ['secondary', 'Secondary']]) {
        const fields = [`${level}_name`, `${level}_address`, `${level}_year`];
        const absent = fields.filter(field => missing(education[field]));
        if (absent.length) add(warnings, `student-education-${level}`, `${label} preliminary education is incomplete; review the school, address, and school year.`, 'student', absent[0]);
    }
    if (missing(values.formRevision)) add(warnings, 'issuance-formRevision', 'Form revision is missing; confirm the applicable revision.', 'issuance', 'formRevision');
    if (!missing(values.dateGraduation) && !validDate(values.dateGraduation)) {
        add(warnings, 'student-dateGraduation', 'Review the graduation date; the entered date is invalid.', 'student', 'dateGraduation');
    }

    const noteValues = { ...createTorLastPageDefaults(), ...values };
    const missingTokens = {
        degree: missing(program), graduationDate: !validDate(noteValues.dateGraduation),
        nstpComponent: missing(noteValues.nstpComponent), nstpSerialNumber: missing(noteValues.nstpSerialNumber),
    };
    getTorLastPageBlocks(data, noteValues).forEach(({ kind, text: rendered }) => {
        const [field, label] = NOTE_FIELDS[kind];
        const template = typeof noteValues[field] === 'string' ? noteValues[field] : '';
        const absentToken = Object.entries(missingTokens).some(([token, absent]) => absent && template.includes(`{${token}}`));
        if (missing(rendered) || /\{[^{}\r\n]+\}|_{2,}/.test(rendered) || absentToken) {
            add(warnings, `notes-${field}`, `${label} contains blanks or unresolved placeholders; complete or omit this note.`, 'notes', field);
        }
    });

    return { errors, warnings };
}
