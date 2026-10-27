const NSRC_NOTE = 'NOTE: NATIONAL SERVICE TRAINING PROGRAM (NSTP) under {nstpComponent} component with National Service Reserve Corps (NSRC) Serial Number {nstpSerialNumber}.';
const GENERIC_NSTP_NOTE = 'NOTE: NATIONAL SERVICE TRAINING PROGRAM (NSTP) under {nstpComponent} component. Serial Number {nstpSerialNumber}.';

export function getNstpNoteTemplate(component) {
    return component === 'CWTS' || component === 'LTS' ? NSRC_NOTE : GENERIC_NSTP_NOTE;
}

export function createTorLastPageDefaults() {
    return {
        lastPageNotesEnabled: 'true',
        nstpComponent: 'CWTS',
        nstpSerialNumber: '',
        nstpNote: NSRC_NOTE,
        completionNote: 'COMPLETED all the requirements leading to the degree {degree} on {graduationDate}, as confirmed by OCC Board of Trustees Resolution No. __________ dated __________.',
        chedNote: 'CHED Special Order Number: on process',
        otherLastPageNotes: '',
    };
}

function nonblank(value) {
    return typeof value === 'string' && value.trim() ? value : '';
}

function graduationDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return '__________';
    const date = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return '__________';
    return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

export function getTorLastPageBlocks(data, options = {}) {
    const values = { ...createTorLastPageDefaults(), ...options };
    if (values.lastPageNotesEnabled !== 'true') return [];
    const records = Array.isArray(data?.enrollmentRecord) ? data.enrollmentRecord : [];
    const replacements = {
        degree: nonblank(records[records.length - 1]?.program) || '__________',
        graduationDate: graduationDate(values.dateGraduation),
        nstpComponent: nonblank(values.nstpComponent) || '__________',
        nstpSerialNumber: nonblank(values.nstpSerialNumber) || '__________',
    };
    return [
        { kind: 'nstp', template: values.nstpNote },
        { kind: 'completion', template: values.completionNote },
        { kind: 'ched', template: values.chedNote },
        { kind: 'other', template: values.otherLastPageNotes },
    ].filter(({ template }) => nonblank(template)).map(({ kind, template }) => ({
        kind,
        text: template.replace(/\{(degree|graduationDate|nstpComponent|nstpSerialNumber)\}/g, (_, token) => replacements[token]),
    }));
}
