import React, { useState } from 'react'
import { format, isValid, parse } from 'date-fns'
import { Button } from '@/Components/ui/button'
import { Calendar } from '@/Components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
import { cn } from '@/Lib/Utils'

// 'yyyy-MM-dd' (or a datetime starting with it) as a local date; undefined
// when empty or not a date.
function toDate(value) {
    if (!value) return undefined

    const date = parse(String(value).slice(0, 10), 'yyyy-MM-dd', new Date())

    return isValid(date) ? date : undefined
}

/** Today as 'yyyy-MM-dd', e.g. for `max` on a birthday. */
export const todayValue = () => format(new Date(), 'yyyy-MM-dd')

/**
 * The SIS date field: an outline button showing the date ("Nov 25, 2026")
 * that opens a calendar with month and year dropdowns. Use it instead of a
 * native date input.
 *
 * - `value` / `onChange`: 'yyyy-MM-dd' text, '' when empty.
 * - `min` / `max`: 'yyyy-MM-dd'; days outside them can't be picked.
 * - `required`: clicking the chosen day again keeps it instead of clearing.
 * - `labelledBy`: the label's id, so screen readers hear "Birthday, Nov 25, 2026".
 * - `startMonth` / `endMonth`: the year dropdown's range (default: min/max,
 *   or ten years either side).
 */
export default function DatePicker({
    id,
    value,
    onChange,
    min,
    max,
    required = false,
    disabled = false,
    invalid = false,
    placeholder = 'Select date',
    labelledBy,
    startMonth,
    endMonth,
    className,
    ...props
}) {
    const [open, setOpen] = useState(false)
    const selected = toDate(value)
    const minDate = toDate(min)
    const maxDate = toDate(max)
    const [month, setMonth] = useState(selected)
    const year = (selected ?? new Date()).getFullYear()

    return (
        <Popover
            open={open && !disabled}
            onOpenChange={(next) => {
                // Open on the chosen date's month, or the nearest allowed one.
                if (next) setMonth(selected ?? (maxDate && maxDate < new Date() ? maxDate : minDate && minDate > new Date() ? minDate : new Date()))
                setOpen(next)
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    aria-invalid={invalid || undefined}
                    aria-labelledby={labelledBy && id ? `${labelledBy} ${id}` : undefined}
                    className={cn(
                        'w-full justify-between font-normal',
                        !selected && 'text-muted-foreground',
                        invalid && 'border-destructive',
                        className,
                    )}
                    {...props}
                >
                    {selected ? format(selected, 'MMM d, yyyy') : placeholder}
                </Button>
            </PopoverTrigger>
            {/* Above dialogs, which sit at z-50. */}
            <PopoverContent className="z-[60] w-auto overflow-hidden p-0" align="start">
                <Calendar
                    mode="single"
                    selected={selected}
                    month={month}
                    onMonthChange={setMonth}
                    captionLayout="dropdown"
                    startMonth={startMonth ?? minDate ?? new Date(year - 10, 0)}
                    endMonth={endMonth ?? maxDate ?? new Date(year + 10, 11)}
                    disabled={[minDate && { before: minDate }, maxDate && { after: maxDate }].filter(Boolean)}
                    autoFocus
                    onSelect={(date) => {
                        if (date || !required) onChange(date ? format(date, 'yyyy-MM-dd') : '')
                        setOpen(false)
                    }}
                />
            </PopoverContent>
        </Popover>
    )
}
