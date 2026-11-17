import React from 'react'
import { ExternalLink } from 'lucide-react'

// Links a student turned in. External, so they open in a new tab without
// handing this page to the linked site.
export default function LinkList({ links, label = 'Links' }) {
    if (!links?.length) return null

    return (
        <div className="space-y-1.5">
            <p className="text-sm font-medium">{label}</p>
            <ul className="space-y-1.5">
                {links.map((link) => (
                    <li key={link}>
                        <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="inline-flex max-w-full items-center gap-2 break-all rounded-md text-sm text-primary underline-offset-4 hover:underline"
                        >
                            <ExternalLink className="size-4 shrink-0" aria-hidden="true" />
                            <span className="min-w-0">{link}</span>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    )
}
