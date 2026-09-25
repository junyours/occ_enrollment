import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

const sessions = new Map()

const sessionKey = (classId, examId) => `${classId}:${examId}`

const messageFor = (error) =>
    Object.values(error.response?.data?.errors ?? {}).flat()[0] ||
    error.response?.data?.message ||
    error.message ||
    'Unable to save. Please retry.'

// Keeps pending edits in memory when switching tabs.
export function createExamScoreQueue(save, delay = 600) {
    const entries = new Map()
    const listeners = new Set()

    let running = false

    const emit = () => {
        listeners.forEach((listener) => listener())
    }

    const stopTimer = (entry) => {
        clearTimeout(entry.timer)
        entry.timer = null
    }

    async function drain() {
        if (running) return

        running = true

        try {
            while (true) {
                const next = [...entries.values()].find(
                    (entry) => entry.dirty && entry.ready
                )

                if (!next) break

                stopTimer(next)

                next.ready = false
                next.inFlight = true
                next.unconfirmed = true
                next.status = 'saving'

                const version = next.version

                const submitted = {
                    studentId: next.studentId,
                    value: next.value,
                }

                emit()

                try {
                    const saved = await save(submitted)

                    next.savedValue = saved
                    next.unconfirmed = false

                    // Only mark saved if this is still the latest edit.
                    if (next.version === version) {
                        next.value = saved
                        next.dirty = false
                        next.status = 'saved'
                        next.error = ''
                    }
                } catch (error) {
                    if (next.version === version) {
                        next.status = 'error'
                        next.error = messageFor(error)
                        next.ready = false
                    }
                } finally {
                    next.inFlight = false
                    emit()
                }
            }
        } finally {
            running = false
        }
    }

    function edit(studentId, value, savedValue) {
        const key = String(studentId)

        let entry = entries.get(key)

        if (!entry) {
            entry = {
                studentId,
                version: 0,
                inFlight: false,
            }

            entries.set(key, entry)
        }

        if (!entry.dirty && !entry.inFlight) {
            entry.savedValue = savedValue
        }

        stopTimer(entry)

        entry.version += 1
        entry.value = value
        entry.error = ''
        entry.ready = false

        // A failed response might still have written to the database.
        entry.dirty =
            entry.inFlight ||
            entry.unconfirmed ||
            !Object.is(value, entry.savedValue)

        entry.status = entry.dirty ? 'unsaved' : 'saved'

        if (entry.dirty) {
            entry.timer = setTimeout(() => {
                entry.timer = null
                entry.ready = true
                void drain()
            }, delay)
        }

        emit()
    }

    function flush(studentId, retry = false) {
        const entry = entries.get(String(studentId))

        if (!entry?.dirty) return
        if (entry.status === 'error' && !retry) return

        stopTimer(entry)

        if (entry.status !== 'saving') {
            entry.ready = true
        }

        if (retry) {
            entry.status = 'unsaved'
            entry.error = ''
        }

        emit()
        void drain()
    }

    return {
        edit,
        flush,

        flushAll: () => {
            entries.forEach((entry) => flush(entry.studentId))
        },

        retry: (studentId) => flush(studentId, true),

        retryAll: () => {
            entries.forEach((entry) => {
                if (entry.status === 'error') {
                    flush(entry.studentId, true)
                }
            })
        },

        hasPending: () =>
            [...entries.values()].some(
                (entry) => entry.dirty || entry.inFlight
            ),

        snapshot: () =>
            new Map(
                [...entries].map(([key, entry]) => [
                    key,
                    { ...entry },
                ])
            ),

        subscribe(listener) {
            listeners.add(listener)

            return () => listeners.delete(listener)
        },
    }
}

export function examHasPendingScores(classId, examId) {
    return (
        sessions.get(sessionKey(classId, examId))?.hasPending() ??
        false
    )
}

export function readSavedExamScore(
    data,
    examId,
    studentId,
    submittedScore
) {
    if (
        String(data?.exam_id) !== String(examId) ||
        String(data?.student_id) !== String(studentId)
    ) {
        throw new Error(
            'The save endpoint returned a different exam or student.'
        )
    }

    const rawScore = data.score
    const saved = rawScore === null ? null : Number(rawScore)

    const isNumeric =
        typeof rawScore === 'number' ||
        (typeof rawScore === 'string' && /^\d+$/.test(rawScore))

    if (
        rawScore !== null &&
        (!isNumeric || !Number.isSafeInteger(saved) || saved < 0)
    ) {
        throw new Error(
            'The save endpoint returned an invalid score.'
        )
    }

    if (saved !== submittedScore) {
        throw new Error(
            'The server did not return the score you submitted. Please retry.'
        )
    }

    return saved
}

export function useExamScoreAutosave(classId, examId) {
    const queryClient = useQueryClient()

    const [queue] = useState(() => {
        const key = sessionKey(classId, examId)

        if (!sessions.has(key)) {
            const save = async ({ studentId, value }) => {
                if (
                    value !== null &&
                    (!Number.isSafeInteger(value) || value < 0)
                ) {
                    throw new Error(
                        'Enter a whole number of zero or more, or clear the score.'
                    )
                }

                const queryKey = ['exam-scores', examId]

                const { data } = await axios.post(
                    route('exam-scores.save'),
                    {
                        exam_id: examId,
                        student_id: studentId,
                        score: value,
                    }
                )

                const saved = readSavedExamScore(
                    data,
                    examId,
                    studentId,
                    value
                )

                await queryClient.cancelQueries({
                    queryKey,
                    exact: true,
                })

                queryClient.setQueryData(
                    queryKey,
                    (current = []) => {
                        const record = { ...data, score: saved }

                        const matches = (row) =>
                            String(row.student_id) ===
                            String(studentId)

                        return current.some(matches)
                            ? current.map((row) =>
                                matches(row) ? record : row
                            )
                            : [...current, record]
                    }
                )

                // A summary refresh failure must not mark the score unsaved.
                void queryClient
                    .invalidateQueries({
                        queryKey: ['grade-summary'],
                    })
                    .catch(() => { })

                return saved
            }

            sessions.set(key, createExamScoreQueue(save))
        }

        return sessions.get(key)
    })

    const [entries, setEntries] = useState(() => queue.snapshot())
    const [navigationMessage, setNavigationMessage] = useState('')

    useEffect(() => {
        const unsubscribe = queue.subscribe(() => {
            setEntries(queue.snapshot())
        })

        setEntries(queue.snapshot())

        return () => {
            unsubscribe()
            queue.flushAll()
        }
    }, [queue])

    useEffect(() => {
        const beforeUnload = (event) => {
            if (!queue.hasPending()) return

            event.preventDefault()
            event.returnValue = ''
        }

        const beforeVisit = (event) => {
            if (!queue.hasPending()) return

            event.preventDefault()
            queue.flushAll()

            setNavigationMessage(
                'Finish saving or retry failed exam scores before navigating.'
            )
        }

        window.addEventListener('beforeunload', beforeUnload)
        document.addEventListener('inertia:before', beforeVisit)

        return () => {
            document.removeEventListener(
                'inertia:before',
                beforeVisit
            )

            if (!queue.hasPending()) {
                window.removeEventListener(
                    'beforeunload',
                    beforeUnload
                )
                return
            }

            // Keep the reload warning until remaining writes finish.
            const stop = queue.subscribe(() => {
                if (queue.hasPending()) return

                window.removeEventListener(
                    'beforeunload',
                    beforeUnload
                )
                stop()
            })
        }
    }, [queue])

    const pendingCount = [...entries.values()].filter(
        (entry) => entry.dirty
    ).length

    return {
        entries,
        pendingCount,

        errorCount: [...entries.values()].filter(
            (entry) => entry.status === 'error'
        ).length,

        navigationMessage: pendingCount ? navigationMessage : '',

        edit: queue.edit,
        flush: queue.flush,
        retry: queue.retry,
        retryAll: queue.retryAll,
    }
}