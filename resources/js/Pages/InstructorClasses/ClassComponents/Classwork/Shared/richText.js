import DOMPurify from 'dompurify'

export const richTextClassName = [
    'text-sm leading-6 break-words',
    '[&_p]:mb-2 [&_p:last-child]:mb-0 [&_p]:whitespace-pre-wrap',
    '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6',
    '[&_li]:my-1 [&_li>p]:mb-0',
    '[&_strong]:font-semibold [&_b]:font-semibold',
    '[&_em]:italic [&_i]:italic [&_u]:underline',
    '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a]:break-all',
].join(' ')

export function normalizeLink(value) {
    const input = String(value ?? '').trim()

    if (
        !input
        || /[\u0000-\u0020\u007f]/.test(input)
    ) {
        return null
    }

    const address = /^[a-z][a-z\d+.-]*:/i.test(input)
        ? input
        : input.startsWith('//')
            ? `https:${input}`
            : `https://${input}`

    try {
        const url = new URL(address)

        if (url.protocol === 'mailto:') {
            return url.pathname.includes('@')
                ? url.href
                : null
        }

        if (
            !['https:', 'http:'].includes(url.protocol)
            || !url.hostname
            || url.username
            || url.password
        ) {
            return null
        }

        return url.href
    } catch {
        return null
    }
}

export function sanitizeRichHtml(value) {
    if (!DOMPurify.isSupported) {
        return ''
    }

    const fragment = DOMPurify.sanitize(
        String(value ?? ''),
        {
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
                'a',
            ],

            ALLOWED_ATTR: [
                'href',
                'target',
                'rel',
            ],

            ALLOWED_URI_REGEXP: /^(?:https?:\/\/|mailto:)/i,
            ALLOW_DATA_ATTR: false,
            ALLOW_ARIA_ATTR: false,
            RETURN_DOM_FRAGMENT: true,
        }
    )

    fragment.querySelectorAll('a').forEach((anchor) => {
        const href = normalizeLink(
            anchor.getAttribute('href')
        )

        if (!href) {
            anchor.replaceWith(...anchor.childNodes)
            return
        }

        anchor.setAttribute('href', href)
        anchor.setAttribute('target', '_blank')
        anchor.setAttribute('rel', 'noopener noreferrer')
    })

    const container = document.createElement('div')
    container.append(fragment)

    return container.innerHTML
}

export function toEditorHtml(value, format = 'text') {
    if (format === 'html') {
        return sanitizeRichHtml(value)
    }

    if (!value) {
        return ''
    }

    const escaped = String(value).replace(
        /[&<>"']/g,
        (character) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
        })[character]
    )

    return `<p>${escaped.replace(/\r\n?|\n/g, '<br>')}</p>`
}