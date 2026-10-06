import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'

import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'

import { attendanceApi, apiError } from './attendanceApi'

import {
    attendanceStore,
    documentKey,
    documentRows,
    hasPending,
} from './attendanceStore'

import {
    schoolToday,
    sessionCounts,
    summarize,
} from './attendanceUtils'

import {
    useAttendanceOnline,
    useAttendanceSync,
} from './AttendanceSyncProvider'

export default function useAttendance({ classId, period = 'all' }) {
    const sync = useAttendanceSync()
    const userId = sync.userId
    const online = useAttendanceOnline()
    const client = useQueryClient()

    const [selectedId, setSelectedId] = useState(null)
    const [error, setError] = useState('')
    const [echo, setEcho] = useState({})
    const [writing, setWriting] = useState(0)
    const [writeError, setWriteError] = useState('')
    const [review, setReview] = useState(null)

    const ticket = useRef(0)
    const scope = useRef('')

    const scopeKey = `${userId}:${classId}:${period}`
    scope.current = scopeKey

    const localKey = useMemo(
        () => ['attendance-local', userId, String(classId)],
        [userId, classId],
    )

    const local = useQuery({
        queryKey: localKey,
        queryFn: () => attendanceStore.classData(userId, classId),
        networkMode: 'always',
        retry: false,
        enabled: Boolean(userId && classId),
    })

    useEffect(() => attendanceStore.subscribe((id) => {
        if (id === userId) {
            void client.invalidateQueries({
                queryKey: localKey,
            })
        }
    }), [userId, client, localKey])

    useEffect(() => {
        setSelectedId(null)
        setEcho({})
        setReview(null)
        setError('')
        setWriteError('')
        setWriting(0)
    }, [scopeKey])

    const list = useQuery({
        queryKey: [
            'attendance-list',
            userId,
            String(classId),
            period,
        ],
        enabled: Boolean(userId && classId),
        networkMode: 'online',
        retry: false,

        queryFn: async ({ signal }) => {
            const result = await attendanceApi.list(
                classId,
                period,
                signal,
            )

            await attendanceStore.cacheList(
                userId,
                classId,
                period,
                result,
            )

            return result
        },
    })

    useEffect(() => {
        if (online && userId && classId) {
            void client.invalidateQueries({
                queryKey: [
                    'attendance-list',
                    userId,
                    String(classId),
                ],
            })

            void client.invalidateQueries({
                queryKey: [
                    'attendance-detail',
                    userId,
                    String(classId),
                ],
            })
        }
    }, [online, userId, classId, client])

    const cachedListing = useMemo(() => {
        const savedLists = local.data?.lists || []

        const exact = savedLists.find(
            (item) => item.period === period
        )?.data

        if (exact || period !== 'all' || !savedLists.length) {
            return exact
        }

        // Reuse cached lists from the previous screen.
        return {
            ...savedLists[0].data,
            sessions: savedLists.flatMap(
                (item) => item.data.sessions || []
            ),
        }
    }, [local.data?.lists, period])

    const listing = list.data || cachedListing

    const today = schoolToday()
    const docs = local.data?.docs || []

    const sessions = useMemo(() => {
        const found = new Map(
            (listing?.sessions || []).map((session) => [
                String(session.id),
                session,
            ]),
        )

        for (const doc of docs) {
            if (period === 'all' || doc.detail.session.period === period) continue

            const known = found.get(
                String(doc.detail.session.id),
            )

            if (
                !known ||
                hasPending(doc) ||
                Number(doc.detail.session.lock_version) >=
                Number(known.lock_version)
            ) {
                found.set(String(doc.detail.session.id), {
                    ...sessionCounts(
                        doc.detail.session,
                        documentRows(doc),
                    ),
                    pending_sync: hasPending(doc),
                })
            }
        }

        return [...found.values()].sort(
            (a, b) =>
                a.attendance_date.localeCompare(b.attendance_date) ||
                a.session_number - b.session_number,
        )
    }, [listing, docs, period])

    const defaultSession =
        sessions
            .filter((session) =>
                session.attendance_date <= today &&
                session.status !== 'cancelled',
            )
            .at(-1) ||
        sessions[0]

    const selected =
        sessions.find(
            (session) => String(session.id) === String(selectedId),
        ) ||
        defaultSession

    const key = selected
        ? documentKey(userId, classId, selected.id)
        : null

    const doc = docs.find((item) => item.key === key)

    const detailQuery = useQuery({
        queryKey: [
            'attendance-detail',
            userId,
            String(classId),
            String(selected?.id),
        ],
        enabled: Boolean(userId && classId && selected),
        networkMode: 'online',
        retry: false,

        queryFn: async ({ signal }) => {
            const detail = await attendanceApi.show(
                classId,
                selected.id,
                signal,
            )

            await attendanceStore.ingest(
                userId,
                classId,
                detail,
            )

            return detail
        },
    })

    const rows = documentRows(doc).map((row) => ({
        ...row,
        ...Object.fromEntries(
            Object.entries(
                echo[`${key}:${row.student_subject_id}`] || {},
            ).map(([field, cell]) => [field, cell.value]),
        ),
    }))

    const session = doc?.detail.session || selected
    const stats = summarize(rows)
    const pending = hasPending(doc) || writing > 0
    const exportPending =
        docs.some(hasPending) ||
        writing > 0 ||
        Boolean(writeError || sync.storageError || local.error)

    const locked = Boolean(
        session?.locked_at ||
        doc?.blocked?.status === 423,
    )

    const action = useMutation({
        mutationKey: ['attendance-action', userId],
        networkMode: 'always',
        retry: false,

        mutationFn: async ({ kind, values }) => {
            if (!online) {
                throw new Error(
                    'Connect to the internet to manage meetings.',
                )
            }

            if (kind === 'create') {
                return attendanceApi.create(
                    classId,
                    values,
                    userId,
                )
            }

            const fresh = await attendanceStore.get(key)

            if (writing || hasPending(fresh)) {
                throw new Error(
                    'Wait for pending attendance changes to sync first.',
                )
            }

            return attendanceApi.action(
                classId,
                session.id,
                kind,
                fresh?.detail.session.lock_version ??
                session.lock_version,
                userId,
                values?.status,
            )
        },

        onSuccess: async (detail) => {
            await attendanceStore.ingest(
                userId,
                classId,
                detail,
            )

            await client.invalidateQueries({
                queryKey: [
                    'attendance-list',
                    userId,
                    String(classId),
                ],
            })

            setSelectedId(detail.session.id)
        },
    })

    const editable = Boolean(
        doc &&
        session.roster_initialized_at &&
        session.status === 'open' &&
        !locked &&
        !action.isPending &&
        !sync.storageError &&
        !writeError
    )

    function cacheDoc(next) {
        client.setQueryData(localKey, (old) => ({
            lists: old?.lists || [],
            docs: [
                ...(old?.docs || []).filter(
                    (item) => item.key !== next.key,
                ),
                next,
            ],
        }))
    }

    async function patchMany(edits) {
        if (!editable) return false

        const started = scopeKey
        const token = ++ticket.current

        setWriting((value) => value + 1)

        setEcho((old) => {
            const next = { ...old }

            for (const edit of edits) {
                next[`${key}:${edit.id}`] = {
                    ...next[`${key}:${edit.id}`],
                    ...Object.fromEntries(
                        Object.entries(edit.values).map(
                            ([field, value]) => [
                                field,
                                { value, token },
                            ],
                        ),
                    ),
                }
            }

            return next
        })

        try {
            cacheDoc(
                await attendanceStore.patch(key, edits),
            )

            if (scope.current === started) {
                setEcho((old) => {
                    const next = structuredClone(old)

                    for (const edit of edits) {
                        for (const field of Object.keys(edit.values)) {
                            if (
                                next[`${key}:${edit.id}`]?.[field]?.token ===
                                token
                            ) {
                                delete next[`${key}:${edit.id}`][field]
                            }
                        }
                    }

                    return next
                })
            }

            return true
        } catch (failure) {
            if (scope.current === started) {
                setWriteError(
                    `Your latest edit could not be saved on this device: ${failure.message}. Keep this page open.`,
                )
            }

            return false
        } finally {
            if (scope.current === started) {
                setWriting((value) => Math.max(0, value - 1))
            }
        }
    }

    useEffect(() => {
        const shouldWarn =
            !online ||
            writing > 0 ||
            Boolean(writeError)

        if (!shouldWarn) return

        function handleBeforeUnload(event) {
            event.preventDefault()

            // The browser supplies the confirmation message.
            event.returnValue = true
        }

        window.addEventListener(
            'beforeunload',
            handleBeforeUnload
        )

        return () => {
            window.removeEventListener(
                'beforeunload',
                handleBeforeUnload
            )
        }
    }, [online, writing, writeError])

    async function manage(kind, values) {
        setError('')

        try {
            await action.mutateAsync({ kind, values })
            return true
        } catch (failure) {
            setError(apiError(failure))
            return false
        }
    }

    async function openReview() {
        setError('')

        try {
            const latest = await attendanceApi.show(
                classId,
                session.id,
            )

            const fresh = await attendanceStore.get(key)

            setReview({
                latest,
                doc: fresh,
                rows: documentRows(fresh),
            })
        } catch (failure) {
            setError(apiError(failure))
        }
    }

    async function resolveReview(keep) {
        try {
            cacheDoc(
                await attendanceStore.resolve(
                    key,
                    review.latest,
                    review.doc.revision,
                    keep,
                ),
            )

            setReview(null)
            return true
        } catch (failure) {
            setError(apiError(failure))
            return false
        }
    }

    const syncLabel =
        writeError || sync.storageError
            ? 'Device storage error'
            : doc?.blocked
                ? 'Sync needs attention'
                : writing
                    ? 'Saving on device…'
                    : sync.activeKey === key
                        ? 'Syncing…'
                        : pending
                            ? online && !doc?.retryAt
                                ? 'Waiting to sync…'
                                : 'Saved on device · waiting to sync'
                            : doc?.savedAt
                                ? 'Synced'
                                : 'Up to date'

    async function exportData(date, exportPeriod = 'all') {
        const started = scopeKey
        const editTicket = ticket.current

        async function assertReady() {
            const latest = await attendanceStore.classData(
                userId,
                classId
            )

            if (scope.current !== started) {
                throw new Error(
                    'The class changed. Open Export again.'
                )
            }

            if (
                writing ||
                writeError ||
                sync.storageError ||
                ticket.current !== editTicket ||
                latest.docs.some(hasPending)
            ) {
                throw new Error(
                    'Wait for this class’s pending changes to sync, then export again.'
                )
            }
        }

        if (!online) {
            throw new Error(
                'Connect to the internet to export saved attendance.'
            )
        }

        await assertReady()

        const result = await client.fetchQuery({
            queryKey: [
                'attendance-export',
                userId,
                String(classId),
                date || 'all',
                exportPeriod,
            ],
            queryFn: ({ signal }) =>
                attendanceApi.exportData(
                    classId,
                    date,
                    exportPeriod,
                    signal
                ),
            staleTime: 0,
            gcTime: 0,
            retry: false,
        })

        await assertReady()

        if (
            String(result.class_id) !== String(classId) ||
            String(result.actor_id) !== String(userId)
        ) {
            throw new Error(
                'The signed-in account or class changed. Reload before exporting.'
            )
        }

        if ((result.period ?? 'all') !== exportPeriod) {
            throw new Error(
                'The export returned a different grading period. Check the export endpoint.'
            )
        }

        return result
    }

    return {
        sessions,
        session,
        rows,
        stats,
        today,
        online,
        pending,
        locked,
        editable,
        writing,
        writeError,
        exportData,
        exportPending,

        error:
            error ||
            writeError ||
            sync.storageError ||
            (local.error ? 'Device storage is unavailable.' : '') ||
            (
                online && (list.error || detailQuery.error)
                    ? apiError(list.error || detailQuery.error)
                    : ''
            ),

        scheduleDay: listing?.schedule_day || '',

        loading:
            local.isPending ||
            (!listing && list.isFetching) ||
            (selected && !doc && detailQuery.isFetching),

        unavailableOffline: Boolean(
            !online && selected && !doc,
        ),

        busy: action.isPending,
        syncLabel,
        blocked: doc?.blocked,
        review,

        selectSession: (id) => {
            if (!writing && !writeError) {
                setSelectedId(id)
                setReview(null)
                setError('')
            }
        },

        canNavigate: !writing && !writeError,

        patch: (id, values) =>
            patchMany([{ id, values }]),

        patchMany,

        create: (values) => manage('create', values),
        start: () => manage('start'),

        setStatus: (status) =>
            manage('status', { status }),

        lock: () => manage('lock'),

        refresh: () => {
            void list.refetch()
            if (selected) void detailQuery.refetch()
        },

        retry: async () => {
            try {
                await attendanceStore.retry(key)
            } catch (failure) {
                setError(failure.message)
            }
        },

        retryStorage: sync.retryStorage,
        openReview,
        resolveReview,
        closeReview: () => setReview(null),
    }
}