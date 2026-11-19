import React, { useEffect, useId, useRef, useState } from 'react'
import axios from 'axios'
import { usePage } from '@inertiajs/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Megaphone } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/Components/ui/avatar'
import { Button } from '@/Components/ui/button'
import { Skeleton } from '@/Components/ui/skeleton'

import { GuideButton, useGuide } from '../Shared/GuideTour'
import { announcementsGuide } from '../Shared/guides'
import { ErrorNotice, errorMessage, useClasswork, useClassworkInfiniteQuery } from '../Shared/api'
import AnnouncementCard from './AnnouncementCard'
import Composer from './Composer'
import { initials } from './format'

// How long Undo stays on screen before a deletion goes through.
const UNDO_MS = 6000

function FeedSkeleton() {
    return (
        <div role="status" aria-label="Loading announcements" className="space-y-4">
            {[0, 1].map((index) => (
                <div key={index} className="space-y-4 rounded-xl border border-border p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                        <Skeleton className="size-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-40" />
                            <Skeleton className="h-3 w-28" />
                        </div>
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                </div>
            ))}
        </div>
    )
}

function EmptyFeed({ manage }) {
    return (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <span className="rounded-full bg-muted p-3 text-muted-foreground">
                <Megaphone className="size-6" aria-hidden="true" />
            </span>
            <div className="space-y-1">
                <p className="font-medium text-foreground">No announcements yet</p>
                <p className="text-sm text-muted-foreground">
                    {manage
                        ? 'Post updates, reminders and files for your class. Students see them on their class page.'
                        : 'Announcements from your instructor will show up here.'}
                </p>
            </div>
        </div>
    )
}

// The post a notification link points at (?post=12), opened once.
function linkedPost() {
    const id = Number(new URLSearchParams(window.location.search).get('post'))
    return Number.isInteger(id) && id > 0 ? id : null
}

/**
 * A class's announcements, newest first, in pages. Teachers write and
 * manage them; students read and comment, and posts they haven't seen are
 * marked new for this visit.
 */
export default function AnnouncementFeed() {
    const { base, key } = useClasswork()
    const { auth } = usePage().props
    const client = useQueryClient()
    const headingId = useId()

    const query = useClassworkInfiniteQuery('announcements', {
        getNextPageParam: (last) => last.next_cursor ? { before: last.next_cursor } : undefined,
    })

    const pages = query.data?.pages ?? []
    const manage = Boolean(pages[0]?.can_manage)

    const [composing, setComposing] = useState(false)
    const [hidden, setHidden] = useState(() => new Set())
    const [highlight, setHighlight] = useState(linkedPost)
    const [linked] = useState(linkedPost)
    const [newIds, setNewIds] = useState(() => new Set())
    const pendingDeletes = useRef(new Map())

    // The link is used once; switching tabs later shouldn't jump back to it.
    useEffect(() => {
        const url = new URL(window.location.href)

        if (url.searchParams.has('post')) {
            url.searchParams.delete('post')
            window.history.replaceState(window.history.state, '', url)
        }
    }, [])

    // Pages are cut by time, so a post can't repeat; this is a safeguard.
    const seen = new Set()
    const items = pages
        .flatMap((page) => page.items)
        .filter((post) => !hidden.has(post.id) && !seen.has(post.id) && seen.add(post.id))

    // Unseen posts stay marked "New" for this visit, then count as seen.
    const unreadIds = items.filter((post) => post.unread).map((post) => post.id).join(',')

    const markRead = useMutation({
        mutationFn: () => axios.post(`${base}/announcements/read`),
        onSuccess: () => Promise.all([
            client.invalidateQueries({ queryKey: ['notifications'] }),
            client.invalidateQueries({ queryKey: [...key, 'announcements/unread'] }),
        ]),
    })

    useEffect(() => {
        if (!query.isSuccess) return

        if (unreadIds) {
            setNewIds((current) => new Set([...current, ...unreadIds.split(',').map(Number)]))
        }

        // Teachers clear their comment notifications for this class too.
        if (unreadIds || manage) markRead.mutate()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query.isSuccess, unreadIds, manage])

    // Bring a linked or just-posted announcement into view, briefly outlined.
    useEffect(() => {
        if (!highlight || !query.isSuccess) return undefined

        const element = document.getElementById(`announcement-${highlight}`)
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' })

        const timer = window.setTimeout(() => setHighlight(null), 2500)
        return () => window.clearTimeout(timer)
    }, [highlight, query.isSuccess])

    // A deletion waits for Undo; leaving the page sends the pending ones.
    function finishDelete(post) {
        const entry = pendingDeletes.current.get(post.id)
        if (!entry || entry.done) return

        entry.done = true
        pendingDeletes.current.delete(post.id)

        axios.delete(`${base}/announcements/${post.id}`)
            .then((response) => {
                if (response.data?.files_not_trashed > 0) {
                    toast.warning(`${response.data.files_not_trashed} file(s) could not be moved to the Drive trash.`, {
                        description: 'Remove them from Google Drive manually if needed.',
                    })
                }
            })
            .catch((error) => {
                setHidden((current) => {
                    const next = new Set(current)
                    next.delete(post.id)
                    return next
                })
                toast.error('The announcement wasn’t deleted', { description: errorMessage(error) })
            })
            .finally(() => client.invalidateQueries({ queryKey: key }))
    }

    function deleteWithUndo(post) {
        setHidden((current) => new Set(current).add(post.id))
        pendingDeletes.current.set(post.id, { done: false })

        toast('Announcement deleted', {
            description: post.files?.length ? 'Its files go to the Google Drive trash.' : undefined,
            duration: UNDO_MS,
            action: {
                label: 'Undo',
                onClick: () => {
                    pendingDeletes.current.delete(post.id)
                    setHidden((current) => {
                        const next = new Set(current)
                        next.delete(post.id)
                        return next
                    })
                },
            },
            onAutoClose: () => finishDelete(post),
            onDismiss: () => finishDelete(post),
        })
    }

    useEffect(() => () => {
        for (const [id] of pendingDeletes.current) finishDelete({ id })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Teachers get a short tour the first time they open the tab.
    const guide = useGuide({
        guide: 'announcements',
        steps: announcementsGuide,
        ready: manage && query.isSuccess && !composing,
    })

    return (
        <section aria-labelledby={headingId} className="mx-auto w-full min-w-0 max-w-3xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                    <h2 id={headingId} className="text-lg font-semibold text-foreground">Announcements</h2>
                    <p className="text-sm text-muted-foreground">
                        {manage ? 'Updates, reminders and files for the whole class.' : 'Updates from your instructor.'}
                    </p>
                </div>

                {manage && <GuideButton onClick={guide.start} data-tour="guide-announcements" className="ml-auto" />}
            </div>

            {manage && (composing ? (
                <div className="rounded-xl border bg-card p-4 shadow-sm sm:p-5" data-tour="announce-composer">
                    <Composer
                        onDone={(id) => {
                            setComposing(false)
                            setHighlight(id)
                        }}
                        onCancel={() => setComposing(false)}
                    />
                </div>
            ) : (
                <button
                    type="button"
                    onClick={() => setComposing(true)}
                    data-tour="announce-composer"
                    className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:p-4"
                >
                    <Avatar className="size-10">
                        <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                            {initials(auth.user)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 text-sm text-muted-foreground">Announce something to your class…</span>
                    <Megaphone className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </button>
            ))}

            <ErrorNotice error={query.error} />

            {query.isError && (
                <Button variant="outline" onClick={() => query.refetch()}>Try again</Button>
            )}

            {query.isPending && <FeedSkeleton />}

            {query.isSuccess && items.length === 0 && <EmptyFeed manage={manage} />}

            {items.length > 0 && (
                <ol className="space-y-4" aria-label="Announcements, newest first">
                    {items.map((post, index) => (
                        <li key={post.id}>
                            <AnnouncementCard
                                post={post}
                                manage={manage}
                                isNew={!manage && newIds.has(post.id)}
                                highlighted={highlight === post.id}
                                startCommentsOpen={linked === post.id}
                                onDelete={() => deleteWithUndo(post)}
                                tourActions={index === 0}
                            />
                        </li>
                    ))}
                </ol>
            )}

            {query.hasNextPage && (
                <div className="flex justify-center">
                    <Button type="button" variant="outline" disabled={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>
                        {query.isFetchingNextPage ? 'Loading…' : 'Show older announcements'}
                    </Button>
                </div>
            )}

            {guide.tour}
        </section>
    )
}
