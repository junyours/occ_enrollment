export const DEFAULT_TOR_PHOTO_FRAMING = Object.freeze({
    photoZoom: '1',
    photoPositionX: '50',
    photoPositionY: '50',
});

function normalizedNumber(value, minimum, maximum, fallback) {
    const number = typeof value === 'number' ? value
        : typeof value === 'string' && value.trim() ? Number(value) : NaN;
    if (!Number.isFinite(number)) return fallback;
    return Math.round(Math.min(maximum, Math.max(minimum, number)) * 1000) / 1000;
}

export function getTorPhotoFraming(options) {
    return {
        zoom: normalizedNumber(options?.photoZoom, 1, 3, 1),
        x: normalizedNumber(options?.photoPositionX, 0, 100, 50),
        y: normalizedNumber(options?.photoPositionY, 0, 100, 50),
    };
}

export function photoFramingOptions(framing) {
    const normalized = getTorPhotoFraming({
        photoZoom: framing?.zoom,
        photoPositionX: framing?.x,
        photoPositionY: framing?.y,
    });
    return {
        photoZoom: String(normalized.zoom),
        photoPositionX: String(normalized.x),
        photoPositionY: String(normalized.y),
    };
}