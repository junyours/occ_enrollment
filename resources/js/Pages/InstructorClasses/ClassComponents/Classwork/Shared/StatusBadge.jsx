import React from 'react'

import { Badge } from '@/Components/ui/badge'
import { cn } from '@/Lib/Utils'

// Colour always pairs with a text label, never stands alone.
const TONES = {
    neutral: 'border-border bg-muted text-muted-foreground',
    info: 'border-primary/20 bg-primary/10 text-primary',
    success: 'border-emerald-600/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    warning: 'border-amber-600/25 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    danger: 'border-destructive/25 bg-destructive/10 text-destructive dark:text-red-400',
}

export default function StatusBadge({ tone = 'neutral', className, children, ...props }) {
    return (
        <Badge
            variant="outline"
            className={cn(
                'h-auto max-w-full justify-start gap-1.5 whitespace-normal rounded-lg px-2.5 py-1 text-left text-xs font-medium leading-4',
                TONES[tone] ?? TONES.neutral,
                className
            )}
            {...props}
        >
            <span className="size-1.5 shrink-0 rounded-full bg-current" aria-hidden="true" />
            <span>{children}</span>
        </Badge>
    )
}
