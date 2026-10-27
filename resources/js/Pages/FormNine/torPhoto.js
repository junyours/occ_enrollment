export function validateTorPhoto(file) {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file?.type)) {
        throw new Error('Choose a PNG, JPEG, or WebP student photo.');
    }
    if (file.size > 10 * 1024 * 1024) {
        throw new Error('Choose a student photo smaller than 10 MB.');
    }
}

// Prepare a compact JPEG for the preview and the private Drive upload.
export async function createTorPhoto(file) {
    validateTorPhoto(file);
    const objectUrl = URL.createObjectURL(file);
    try {
        const image = new Image();
        image.src = objectUrl;
        await image.decode();
        const scale = Math.min(1, 480 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Could not prepare the student photo.');
        context.fillStyle = '#fff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

export function torPhotoFile(dataUrl) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/i.exec(dataUrl);
    if (!match) throw new Error('Could not prepare the student photo for upload.');
    const bytes = Uint8Array.from(atob(match[2]), character => character.charCodeAt(0));
    const mime = match[1].toLowerCase();
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[mime];
    return new File([bytes], 'tor-photo.' + extension, { type: mime });
}
