import { useEffect, useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"

const DEBOUNCE_MS = 600
export const MAXIMUM_KEY = "maximum"
export const NAME_KEY = "name"
export const scoreKey = (studentId) => `score:${Number(studentId)}`

// Proposed Laravel route names
const SAVE_ROUTES = {
    score: "assessment-scores.save",
    maximum: "assessment-max-score.save",
    name: "assessment-name.save",
}

const sessions = new Map()

function errorMessage(error) {
    const body = error.response?.data
    const validationMessage = Object.values(body?.errors ?? {}).flat()[0]
    return validationMessage || body?.message || error.message || "Unable to save. Please retry."
}

// Timers belong to the assessment session, so filtering/unmounting a row cannot
// discard edits. Writes run in order; a pending maximum always goes first.
export function createAutosaveSession(save, delay = DEBOUNCE_MS) {
    const entries = new Map()
    const listeners = new Set()
    let running = false

    const emit = () => listeners.forEach((listener) => listener())
    const clearTimer = (entry) => {
        clearTimeout(entry.timer)
        entry.timer = null
    }

    async function drain() {
        if (running) return
        running = true

        try {
            while (true) {
                const maximum = entries.get(MAXIMUM_KEY)
                // A pending maximum blocks scores, but not independent name edits.
                const readyEntries = [...entries.values()].filter((entry) => entry.dirty && entry.ready)
                const next = maximum?.dirty
                    ? (maximum.ready ? maximum : readyEntries.find((entry) => entry.kind === "name"))
                    : readyEntries[0]

                if (!next) break

                clearTimer(next)
                next.ready = false
                next.status = "saving"
                next.inFlight = true
                const version = next.version
                const submitted = { kind: next.kind, studentId: next.studentId, value: next.value }
                emit()

                try {
                    const savedValue = await save(submitted)
                    next.savedValue = savedValue

                    // An older response may update the cache, but must never
                    // clear a newer edit or label it as saved.
                    if (next.version === version) {
                        next.value = savedValue
                        next.dirty = false
                        next.status = "saved"
                        next.error = null
                    }
                } catch (error) {
                    if (next.version === version) {
                        next.status = "error"
                        next.error = errorMessage(error)
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

    function edit(key, { kind, studentId, value, savedValue }) {
        let entry = entries.get(key)
        if (!entry) {
            entry = { kind, studentId, version: 0, inFlight: false }
            entries.set(key, entry)
        }

        // Refresh the baseline from query data only when no local write exists.
        if (!entry.dirty && !entry.inFlight) entry.savedValue = savedValue
        if (entry.dirty && Object.is(entry.value, value)) return

        clearTimer(entry)
        entry.value = value
        entry.version += 1
        entry.error = null
        entry.ready = false
        entry.dirty = entry.inFlight || !Object.is(value, entry.savedValue)
        entry.status = entry.dirty ? "unsaved" : "saved"

        if (entry.dirty) {
            entry.timer = setTimeout(() => {
                entry.timer = null
                entry.ready = true
                void drain()
            }, delay)
        }

        emit()
        // Reverting a failed maximum to its saved value releases waiting scores.
        void drain()
    }

    function flush(key, retry = false) {
        const entry = entries.get(key)
        if (!entry?.dirty || (entry.status === "error" && !retry)) return
        clearTimer(entry)
        // A blur after starting an unchanged request must not duplicate it.
        if (entry.status !== "saving") entry.ready = true
        if (retry) {
            entry.error = null
            entry.status = "unsaved"
        }
        emit()
        void drain()
    }

    return {
        edit,
        flush,
        retry: (key) => flush(key, true),
        flushAll() {
            entries.forEach((_, key) => flush(key))
        },
        retryAll() {
            entries.forEach((entry, key) => {
                if (entry.status === "error") flush(key, true)
            })
        },
        hasPending: () => [...entries.values()].some((entry) => entry.dirty),
        snapshot: () => new Map([...entries].map(([key, entry]) => [key, { ...entry }])),
        subscribe(listener) {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },
    }
}

function normalizeScore(value) {
    return value === null || value === "" || value === undefined ? null : Number(value)
}

export function useScoreAutosave(assessmentId, classId) {
    const queryClient = useQueryClient()
    const { mutateAsync } = useMutation({
        mutationKey: ["save-assessment", assessmentId],
        retry: false,
        networkMode: "always",
        mutationFn: async ({ kind, studentId, value }) => {
            const isScore = kind === "score"
            const field = { score: "score", maximum: "max_score", name: "name" }[kind]
            const submittedValue = kind === "name" ? String(value).trim() : value

            if (kind === "name" && !submittedValue) {
                throw new Error("Assessment name is required.")
            }

            const queryKey = isScore
                ? ["assessment-scores", assessmentId]
                : ["assessment-info", assessmentId]
            const payload = {
                assessment_id: assessmentId,
                [field]: submittedValue,
                ...(isScore ? { student_id: studentId } : {}),
            }

            await queryClient.cancelQueries({ queryKey, exact: true })
            const { data } = await axios.post(route(SAVE_ROUTES[kind]), payload)

            if (!data || typeof data !== "object" || !(field in data)) {
                throw new Error("The save endpoint returned an unexpected response.")
            }

            const responseAssessmentId = isScore ? data.assessment_id : data.id
            if (Number(responseAssessmentId) !== Number(assessmentId)
                || (kind === "score" && Number(data.student_id) !== Number(studentId))) {
                throw new Error("The save endpoint returned a different assessment or student.")
            }

            const savedValue = kind === "name"
                ? data.name
                : kind === "maximum" ? Number(data.max_score) : normalizeScore(data.score)

            if (kind === "name") {
                if (typeof savedValue !== "string" || !savedValue.trim()) {
                    throw new Error("The save endpoint returned an invalid assessment name.")
                }
            } else if ((savedValue !== null && !Number.isFinite(savedValue))
                || (kind === "maximum" && savedValue < 1)) {
                throw new Error("The save endpoint returned an invalid number.")
            }

            // Cancel a read that may have started while this request was saving.
            await queryClient.cancelQueries({ queryKey, exact: true })
            queryClient.setQueryData(queryKey, (current) => {
                // Update only the saved field, preserving other assessment metadata.
                if (!isScore) return { ...current, id: data.id, [field]: savedValue }
                const rows = current ?? []
                const record = { ...data, assessment_id: assessmentId, student_id: studentId, score: savedValue }
                const exists = rows.some((row) => Number(row.student_id) === Number(studentId))
                return exists
                    ? rows.map((row) => Number(row.student_id) === Number(studentId) ? { ...row, ...record } : row)
                    : [...rows, record]
            })
            if (kind === "name") {
                // Refresh assessment labels shown in the surrounding grading tabs.
                void queryClient.invalidateQueries({ queryKey: ["class-gradings", classId] })
            }
            return savedValue
        },
    })

    // Reopening an assessment reconnects to pending work and failed drafts.
    // The parent keys this hook's component by class + assessment.
    const [session] = useState(() => {
        const key = `${classId}:${assessmentId}`
        if (!sessions.has(key)) sessions.set(key, createAutosaveSession(mutateAsync))
        return sessions.get(key)
    })
    const [entries, setEntries] = useState(() => session.snapshot())
    const [navigationMessage, setNavigationMessage] = useState("")

    useEffect(() => {
        const unsubscribe = session.subscribe(() => setEntries(session.snapshot()))
        setEntries(session.snapshot())
        return () => {
            unsubscribe()
            // Continue saving while the SPA remains open, even if this view closes.
            session.flushAll()
        }
    }, [session])

    useEffect(() => {
        const beforeUnload = (event) => {
            if (!session.hasPending()) return
            event.preventDefault()
            event.returnValue = ""
        }
        const beforeVisit = (event) => {
            if (!session.hasPending()) return
            event.preventDefault()
            session.flushAll()
            setNavigationMessage("Finish saving or retry failed changes, then navigate again.")
        }
        window.addEventListener("beforeunload", beforeUnload)
        document.addEventListener("inertia:before", beforeVisit)
        return () => {
            window.removeEventListener("beforeunload", beforeUnload)
            document.removeEventListener("inertia:before", beforeVisit)
        }
    }, [session])

    const pendingCount = [...entries.values()].filter((entry) => entry.dirty).length
    const errorCount = [...entries.values()].filter((entry) => entry.status === "error").length

    return {
        entries,
        pendingCount,
        errorCount,
        navigationMessage: pendingCount ? navigationMessage : "",
        editScore: (studentId, value, savedValue) => session.edit(scoreKey(studentId), {
            kind: "score", studentId, value, savedValue: normalizeScore(savedValue),
        }),
        editMaximum: (value, savedValue) => session.edit(MAXIMUM_KEY, {
            kind: "maximum", value, savedValue: Number(savedValue),
        }),
        editName: (value, savedValue) => session.edit(NAME_KEY, {
            kind: "name", value, savedValue: savedValue ?? "",
        }),
        flushName: () => session.flush(NAME_KEY),
        retryName: () => session.retry(NAME_KEY),
        flushScore: (studentId) => session.flush(scoreKey(studentId)),
        flushMaximum: () => session.flush(MAXIMUM_KEY),
        retryScore: (studentId) => session.retry(scoreKey(studentId)),
        retryMaximum: () => session.retry(MAXIMUM_KEY),
        retryAll: session.retryAll,
    }
}
