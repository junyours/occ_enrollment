import { useState } from 'react'
import { cn } from '@/Lib/Utils'

// A dashboard panel: a heading row, then its rows.
export default function Section({ id, title, meta, className, children }) {
    return (
        <section aria-labelledby={`${id}-heading`} className={cn('overflow-hidden rounded-xl border bg-card text-card-foreground', className)}>
            <div className="flex items-baseline justify-between gap-3 border-b px-4 py-3">
                <h2 id={`${id}-heading`} className="text-sm font-semibold">{title}</h2>
                {meta && <p className="truncate text-xs text-muted-foreground">{meta}</p>}
            </div>
            {children}
        </section>
    )
}

// The first `limit` items, with a button to show the rest.
export function useShowMore(items, limit) {
    const [expanded, setExpanded] = useState(false)
    const hidden = items.length - limit

    return {
        visible: expanded ? items : items.slice(0, limit),
        toggle: hidden > 0 && (
            <div className="border-t px-4 py-2">
                <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {expanded ? 'Show less' : `Show ${hidden} more`}
                </button>
            </div>
        ),
    }
}
