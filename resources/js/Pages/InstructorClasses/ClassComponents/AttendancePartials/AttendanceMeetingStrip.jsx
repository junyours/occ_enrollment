import React, { useEffect, useRef } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import {
    formatDate,
    meetingLabel,
    sessionCounts,
    STATUSES,
} from './attendanceUtils'

const periodLabels = {
    midterm: 'Midterm',
    final: 'Final',
}

const amber =
    'border-amber-500/25 bg-amber-500/10 ' +
    'text-amber-800 dark:text-amber-300'

export default function AttendanceMeetingStrip({
    attendance: a,
    classId,
    onAdd,
}) {
    const stripRef = useRef(null)
    const drag = useRef(null)
    const suppressClick = useRef(false)

    useEffect(() => {
        const strip = stripRef.current

        function wheel(event) {
            if (
                event.ctrlKey ||
                Math.abs(event.deltaX) > Math.abs(event.deltaY)
            ) {
                return
            }

            const unit =
                event.deltaMode === 1
                    ? 16
                    : event.deltaMode === 2
                        ? strip.clientWidth
                        : 1

            const delta = event.deltaY * unit

            const canScroll =
                delta > 0
                    ? strip.scrollLeft <
                    strip.scrollWidth - strip.clientWidth - 1
                    : strip.scrollLeft > 0

            if (!delta || !canScroll) return

            event.preventDefault()
            strip.scrollLeft += delta
        }

        strip.addEventListener('wheel', wheel, {
            passive: false,
        })

        return () => {
            strip.removeEventListener('wheel', wheel)
        }
    }, [])

    // Reveal the selected meeting without scrolling the parent.
    useEffect(() => {
        const strip = stripRef.current
        const selected = strip.querySelector(
            '[aria-current="date"]'
        )

        if (!selected) return

        const bounds = strip.getBoundingClientRect()
        const card = selected.getBoundingClientRect()

        if (card.left < bounds.left) {
            strip.scrollLeft -= bounds.left - card.left + 4
        } else if (card.right > bounds.right) {
            strip.scrollLeft += card.right - bounds.right + 4
        }
    }, [a.session?.id])

    function startDrag(event) {
        if (
            event.pointerType !== 'mouse' ||
            event.button !== 0
        ) {
            return
        }

        suppressClick.current = false

        drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            left: event.currentTarget.scrollLeft,
            active: false,
        }
    }

    function moveDrag(event) {
        const current = drag.current

        if (!current || event.pointerId !== current.id) {
            return
        }

        const distance = event.clientX - current.x
        const strip = event.currentTarget

        if (!current.active) {
            if (
                Math.abs(distance) < 6 ||
                Math.abs(distance) <
                Math.abs(event.clientY - current.y)
            ) {
                return
            }

            if (strip.scrollWidth <= strip.clientWidth) {
                return
            }

            current.active = true
            suppressClick.current = true

            strip.setPointerCapture(event.pointerId)
            strip.dataset.dragging = 'true'
        }

        event.preventDefault()
        strip.scrollLeft = current.left - distance
    }

    function finishDrag(event) {
        if (drag.current?.id !== event.pointerId) return

        drag.current = null
        delete event.currentTarget.dataset.dragging

        if (
            event.currentTarget.hasPointerCapture(
                event.pointerId
            )
        ) {
            event.currentTarget.releasePointerCapture(
                event.pointerId
            )
        }
    }

    return (
        <div className="flex min-w-0 items-stretch gap-2">
            <nav
                ref={stripRef}
                aria-label="Attendance meetings"
                tabIndex={0}
                className="attendance-dates relative flex min-w-0 flex-1 items-start gap-2 overflow-x-auto overscroll-x-contain p-1 pb-2"
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={finishDrag}
                onPointerCancel={finishDrag}
                onLostPointerCapture={finishDrag}
                onPointerLeave={(event) => {
                    if (!drag.current?.active) {
                        finishDrag(event)
                    }
                }}
                onClickCapture={(event) => {
                    // A completed drag must not select a meeting.
                    // Keyboard-generated clicks remain available.
                    if (
                        suppressClick.current &&
                        event.detail !== 0
                    ) {
                        event.preventDefault()
                        event.stopPropagation()
                        suppressClick.current = false
                    }
                }}
            >
                {a.sessions.map((session) => {
                    const selected =
                        String(session.id) ===
                        String(a.session?.id)

                    const displayed =
                        selected && session.roster_initialized_at
                            ? sessionCounts(session, a.rows)
                            : session

                    const pending =
                        (selected && a.pending) ||
                        session.pending_sync

                    const status = pending
                        ? 'Pending sync'
                        : meetingLabel(displayed)

                    const hasMarks = STATUSES.some(
                        ({ value }) =>
                            Number(
                                displayed[`${value}_count`]
                            ) > 0
                    )

                    const statusTone =
                        status === 'Partially recorded' ||
                            pending
                            ? amber
                            : ''

                    return (
                        <Button
                            key={session.id}
                            type="button"
                            variant="outline"
                            disabled={
                                a.busy || !a.canNavigate
                            }
                            aria-current={
                                selected ? 'date' : undefined
                            }
                            onClick={() =>
                                a.selectSession(session.id)
                            }
                            className={`h-auto w-48 shrink-0 flex-col items-start gap-0 rounded-xl px-3 py-2.5 text-left ${selected
                                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                                    : ''
                                }`}
                        >
                            <span className="font-medium">
                                {formatDate(
                                    session.attendance_date,
                                    true
                                )}
                            </span>

                            <span className="mt-0.5 text-xs text-muted-foreground">
                                {periodLabels[session.period]}
                                {' · '}
                                Meeting {session.session_number}
                            </span>

                            <Badge
                                variant="secondary"
                                className={`mt-2 text-[11px] ${statusTone}`}
                            >
                                {status}
                            </Badge>

                            {hasMarks && (
                                <span className="mt-2 flex w-full items-center justify-between gap-1 text-[11px] tabular-nums">
                                    {STATUSES.map(
                                        ({
                                            value,
                                            label,
                                            short,
                                        }) => {
                                            const count = Number(
                                                displayed[
                                                `${value}_count`
                                                ] || 0
                                            )

                                            return (
                                                <span
                                                    key={value}
                                                    title={label}
                                                    aria-label={`${count} ${label}`}
                                                >
                                                    <span className="font-medium">
                                                        {count}
                                                    </span>
                                                    {' '}
                                                    <span
                                                        className="text-muted-foreground"
                                                        aria-hidden="true"
                                                    >
                                                        {short}
                                                    </span>
                                                </span>
                                            )
                                        }
                                    )}
                                </span>
                            )}
                        </Button>
                    )
                })}
            </nav>

            <Button
                type="button"
                variant="outline"
                aria-label="Add meeting"
                title="Add meeting"
                disabled={
                    !a.online ||
                    a.busy ||
                    !a.canNavigate ||
                    !classId
                }
                onClick={onAdd}
                className="my-1 h-auto min-h-20 w-12 shrink-0 flex-col gap-1.5 self-start rounded-xl border-dashed text-primary hover:border-primary hover:bg-primary/5 sm:w-28"
            >
                <Plus aria-hidden="true" className="size-5" />

                <span className="hidden text-xs sm:inline">
                    Add meeting
                </span>
            </Button>
        </div>
    )
}