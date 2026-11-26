import React from 'react'
import {
    CheckCircle2,
    CircleDashed,
    Clock3,
    ShieldCheck,
    XCircle,
} from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { Card, CardContent } from '@/Components/ui/card'
import { cn } from '@/Lib/Utils'
import RatesInfo from './RatesInfo'

const items = [
    {
        value: 'unmarked',
        label: 'Unmarked',
        Icon: CircleDashed,
        tone: 'text-muted-foreground',
    },
    {
        value: 'present',
        label: 'Present',
        Icon: CheckCircle2,
        tone: 'text-emerald-700 dark:text-emerald-400',
    },
    {
        value: 'late',
        label: 'Late',
        Icon: Clock3,
        tone: 'text-amber-700 dark:text-amber-400',
    },
    {
        value: 'absent',
        label: 'Absent',
        Icon: XCircle,
        tone: 'text-rose-700 dark:text-rose-400',
    },
    {
        value: 'excused',
        label: 'Excused',
        Icon: ShieldCheck,
        tone: 'text-sky-700 dark:text-sky-400',
    },
]

// The meeting's rate. Unmarked students don't count toward it, so until
// everyone is marked it says how many it covers instead of passing for the
// whole class.
function rateText(stats, cancelled) {
    const partial = stats.unmarked > 0 && stats.marked > 0

    return {
        value: stats.rate == null || cancelled ? '—' : `${stats.rate}%`,
        label: partial && !cancelled
            ? `Rate so far · ${stats.marked} of ${stats.total} marked`
            : 'Meeting rate',
        // For the one-line full-screen version.
        short: partial && !cancelled ? `so far · ${stats.marked}/${stats.total}` : 'rate',
        partial,
    }
}

// The counts for each status. Choosing one shows only those students;
// choosing it again shows everyone. `compact` is the one-line version for
// full screen.
export default function AttendanceSummaryCards({
    stats,
    filter,
    onFilterChange,
    cancelled,
    compact = false,
}) {
    const rate = rateText(stats, cancelled)

    return (
        <div
            role="group"
            aria-label="Meeting summary. Choose a status to show only those students."
            className={cn('grid gap-2', compact ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-3 lg:grid-cols-6')}
        >
            {items.map(({ value, label, Icon, tone }) => (
                <Card
                    key={value}
                    className={cn('py-0 shadow-none', filter === value && 'border-primary ring-1 ring-primary')}
                >
                    <CardContent className="p-0">
                        <Button
                            type="button"
                            variant="ghost"
                            aria-pressed={filter === value}
                            onClick={() =>
                                onFilterChange(
                                    filter === value ? 'all' : value
                                )
                            }
                            className={cn(
                                'h-auto w-full rounded-xl',
                                compact
                                    ? 'justify-start gap-2 px-3 py-1.5'
                                    : 'flex-col items-start gap-0.5 px-3 py-2',
                            )}
                        >
                            {compact ? (
                                <>
                                    <Icon aria-hidden="true" className={cn('size-4', tone)} />
                                    <span className={cn('font-semibold tabular-nums', tone)}>{stats[value]}</span>
                                    <span className="truncate text-xs font-normal text-muted-foreground">{label}</span>
                                </>
                            ) : (
                                <>
                                    <span className={`flex w-full items-center justify-between gap-2 ${tone}`}>
                                        <span className="text-xl font-semibold tabular-nums">
                                            {stats[value]}
                                        </span>
                                        <Icon aria-hidden="true" className="size-4" />
                                    </span>
                                    <span className="text-xs font-normal text-muted-foreground">
                                        {label}
                                    </span>
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>
            ))}

            <Card className="py-0 shadow-none">
                <CardContent className={cn(compact ? 'flex items-center gap-2 px-3 py-1.5' : 'space-y-0.5 px-3 py-2')}>
                    {compact ? (
                        <>
                            <span className={cn('font-semibold tabular-nums', rate.partial && 'text-muted-foreground')}>{rate.value}</span>
                            <span aria-hidden="true" className="min-w-0 flex-1 truncate text-xs text-muted-foreground" title={rate.label}>{rate.short}</span>
                            <span className="sr-only">{rate.label}</span>
                            <RatesInfo className="-mr-1" />
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between gap-2">
                                {/* Grey while it covers only part of the class. */}
                                <p className={cn('text-xl font-semibold tabular-nums', rate.partial && 'text-muted-foreground')}>
                                    {rate.value}
                                </p>
                                <RatesInfo className="-mr-1" />
                            </div>
                            <p className="text-xs text-muted-foreground">{rate.label}</p>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
