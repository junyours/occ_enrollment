import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    useSyncExternalStore,
} from 'react'

import {
    onlineManager,
    useMutation,
    useQueryClient,
} from '@tanstack/react-query'

import { attendanceApi, apiError } from './attendanceApi'
import { attendanceStore, hasPending } from './attendanceStore'

const Context = createContext(null)

const connected = () =>
    typeof navigator === 'undefined' ||
    (
        navigator.onLine !== false &&
        onlineManager.isOnline()
    )

function subscribeOnline(callback) {
    const unsubscribe = onlineManager.subscribe(callback)

    window.addEventListener('online', callback)
    window.addEventListener('offline', callback)

    return () => {
        unsubscribe()
        window.removeEventListener('online', callback)
        window.removeEventListener('offline', callback)
    }
}

export const useAttendanceOnline = () =>
    useSyncExternalStore(
        subscribeOnline,
        connected,
        () => true,
    )

export function useAttendanceSync() {
    const value = useContext(Context)

    if (!value) {
        throw new Error(
            'Wrap your authenticated layout in AttendanceSyncProvider.',
        )
    }

    return value
}

export default function AttendanceSyncProvider({
    userId,
    children,
}) {
    return (
        <SyncRuntime
            key={String(userId || 'guest')}
            userId={userId}
        >
            {children}
        </SyncRuntime>
    )
}

function SyncRuntime({ userId, children }) {
    const client = useQueryClient()

    const [activeKey, setActiveKey] = useState(null)
    const [storageError, setStorageError] = useState('')
    const [restart, setRestart] = useState(0)

    const save = useMutation({
        mutationKey: ['attendance-sync', String(userId)],
        scope: { id: `attendance-sync:${userId}` },
        networkMode: 'always',
        retry: false,

        mutationFn: (doc) => attendanceApi.save(
            doc.classId,
            doc.detail.session.id,
            doc.flight.payload,
        ),
    })

    const mutate = save.mutateAsync

    useEffect(() => {
        if (!userId) return

        let stopped = false
        let running = false
        let halted = false
        let timer
        let nextDelay = 10000

        setStorageError('')

        const schedule = (delay = 1000) => {
            clearTimeout(timer)

            if (!stopped && !halted) {
                timer = setTimeout(pump, delay)
            }
        }

        async function sendOne() {
            const docs = await attendanceStore.all(userId)
            if (stopped) return

            const pending = docs
                .filter((doc) =>
                    hasPending(doc) &&
                    !doc.blocked &&
                    Date.now() >= Math.max(
                        doc.dueAt,
                        doc.retryAt,
                    ),
                )
                .sort((a, b) => a.dueAt - b.dueAt)[0]

            if (!pending) {
                const waiting = docs.filter(
                    (doc) => hasPending(doc) && !doc.blocked,
                )

                nextDelay = waiting.length
                    ? Math.max(
                        200,
                        Math.min(
                            ...waiting.map((doc) =>
                                Math.max(doc.dueAt, doc.retryAt) -
                                Date.now(),
                            ),
                        ),
                    )
                    : 30000

                return
            }

            nextDelay = 300

            const doc = await attendanceStore.prepare(pending.key)

            if (
                stopped ||
                !doc?.flight ||
                doc.blocked ||
                !connected()
            ) {
                return
            }

            setActiveKey(doc.key)

            let detail

            try {
                detail = await mutate(doc)
            } catch (error) {
                await attendanceStore.fail(
                    doc.key,
                    doc.flight.payload.request_id,
                    error.response?.status || 0,
                    apiError(error),
                )

                return
            }

            await attendanceStore.acknowledge(
                doc.key,
                doc.flight.payload.request_id,
                detail,
            )

            void client.invalidateQueries({
                queryKey: [
                    'attendance-list',
                    String(userId),
                    String(doc.classId),
                ],
            })
        }

        async function pump() {
            if (stopped || halted || running) return

            if (!connected()) {
                schedule()
                return
            }

            running = true

            try {
                if (navigator.locks) {
                    nextDelay = 1000

                    await navigator.locks.request(
                        `attendance-sync:${userId}`,
                        { ifAvailable: true },
                        async (lock) => {
                            if (lock && !stopped) {
                                await sendOne()
                            }
                        },
                    )
                } else {
                    await sendOne()
                }
            } catch (error) {
                halted = true

                if (!stopped) {
                    setStorageError(
                        `Device storage could not be updated: ${error.message}`,
                    )
                }
            } finally {
                running = false

                if (!stopped) setActiveKey(null)

                schedule(nextDelay)
            }
        }

        const wake = () => {
            if (!running) schedule(0)
        }

        const unsubscribe = attendanceStore.subscribe((id) => {
            if (id === String(userId)) wake()
        })

        window.addEventListener('online', wake)
        window.addEventListener('focus', wake)

        schedule(0)

        return () => {
            stopped = true
            clearTimeout(timer)
            unsubscribe()

            window.removeEventListener('online', wake)
            window.removeEventListener('focus', wake)
        }
    }, [userId, client, mutate, restart])

    const value = useMemo(() => ({
        userId: userId ? String(userId) : null,
        activeKey,
        storageError,
        retryStorage: () => setRestart((value) => value + 1),
    }), [userId, activeKey, storageError])

    return (
        <Context.Provider value={value}>
            {children}
        </Context.Provider>
    )
}