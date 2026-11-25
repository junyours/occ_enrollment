import React from 'react'

// What the first-run attendance guide says. Targets are `data-tour`
// attributes; steps whose control isn't on screen are skipped.

const strong = (text) => <strong className="font-medium text-foreground">{text}</strong>

export const Key = ({ children }) => (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1 font-sans text-[11px] font-medium leading-none text-foreground">
        {children}
    </kbd>
)

// `keyboard`: the device has a mouse or trackpad, so it likely has a keyboard.
export function attendanceGuide({ keyboard }) {
    return [
        {
            title: 'Taking attendance',
            body: (
                <>
                    <p>
                        Mark each student present, late, absent or excused for every class meeting.
                        Marks save as you go, even if the internet drops.
                    </p>
                    <p>This quick guide shows you around.</p>
                </>
            ),
            next: 'Start the guide',
        },
        {
            target: '[data-tour="attendance-meetings"]',
            title: 'Your meetings',
            body: (
                <p>
                    Each card is one class meeting. Pick one to take or review its attendance, or
                    use {strong('Add meeting')} for a new class day or a makeup class.
                </p>
            ),
        },
        {
            target: '[data-tour="attendance-period"]',
            title: 'Grading period',
            body: (
                <p>
                    The meeting counts toward the {strong('Midterm')} or the {strong('Final')}.
                    Added it under the wrong one? Switch it here. The marks stay as they are.
                </p>
            ),
        },
        {
            target: '[data-tour="attendance-row"]',
            title: 'Mark each student',
            body: (
                <p>
                    Choose a status for each student. Choose it again to clear it. The note
                    button adds a remark, like why someone was excused.
                </p>
            ),
        },
        keyboard && {
            target: '[data-tour="attendance-keys"]',
            title: 'Faster with the keyboard',
            body: (
                <>
                    <p>
                        Click a student or press Tab to reach the list, then press <Key>P</Key> Present,{' '}
                        <Key>L</Key> Late, <Key>A</Key> Absent or <Key>E</Key> Excused. It moves on to the
                        next student by itself. <Key>1</Key>–<Key>4</Key> work too.
                    </p>
                    <p>
                        <Key>⌫</Key> clears a mark, <Key>↑</Key> <Key>↓</Key> move between students
                        and <Key>R</Key> writes a remark.
                    </p>
                </>
            ),
        },
        {
            target: '[data-tour="attendance-bulk"]',
            title: 'Everyone here?',
            body: (
                <p>
                    {strong('Mark unmarked present')} fills in everyone you haven’t marked. Then change
                    the few who were late or absent. Undo appears right after.
                </p>
            ),
        },
        {
            target: '[data-tour="attendance-lock"]',
            title: 'Lock it when it’s final',
            body: (
                <p>
                    Once everyone is marked and synced, lock the meeting to make it read-only.
                    Locking can’t be undone.
                </p>
            ),
        },
        {
            target: '[data-tour="guide-attendance"]',
            title: 'Need a refresher?',
            body: <p>Open this guide again anytime from here.</p>,
            placement: 'left',
        },
    ].filter(Boolean)
}
