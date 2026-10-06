import React, { useEffect, useId, useRef, useState } from 'react'
import { StickyNote } from 'lucide-react'

import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'

import { studentName } from './attendanceUtils'

export function TermAttendance({ row }) {
    const counted = Number(row.term_count || 0)
    const attended = row.term_attended == null
        ? null
        : Number(row.term_attended)

    const percentage = counted > 0 && row.term_rate != null
        ? `${row.term_rate}%`
        : '—'

    // Older offline caches may not have the numerator yet.
    const meetings = counted === 0
        ? '0/0'
        : attended === null
            ? String(counted)
            : `${attended}/${counted}`

    return (
        <span
            className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs tabular-nums"
            title="Saved attendance: Present + Late / Present + Late + Absent. Excused and unmarked meetings are excluded."
        >
            <span className="font-medium text-foreground">
                {percentage}
            </span>

            <span className="text-muted-foreground">
                · {meetings} meetings
            </span>
        </span>
    )
}

export function RemarksCell({ row, editable, onChange }) {
    const [editing, setEditing] = useState(false)

    const inputRef = useRef(null)
    const buttonRef = useRef(null)
    const returnFocus = useRef(false)

    const id = useId()
    const name = studentName(row)
    const value = row.remarks || ''
    const hasNote = value.trim().length > 0

    useEffect(() => {
        if (editing && editable) {
            inputRef.current?.focus()
        } else if (returnFocus.current) {
            returnFocus.current = false
            buttonRef.current?.focus()
        }
    }, [editing, editable])

    useEffect(() => {
        if (!editable) setEditing(false)
    }, [editable])

    if (editing && editable) {
        return (
            <div className="min-w-0 space-y-1">
                <Input
                    ref={inputRef}
                    aria-label={`Remarks for ${name}`}
                    aria-describedby={`${id}-hint`}
                    value={value}
                    maxLength={255}
                    placeholder="Add a note…"
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={() => setEditing(false)}
                    onKeyDown={(event) => {
                        if (event.nativeEvent.isComposing) return

                        if (
                            event.key !== 'Enter' &&
                            event.key !== 'Escape'
                        ) {
                            return
                        }

                        event.preventDefault()
                        event.stopPropagation()

                        returnFocus.current = true
                        setEditing(false)
                    }}
                />

                <p
                    id={`${id}-hint`}
                    className="text-xs text-muted-foreground"
                >
                    Autosaves as you type. Enter or Esc closes the editor.
                </p>
            </div>
        )
    }

    if (!editable) {
        return hasNote ? (
            <span className="flex min-w-0 items-start gap-2 py-2 text-sm text-muted-foreground">
                <StickyNote
                    aria-hidden="true"
                    className="mt-0.5 size-4 shrink-0"
                />

                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    {value}
                </span>
            </span>
        ) : (
            <span
                className="text-sm text-muted-foreground"
                aria-label={`No remarks for ${name}`}
            >
                —
            </span>
        )
    }

    return (
        <Button
            ref={buttonRef}
            type="button"
            variant="ghost"
            size={hasNote ? 'default' : 'icon'}
            aria-label={`${hasNote ? 'Edit' : 'Add'} remarks for ${name}`}
            aria-expanded={false}
            title={hasNote ? value : 'Add a note'}
            className={
                hasNote
                    ? 'h-auto min-h-9 w-full justify-start gap-2 whitespace-normal px-2 text-left text-sm font-normal text-muted-foreground'
                    : 'size-9 text-muted-foreground hover:text-primary'
            }
            onClick={() => setEditing(true)}
        >
            <StickyNote aria-hidden="true" className="size-4 shrink-0" />

            {hasNote && (
                <span className="min-w-0 break-words [overflow-wrap:anywhere]">
                    {value}
                </span>
            )}
        </Button>
    )
}