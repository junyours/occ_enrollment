import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { usePage } from '@inertiajs/react'
import axios from 'axios'

// Things a user sees once, like a guide ("guide:announcements") or a "New"
// label ("tab:classwork"). They are saved to the user's account, so they
// stay hidden on every device; the list comes with the page as
// auth.user.seen. The browser keeps a copy too, so an item hides at once
// and still hides if saving fails or the server can't save yet.

const marked = new Set()
const listeners = new Set()
const synced = new Set()
let version = 0

function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
}

function storageKey(userId, key) {
    return `seen:v1:${userId}:${key}`
}

// Where guides were remembered before they were saved to accounts.
function legacyStorageKey(userId, key) {
    return key.startsWith('guide:') ? `classwork-guide:v1:${userId}:${key.slice(6)}` : null
}

function readStorage(name) {
    try {
        return window.localStorage.getItem(name)
    } catch {
        return null
    }
}

function rememberedHere(userId, key) {
    const legacy = legacyStorageKey(userId, key)
    return readStorage(storageKey(userId, key)) === '1' || (legacy !== null && readStorage(legacy) === 'done')
}

// Every item this browser remembers for the user, old guide keys included.
function itemsRememberedHere(userId) {
    const items = []

    try {
        for (let index = 0; index < window.localStorage.length; index++) {
            const name = window.localStorage.key(index) ?? ''
            const current = `seen:v1:${userId}:`
            const legacy = `classwork-guide:v1:${userId}:`

            if (name.startsWith(current) && window.localStorage.getItem(name) === '1') {
                items.push(name.slice(current.length))
            } else if (name.startsWith(legacy) && window.localStorage.getItem(name) === 'done') {
                items.push(`guide:${name.slice(legacy.length)}`)
            }
        }
    } catch {
        // Storage blocked: nothing to bring over.
    }

    return items
}

function saveToAccount(key) {
    return axios.post('/seen-items', { key }).catch(() => {
        // Not saved to the account; this browser still remembers it.
    })
}

/** { hasSeen(key), markSeen(key) } for the signed-in user. */
export function useSeenItems() {
    const { auth } = usePage().props
    const userId = auth?.user?.id
    // Null when the server can't save yet (table not migrated).
    const account = Array.isArray(auth?.user?.seen) ? auth.user.seen : null

    useSyncExternalStore(subscribe, () => version, () => version)

    // Items seen in this browser before they were saved to the account are
    // saved once, so the user's other devices hide them too.
    useEffect(() => {
        if (!userId || !account || synced.has(userId)) return

        synced.add(userId)

        for (const key of itemsRememberedHere(userId)) {
            if (!account.includes(key)) void saveToAccount(key)
        }
    }, [userId, account])

    const hasSeen = useCallback((key) => Boolean(
        userId && (
            marked.has(`${userId}|${key}`)
            || account?.includes(key)
            || rememberedHere(userId, key)
        )
    ), [userId, account])

    const markSeen = useCallback((key) => {
        if (!userId || marked.has(`${userId}|${key}`)) return

        marked.add(`${userId}|${key}`)
        version++
        listeners.forEach((listener) => listener())

        try {
            window.localStorage.setItem(storageKey(userId, key), '1')
        } catch {
            // Private mode or blocked storage: the account copy still counts.
        }

        if (account && !account.includes(key)) void saveToAccount(key)
    }, [userId, account])

    return { hasSeen, markSeen }
}
