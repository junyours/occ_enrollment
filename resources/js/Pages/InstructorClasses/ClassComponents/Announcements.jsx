import React from 'react'
import { usePage } from '@inertiajs/react'
import { ChevronRight, Megaphone } from 'lucide-react'

import AnnouncementFeed from './Classwork/Announcements/AnnouncementFeed'
import { ClassworkProvider, useClassworkQuery } from './Classwork/Shared/api'
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert'
import { Info } from 'lucide-react'

function ClassProvider({ classId, children }) {
    const { auth } = usePage().props

    return (
        <ClassworkProvider key={`${auth.user.id}:${classId}`} userId={auth.user.id} classId={classId}>
            {children}
        </ClassworkProvider>
    )
}

// A class's announcements: its teacher posts and manages them, enrolled
// students read and comment. The server decides who can do what.
export default function Announcements({ classId }) {
    return (
        <ClassProvider classId={classId}>
            <AnnouncementFeed />
        </ClassProvider>
    )
}

// Posts in this class the signed-in user hasn't seen, from their notifications.
function useUnreadCount() {
    return useClassworkQuery('announcements/unread', { staleTime: 30_000 }).data?.count ?? 0
}

function UnseenCount() {
    const count = useUnreadCount()
    if (!count) return null

    return (
        <span className="ml-1 inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold tabular-nums leading-5 text-primary-foreground">
            <span aria-hidden="true">{count > 9 ? '9+' : count}</span>
            <span className="sr-only">, {count} new</span>
        </span>
    )
}

// For a student's tab label: how many announcements are new to them.
export function NewAnnouncementsCount({ classId }) {
    return (
        <ClassProvider classId={classId}>
            <UnseenCount />
        </ClassProvider>
    )
}

function Banner({ onOpen }) {
    const count = useUnreadCount()
    if (!count) return null

    return (
        <button
            type="button"
            onClick={onOpen}
            className="flex w-full items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-left transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Megaphone className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-foreground">
                    {count === 1 ? 'New announcement' : `${count} new announcements`} from your instructor
                </span>
            </span>
            <span className="flex shrink-0 items-center gap-1 text-sm font-medium text-primary">
                View <ChevronRight className="size-4" aria-hidden="true" />
            </span>
        </button>
    )
}

// For a student's Classwork tab: a line that opens the new announcements.
export function NewAnnouncementsBanner({ classId, onOpen }) {
    return (
        <ClassProvider classId={classId}>
            <Banner onOpen={onOpen} />
        </ClassProvider>
    )
}
