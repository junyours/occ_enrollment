import React, { useState } from 'react'
import axios from 'axios'
import { router } from '@inertiajs/react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    Bell,
    CheckCheck,
    ClipboardCheck,
    GraduationCap,
    Inbox,
    Info,
    Loader2,
    Megaphone,
    ShieldCheck,
} from 'lucide-react'

import { Button } from '@/Components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
import { cn } from '@/Lib/Utils'

// One icon per category, so a glance says what a notification is about.
const ICONS = {
    classes: Megaphone,
    grades: GraduationCap,
    enrollment: ClipboardCheck,
    requests: Inbox,
    account: ShieldCheck,
    system: Info,
}

// "now", "5m", "3h", "2d", then the date.
function timeAgo(value) {
    const date = new Date(value)
    const seconds = (Date.now() - date.getTime()) / 1000

    if (Number.isNaN(seconds)) return ''
    if (seconds < 60) return 'now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 7 * 86400) return `${Math.floor(seconds / 86400)}d`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * The bell in the header: unread notifications from every part of the
 * system. It checks for new ones every minute while the page is open.
 */
export default function NotificationBell() {
    const client = useQueryClient()
    const [open, setOpen] = useState(false)

    const counts = useQuery({
        queryKey: ['notifications', 'counts'],
        queryFn: async ({ signal }) => (await axios.get('/notifications/counts', { signal })).data,
        refetchInterval: 60_000,
        staleTime: 30_000,
        retry: false,
    })

    const list = useInfiniteQuery({
        queryKey: ['notifications', 'list'],
        queryFn: async ({ pageParam, signal }) => (
            await axios.get('/notifications', { params: { page: pageParam }, signal })
        ).data,
        initialPageParam: 1,
        getNextPageParam: (last) => last.next_page ?? undefined,
        enabled: open,
        staleTime: 0,
        retry: false,
    })

    const refresh = () => client.invalidateQueries({ queryKey: ['notifications'] })

    const readOne = useMutation({
        mutationFn: (id) => axios.post(`/notifications/${id}/read`),
        onSettled: refresh,
    })

    const readAll = useMutation({
        mutationFn: () => axios.post('/notifications/read-all'),
        onSettled: refresh,
    })

    const unread = counts.data?.unread ?? 0
    const items = list.data?.pages.flatMap((page) => page.items) ?? []

    function openItem(item) {
        if (!item.read) readOne.mutate(item.id)

        setOpen(false)

        if (item.url) router.visit(item.url)
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="relative size-9 shrink-0"
                    aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
                >
                    <Bell className="size-5" aria-hidden="true" />
                    {unread > 0 && (
                        <span
                            aria-hidden="true"
                            className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-white"
                        >
                            {unread > 9 ? '9+' : unread}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" sideOffset={8} className="w-[min(24rem,calc(100vw-1rem))] p-0">
                <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
                    <h2 className="text-sm font-semibold">Notifications</h2>
                    {unread > 0 && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 px-2 text-xs"
                            disabled={readAll.isPending}
                            onClick={() => readAll.mutate()}
                        >
                            <CheckCheck className="size-4" aria-hidden="true" />
                            Mark all as read
                        </Button>
                    )}
                </div>

                <div className="max-h-[min(28rem,70vh)] overflow-y-auto">
                    {list.isPending && (
                        <p role="status" className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            Loading…
                        </p>
                    )}

                    {list.isError && (
                        <div className="space-y-2 px-4 py-6 text-center">
                            <p className="text-sm text-muted-foreground">Notifications couldn’t load.</p>
                            <Button type="button" variant="outline" size="sm" onClick={() => list.refetch()}>Try again</Button>
                        </div>
                    )}

                    {list.isSuccess && items.length === 0 && (
                        <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                            <span className="rounded-full bg-muted p-3 text-muted-foreground">
                                <Bell className="size-5" aria-hidden="true" />
                            </span>
                            <p className="text-sm font-medium">You’re all caught up</p>
                            <p className="text-xs text-muted-foreground">New announcements and updates will show up here.</p>
                        </div>
                    )}

                    {items.length > 0 && (
                        <ul aria-label="Notifications" className="divide-y">
                            {items.map((item) => {
                                const Icon = ICONS[item.category] ?? Info

                                return (
                                    <li key={item.id}>
                                        <button
                                            type="button"
                                            onClick={() => openItem(item)}
                                            className={cn(
                                                'flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none',
                                                !item.read && 'bg-primary/[0.04]'
                                            )}
                                        >
                                            <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                                <Icon className="size-4" aria-hidden="true" />
                                            </span>

                                            <span className="min-w-0 flex-1">
                                                <span className="flex items-start gap-2">
                                                    <span className={cn('min-w-0 flex-1 break-words text-sm', item.read ? 'text-foreground' : 'font-semibold text-foreground')}>
                                                        {item.title}
                                                    </span>
                                                    <time dateTime={item.created_at} className="shrink-0 text-xs text-muted-foreground">
                                                        {timeAgo(item.created_at)}
                                                    </time>
                                                </span>
                                                {item.body && (
                                                    <span className="mt-0.5 line-clamp-2 break-words text-sm text-muted-foreground">
                                                        {item.body}
                                                    </span>
                                                )}
                                            </span>

                                            {!item.read && (
                                                <span className="mt-2 size-2 shrink-0 rounded-full bg-primary">
                                                    <span className="sr-only">Unread</span>
                                                </span>
                                            )}
                                        </button>
                                    </li>
                                )
                            })}
                        </ul>
                    )}

                    {list.hasNextPage && (
                        <div className="border-t p-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full"
                                disabled={list.isFetchingNextPage}
                                onClick={() => list.fetchNextPage()}
                            >
                                {list.isFetchingNextPage ? 'Loading…' : 'Show older'}
                            </Button>
                        </div>
                    )}
                </div>
            </PopoverContent>
        </Popover>
    )
}
