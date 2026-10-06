import { openDB } from 'idb'

export const hasPending = (doc) => Boolean(
    doc?.flight ||
    Object.keys(doc?.patches || {}).length,
)

const fields = ['status', 'remarks']

const valueOf = (row, field) =>
    row?.[field] ?? (field === 'remarks' ? '' : null)

export const documentKey = (userId, classId, sessionId) =>
    `${userId}:${classId}:${sessionId}`

export function documentRows(doc) {
    return (doc?.detail.records || []).map((row) => {
        const patch = doc.patches[String(row.student_subject_id)] || {}

        return {
            ...row,
            ...Object.fromEntries(
                fields.map((field) => [
                    field,
                    patch[field]
                        ? patch[field].value
                        : valueOf(row, field),
                ]),
            ),
        }
    })
}

function compact(doc) {
    if (doc.flight) return

    for (const row of doc.detail.records) {
        const id = String(row.student_subject_id)
        const patch = doc.patches[id]

        if (!patch) continue

        for (const field of fields) {
            if (
                patch[field] &&
                patch[field].value === valueOf(row, field)
            ) {
                delete patch[field]
            }
        }

        if (!Object.keys(patch).length) {
            delete doc.patches[id]
        }
    }
}

function uuid() {
    if (globalThis.crypto.randomUUID) {
        return globalThis.crypto.randomUUID()
    }

    const bytes = globalThis.crypto.getRandomValues(
        new Uint8Array(16),
    )

    bytes[6] = (bytes[6] & 15) | 64
    bytes[8] = (bytes[8] & 63) | 128

    const hex = [...bytes]
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('')

    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20),
    ].join('-')
}

export function createAttendanceStore(name = 'occ-attendance-v2') {
    let connection

    const listeners = new Set()

    const channel =
        typeof window !== 'undefined' &&
            typeof BroadcastChannel !== 'undefined'
            ? new BroadcastChannel(name)
            : null

    const notify = (userId) => {
        listeners.forEach((listener) => listener(String(userId)))
    }

    if (channel) {
        channel.onmessage = (event) => notify(event.data)
    }

    const emit = (userId) => {
        notify(userId)
        channel?.postMessage(String(userId))
    }

    const db = () => connection ||= openDB(name, 1, {
        upgrade(database) {
            const docs = database.createObjectStore('documents', {
                keyPath: 'key',
            })

            docs.createIndex('userId', 'userId')
            docs.createIndex('classKey', 'classKey')

            const lists = database.createObjectStore('lists', {
                keyPath: 'key',
            })

            lists.createIndex('classKey', 'classKey')
        },
    })

    async function change(key, update) {
        const tx = (await db()).transaction(
            'documents',
            'readwrite',
        )

        try {
            const old = await tx.store.get(key)
            const next = update(old)

            if (next) {
                next.revision = (old?.revision || 0) + 1
                await tx.store.put(next)
            }

            await tx.done

            if (next) emit(next.userId)

            return next || old
        } catch (error) {
            try {
                tx.abort()
            } catch {
                // Transaction already completed.
            }

            await tx.done.catch(() => { })
            throw error
        }
    }

    return {
        subscribe(listener) {
            listeners.add(listener)
            return () => listeners.delete(listener)
        },

        async get(key) {
            return (await db()).get('documents', key)
        },

        async all(userId) {
            return (await db()).getAllFromIndex(
                'documents',
                'userId',
                String(userId),
            )
        },

        async classData(userId, classId) {
            const database = await db()
            const key = `${userId}:${classId}`

            const [docs, lists] = await Promise.all([
                database.getAllFromIndex(
                    'documents',
                    'classKey',
                    key,
                ),
                database.getAllFromIndex(
                    'lists',
                    'classKey',
                    key,
                ),
            ])

            return { docs, lists }
        },

        async cacheList(userId, classId, period, data) {
            const classKey = `${userId}:${classId}`

            await (await db()).put('lists', {
                key: `${classKey}:${period}`,
                classKey,
                period,
                data,
            })

            emit(userId)
        },

        ingest(userId, classId, detail) {
            const key = documentKey(
                userId,
                classId,
                detail.session.id,
            )

            return change(key, (old) => {
                // Refetching must never erase unsynced changes.
                if (hasPending(old)) return

                if (
                    old &&
                    Number(old.detail.session.lock_version) >
                    Number(detail.session.lock_version)
                ) {
                    return
                }

                return {
                    ...old,
                    key,
                    userId: String(userId),
                    classId: String(classId),
                    classKey: `${userId}:${classId}`,
                    detail,
                    patches: {},
                    flight: null,
                    counter: old?.counter || 0,
                    blocked: null,
                    retryAt: 0,
                    attempts: 0,
                    dueAt: 0,
                }
            })
        },

        patch(key, edits) {
            return change(key, (doc) => {
                if (!doc) {
                    throw new Error('Load this meeting online first.')
                }

                if (
                    doc.detail.session.locked_at ||
                    doc.blocked?.status === 423
                ) {
                    throw new Error(
                        'This meeting is permanently locked.',
                    )
                }

                if (doc.detail.session.status !== 'open') {
                    throw new Error(
                        'Restore this meeting before editing.',
                    )
                }

                const roster = new Set(
                    doc.detail.records.map(
                        (row) => String(row.student_subject_id),
                    ),
                )

                const sequence = ++doc.counter

                for (const { id, values } of edits) {
                    if (!roster.has(String(id))) {
                        throw new Error(
                            'Student is not in this meeting roster.',
                        )
                    }

                    const patch = doc.patches[String(id)] ||= {}

                    for (const field of fields) {
                        if (Object.hasOwn(values, field)) {
                            patch[field] = {
                                value: valueOf(values, field),
                                sequence,
                            }
                        }
                    }
                }

                compact(doc)

                doc.dueAt = Date.now() + 600

                return doc
            })
        },

        prepare(key) {
            return change(key, (doc) => {
                if (
                    !doc ||
                    doc.blocked ||
                    Date.now() < Math.max(doc.dueAt, doc.retryAt)
                ) {
                    return
                }

                // Reuse the exact request after a failed attempt.
                if (doc.flight) return

                compact(doc)

                const ids = Object.keys(doc.patches).slice(0, 2000)
                if (!ids.length) return

                const rows = new Map(
                    documentRows(doc).map((row) => [
                        String(row.student_subject_id),
                        row,
                    ]),
                )

                doc.flight = {
                    sequences: Object.fromEntries(
                        ids.map((id) => [
                            id,
                            structuredClone(doc.patches[id]),
                        ]),
                    ),
                    payload: {
                        actor_id: doc.userId,
                        request_id: uuid(),
                        version: doc.detail.session.lock_version,
                        records: ids.map((id) => ({
                            student_subject_id: id,
                            status: rows.get(id).status,
                            remarks: rows.get(id).remarks || null,
                        })),
                    },
                }

                return doc
            })
        },

        acknowledge(key, requestId, detail) {
            return change(key, (doc) => {
                if (doc?.flight?.payload.request_id !== requestId) {
                    return
                }

                for (
                    const [id, sent]
                    of Object.entries(doc.flight.sequences)
                ) {
                    for (
                        const [field, cell]
                        of Object.entries(sent)
                    ) {
                        if (
                            doc.patches[id]?.[field]?.sequence ===
                            cell.sequence
                        ) {
                            delete doc.patches[id][field]
                        }
                    }

                    if (
                        doc.patches[id] &&
                        !Object.keys(doc.patches[id]).length
                    ) {
                        delete doc.patches[id]
                    }
                }

                doc.detail = detail
                doc.flight = null
                doc.blocked = null
                doc.attempts = 0
                doc.retryAt = 0
                doc.savedAt = Date.now()

                compact(doc)

                return doc
            })
        },

        fail(key, requestId, status, message) {
            return change(key, (doc) => {
                if (doc?.flight?.payload.request_id !== requestId) {
                    return
                }

                if (
                    !status ||
                    status >= 500 ||
                    status === 408 ||
                    status === 429
                ) {
                    doc.attempts += 1

                    doc.retryAt = Date.now() + Math.min(
                        30000,
                        1000 * 2 ** Math.min(doc.attempts, 5),
                    )
                } else {
                    doc.blocked = { status, message }
                }

                return doc
            })
        },

        retry(key) {
            return change(key, (doc) => {
                if ([409, 423].includes(doc.blocked?.status)) {
                    throw new Error('Review these changes first.')
                }

                doc.blocked = null
                doc.retryAt = 0
                doc.dueAt = 0

                return doc
            })
        },

        resolve(key, detail, revision, keep) {
            return change(key, (doc) => {
                if (doc.revision !== revision) {
                    throw new Error(
                        'The local draft changed. Review it again.',
                    )
                }

                if (
                    keep &&
                    (
                        detail.session.locked_at ||
                        detail.session.status !== 'open'
                    )
                ) {
                    throw new Error(
                        'This meeting cannot accept changes.',
                    )
                }

                doc.detail = detail
                doc.flight = null

                if (!keep) doc.patches = {}

                doc.blocked = null
                doc.retryAt = 0
                doc.dueAt = 0
                doc.attempts = 0

                compact(doc)

                return doc
            })
        },
    }
}

export const attendanceStore = createAttendanceStore()