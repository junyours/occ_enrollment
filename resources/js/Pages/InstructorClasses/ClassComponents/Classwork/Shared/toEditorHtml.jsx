import DOMPurify from 'dompurify'

export const richTextClassName = [
    'text-sm leading-6 break-words',
    '[&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:whitespace-pre-wrap',
    '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
    '[&_li]:my-1 [&_li>p]:mb-0',
    '[&_strong]:font-semibold [&_b]:font-semibold',
    '[&_em]:italic [&_i]:italic [&_u]:underline',
].join(' ')

export function sanitizeRichHtml(value) {
    if (!DOMPurify.isSupported) return ''

    return DOMPurify.sanitize(String(value ?? ''), {
        ALLOWED_TAGS: [
            'p',
            'br',
            'strong',
            'b',
            'em',
            'i',
            'u',
            'ul',
            'li',
        ],
        ALLOWED_ATTR: [],
        ALLOW_DATA_ATTR: false,
        ALLOW_ARIA_ATTR: false,
    })
}

export function toEditorHtml(value, format = 'text') {
    if (format === 'html') {
        return sanitizeRichHtml(value)
    }

    if (!value) return ''

    // Existing plain text must remain literal text.
    const escaped = String(value).replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[character])

    return `<p>${escaped.replace(/\r\n?|\n/g, '<br>')}</p>`
}