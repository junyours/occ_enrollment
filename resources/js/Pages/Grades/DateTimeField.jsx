import React, { useId, useState } from 'react'
import { format, parse } from 'date-fns'
import { CalendarDays } from 'lucide-react'

import { Button } from '@/Components/ui/button'
import { Calendar } from '@/Components/ui/calendar'
import { Field, FieldLabel } from '@/Components/ui/field'
import { Input } from '@/Components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
import { cn } from '@/Lib/Utils'

const toDate = (value) => (value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined)

/**
 * A date from the calendar popup plus a time, as school-time text:
 * { date: 'yyyy-MM-dd' or '', time: 'HH:mm' or '' }. Picking a date before a
 * time fills in `defaultTime`.
 */
export default function DateTimeField({ label, optional = false, value, onChange, defaultTime = '08:00', disabled = false, invalid = false, hint }) {
    const dateId = useId()
    const [open, setOpen] = useState(false)
    const selected = toDate(value.date)
    const year = (selected ?? new Date()).getFullYear()

    return (
        <Field>
            <div className="flex items-center justify-between gap-2">
                <FieldLabel htmlFor={dateId}>
                    {label}
                    {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
                </FieldLabel>
                {optional && value.date && !disabled && (
                    <Button type="button" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onChange({ date: '', time: '' })}>
                        Clear
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)_7.5rem] gap-2">
                <Popover open={open && !disabled} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            id={dateId}
                            disabled={disabled}
                            aria-invalid={invalid || undefined}
                            className={cn(
                                'h-9 w-full justify-start font-normal',
                                !selected && 'text-muted-foreground',
                                invalid && 'border-destructive'
                            )}
                        >
                            <CalendarDays className="mr-2 h-4 w-4 shrink-0" />
                            {selected ? format(selected, 'PP') : 'Select date'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="z-[60] w-auto overflow-hidden p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={selected}
                            defaultMonth={selected}
                            captionLayout="dropdown"
                            startMonth={new Date(year - 2, 0)}
                            endMonth={new Date(year + 2, 11)}
                            autoFocus
                            onSelect={(date) => {
                                onChange({
                                    date: date ? format(date, 'yyyy-MM-dd') : '',
                                    time: date ? value.time || defaultTime : '',
                                })
                                setOpen(false)
                            }}
                        />
                    </PopoverContent>
                </Popover>

                <Input
                    type="time"
                    step="60"
                    aria-label={`${label} time`}
                    value={value.time}
                    disabled={disabled || !value.date}
                    onChange={(event) => onChange({ ...value, time: event.target.value })}
                    className="h-9 appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none"
                />
            </div>

            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </Field>
    )
}
