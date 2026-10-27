import { createTorLastPageDefaults } from './torNoteTemplates';
import { DEFAULT_TOR_PHOTO_FRAMING, getTorPhotoFraming, photoFramingOptions } from './torPhotoFraming';

const STUDENT_OPTION_DEFAULTS = {
    citizenship: '',
    spouse: '',
    dateAdmission: '',
    admissionCredentials: '',
    major: '',
    dateGraduation: '',
    photoUrl: '',
    ...DEFAULT_TOR_PHOTO_FRAMING,
    additionalRemarks: '',
    ...createTorLastPageDefaults(),
};

const PREFERENCE_FIELD_LIMITS = {
    purpose: 160,
    formRevision: 80,
    preparedBy: 120,
    preparedByTitle: 120,
    checkedBy: 120,
    checkedByTitle: 120,
    certifiedBy: 120,
    certifiedByTitle: 120,
};

const STUDENT_FIELD_LIMITS = {
    citizenship: 120,
    spouse: 120,
    dateAdmission: 120,
    admissionCredentials: 120,
    major: 120,
    dateGraduation: 10,
    additionalRemarks: 500,
    photoUrl: 500000,
    photoZoom: 32,
    photoPositionX: 32,
    photoPositionY: 32,
    lastPageNotesEnabled: 5,
    nstpComponent: 120,
    nstpSerialNumber: 120,
    nstpNote: 1000,
    completionNote: 1500,
    chedNote: 500,
    otherLastPageNotes: 1500,
};

function todayInManila() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Manila',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
}

export function createTorOptions(user) {
    const preparedBy = [user?.first_name, user?.middle_name, user?.last_name]
        .filter(Boolean)
        .join(' ')
        .toUpperCase();

    return {
        purpose: 'For employment purposes',
        dateIssued: todayInManila(),
        formRevision: '',
        preparedBy,
        preparedByTitle: 'Staff',
        checkedBy: '',
        checkedByTitle: 'Staff',
        certifiedBy: 'BERNADETH T. NACUA, LPT',
        certifiedByTitle: 'Registrar I',
        ...STUDENT_OPTION_DEFAULTS,
    };
}

export function resetTorStudentOptions(options) {
    return { ...options, ...STUDENT_OPTION_DEFAULTS };
}

function stableId(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? String(value) : null;
    if (typeof value === 'string') return value.trim() || null;
    return null;
}

export function getTorStorageKeys(user, studentId) {
    const userId = stableId(user?.id);
    const student = stableId(studentId);
    if (userId === null) return { preferences: null, student: null };
    const prefix = `occ:tor:v1:user:${encodeURIComponent(userId)}`;
    return {
        preferences: `${prefix}:preferences`,
        student: student === null ? null : `${prefix}:student:${encodeURIComponent(student)}`,
    };
}

function availableStorage(storage) {
    if (storage !== undefined) return storage;
    try {
        return typeof window === 'undefined' ? null : window.localStorage;
    } catch {
        return null;
    }
}

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validGraduationDate(value) {
    if (value === '') return true;
    const parts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!parts) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(date.getTime()) &&
        date.getUTCFullYear() === Number(parts[1]) &&
        date.getUTCMonth() + 1 === Number(parts[2]) &&
        date.getUTCDate() === Number(parts[3]);
}

function validPhoto(value) {
    if (value === '') return true;
    return /^data:image\/(?:png|jpeg|webp);base64,(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/i.test(value) &&
        value.slice(value.indexOf(',') + 1).length > 0;
}

function permittedValues(values, limits) {
    if (!isRecord(values)) return {};
    const permitted = {};
    for (const [field, limit] of Object.entries(limits)) {
        const value = values[field];
        if (typeof value !== 'string' || value.length > limit) continue;
        if (Object.prototype.hasOwnProperty.call(DEFAULT_TOR_PHOTO_FRAMING, field)) {
            if (!value.trim() || !Number.isFinite(Number(value))) continue;
            permitted[field] = photoFramingOptions(getTorPhotoFraming(values))[field];
            continue;
        }
        if (field === 'dateGraduation' && !validGraduationDate(value)) continue;
        if (field === 'photoUrl' && !validPhoto(value)) continue;
        if (field === 'lastPageNotesEnabled' && value !== 'true' && value !== 'false') continue;
        permitted[field] = value;
    }
    return permitted;
}

function readValues(storage, key, limits) {
    if (!storage || !key) return {};
    try {
        const serialized = storage.getItem(key);
        if (typeof serialized !== 'string') return {};
        const envelope = JSON.parse(serialized);
        if (!isRecord(envelope) || envelope.version !== 1 || !isRecord(envelope.values)) return {};
        return permittedValues(envelope.values, limits);
    } catch {
        return {};
    }
}

function writeValues(storage, key, values) {
    if (!storage || !key) return false;
    try {
        storage.setItem(key, JSON.stringify({ version: 1, values }));
        return true;
    } catch {
        return false;
    }
}

export function loadTorPreferences(user, storage) {
    const defaults = createTorOptions(user);
    const { preferences } = getTorStorageKeys(user);
    if (!preferences) return defaults;
    return { ...defaults, ...readValues(availableStorage(storage), preferences, PREFERENCE_FIELD_LIMITS) };
}

export function loadTorStudentOptions(user, studentId, currentOptions, storage) {
    const reset = resetTorStudentOptions(isRecord(currentOptions) ? currentOptions : createTorOptions(user));
    const { student } = getTorStorageKeys(user, studentId);
    if (!student) return reset;
    return { ...reset, ...readValues(availableStorage(storage), student, STUDENT_FIELD_LIMITS) };
}

export function saveTorOptions(user, studentId, options, storage) {
    const { preferences, student } = getTorStorageKeys(user, studentId);
    if (!preferences) return false;
    const target = availableStorage(storage);
    if (!target) return false;
    const savedPreferences = writeValues(target, preferences, permittedValues(options, PREFERENCE_FIELD_LIMITS));
    const savedStudent = student ? writeValues(target, student, permittedValues(options, STUDENT_FIELD_LIMITS)) : true;
    return savedPreferences && savedStudent;
}
