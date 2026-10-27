const DEFAULT_WIDTH = 350;
export const MIN_SETTINGS_WIDTH = 280;
export const MAX_SETTINGS_WIDTH = 480;

const defaults = () => ({ settingsOpen: true, settingsWidth: DEFAULT_WIDTH });
function keyFor(user) {
    const id = user?.id;
    return (typeof id === 'number' && Number.isFinite(id)) || (typeof id === 'string' && id.trim())
        ? `occ:records:workspace:v1:user:${encodeURIComponent(String(id))}` : null;
}
function storageFor(storage) {
    if (storage !== undefined) return storage;
    try { return typeof window === 'undefined' ? null : window.localStorage; }
    catch { return null; }
}
function normalize(values) {
    const result = defaults();
    if (typeof values?.settingsOpen === 'boolean') result.settingsOpen = values.settingsOpen;
    if (Number.isFinite(values?.settingsWidth)) {
        result.settingsWidth = Math.round(Math.min(MAX_SETTINGS_WIDTH, Math.max(MIN_SETTINGS_WIDTH, values.settingsWidth)));
    }
    return result;
}
export function loadRecordWorkspacePreferences(user, storage) {
    const key = keyFor(user), target = storageFor(storage);
    if (!key || !target) return defaults();
    try {
        const saved = JSON.parse(target.getItem(key));
        return saved?.version === 1 ? normalize(saved.values) : defaults();
    } catch { return defaults(); }
}
export function saveRecordWorkspacePreferences(user, values, storage) {
    const key = keyFor(user), target = storageFor(storage);
    if (!key || !target) return false;
    try { target.setItem(key, JSON.stringify({ version: 1, values: normalize(values) })); return true; }
    catch { return false; }
}