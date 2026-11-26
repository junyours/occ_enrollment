import React from 'react'
import { Info } from 'lucide-react'

import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
import { cn } from '@/Lib/Utils'

// How meeting and term attendance rates are worked out, behind an ⓘ.
export default function RatesInfo({ className }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    aria-label="How attendance rates work"
                    className={cn(
                        'inline-flex size-6 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        className,
                    )}
                >
                    <Info aria-hidden="true" className="size-4" />
                </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-1.5 text-sm">
                <p className="font-medium">How attendance rates work</p>
                <p className="text-muted-foreground">
                    (Present + Late) ÷ (Present + Late + Absent) × 100, rounded. Excused and
                    unmarked students are left out, so a meeting&rsquo;s rate covers only the
                    students marked so far.
                </p>
                <p className="text-muted-foreground">
                    Term attendance counts synced marks across Midterm and Final, including
                    meetings marked in advance. Cancelled meetings don&rsquo;t count.
                </p>
            </PopoverContent>
        </Popover>
    )
}
