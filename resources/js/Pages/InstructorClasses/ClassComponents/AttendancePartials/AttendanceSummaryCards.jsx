import React from 'react'
import {
    CheckCircle2,
    CircleDashed,
    Clock3,
    Percent,
    ShieldCheck,
    XCircle,
} from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { Card, CardContent } from '@/Components/ui/card'

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

export default function AttendanceSummaryCards({
    stats,
    filter,
    onFilterChange,
    cancelled,
}) {
    return (
        <div
            aria-label="Meeting summary"
            className="grid grid-cols-3 gap-2 lg:grid-cols-6"
        >
            {items.map(({ value, label, Icon, tone }) => (
                <Card
                    key={value}
                    className={`py-0 shadow-none ${filter === value ? 'border-primary' : ''
                        }`}
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
                            className="h-auto w-full flex-col items-start gap-0.5 rounded-xl px-3 py-2"
                        >
                            <span
                                className={`flex w-full items-center justify-between gap-2 ${tone}`}
                            >
                                <span className="text-xl font-semibold tabular-nums">
                                    {stats[value]}
                                </span>

                                <Icon
                                    aria-hidden="true"
                                    className="size-4"
                                />
                            </span>

                            <span className="text-xs font-normal text-muted-foreground">
                                {label}
                            </span>
                        </Button>
                    </CardContent>
                </Card>
            ))}

            <Card className="py-0 shadow-none">
                <CardContent className="space-y-0.5 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                        <p className="text-xl font-semibold tabular-nums">
                            {stats.rate == null || cancelled
                                ? '—'
                                : `${stats.rate}%`}
                        </p>

                        <Percent
                            aria-hidden="true"
                            className="size-4 text-muted-foreground"
                        />
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Meeting rate
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}