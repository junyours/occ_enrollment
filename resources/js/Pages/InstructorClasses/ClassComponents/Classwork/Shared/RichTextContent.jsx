import React, { useMemo } from 'react'

import {
    richTextClassName,
    sanitizeRichHtml,
} from './richText'

export default function RichTextContent({
    value,
    format = 'text',
}) {
    const html = useMemo(
        () => (
            format === 'html'
                ? sanitizeRichHtml(value)
                : ''
        ),
        [value, format]
    )

    if (!value) {
        return null
    }

    if (format !== 'html') {
        return (
            <p className="whitespace-pre-wrap break-words text-sm leading-6">
                {value}
            </p>
        )
    }

    return (
        <div
            className={richTextClassName}
            dangerouslySetInnerHTML={{ __html: html }}
        />
    )
}