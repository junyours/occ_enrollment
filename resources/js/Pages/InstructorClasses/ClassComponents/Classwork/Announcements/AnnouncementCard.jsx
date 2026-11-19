import React, { useEffect, useId, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import {
    CalendarClock,
    Eye,
    MessageSquare,
    MessageSquareOff,
    MoreVertical,
    Pencil,
    Pin,
    PinOff,
    Send,
    Trash2,
} from 'lucide-react'

import { Avatar, AvatarFallback } from '@/Components/ui/avatar'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/Components/ui/dialog'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu'
import { cn } from '@/Lib/Utils'

import Files from '../Shared/Files'
import RichTextContent from '../Shared/RichTextContent'
import { ErrorNotice, formatDateTime, useClassworkMutation, useClassworkQuery } from '../Shared/api'
import Comments from './Comments'
import Composer from './Composer'
import { initials, personName, whenPosted } from './format'

const BADGE = 'h-5 gap-1 rounded-md px-1.5 text-[11px] font-medium'

/** Long posts start folded to about ten lines, with Show more. */
function Body({ html }) {
    const box = useRef(null)
    const bodyId = useId()
    const [expanded, setExpanded] = useState(false)
    const [overflowing, setOverflowing] = useState(false)

    useEffect(() => {
        const element = box.current
        if (!element || expanded) return undefined

        const measure = () => setOverflowing(element.scrollHeight > element.clientHeight + 4)
        measure()

        const observer = new ResizeObserver(measure)
        observer.observe(element)
        return () => observer.disconnect()
    }, [html, expanded])

    return (
        <div className="space-y-1">
            <div ref={box} id={bodyId} className={cn('relative', !expanded && 'max-h-64 overflow-hidden')}>
                <RichTextContent value={html} format="html" />
                {!expanded && overflowing && (
                    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card to-transparent" />
                )}
            </div>
            {overflowing && (
                <Button type="button" variant="link" size="sm" className="h-auto p-0 text-sm"
                    aria-expanded={expanded} aria-controls={bodyId} onClick={() => setExpanded((value) => !value)}>
                    {expanded ? 'Show less' : 'Show more'}
                </Button>
            )}
        </div>
    )
}

/** Which students have seen a post: names, for its teacher. */
function SeenBy({ post, open, onOpenChange }) {
    const query = useClassworkQuery(`announcements/${post.id}/seen`, { enabled: open, staleTime: 0 })
    const seen = query.data?.seen ?? []
    const notSeen = query.data?.not_seen ?? []

    const section = (title, people) => (
        <section className="space-y-1.5">
            <h3 className="text-sm font-semibold">{title} <span className="font-normal text-muted-foreground">({people.length})</span></h3>
            {people.length > 0 ? (
                <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
                    {people.map((person, index) => <li key={`${person.name}-${index}`}>{person.name}</li>)}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground">No one yet.</p>
            )}
        </section>
    )

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl">
                <DialogHeader>
                    <DialogTitle>Seen by {post.seen?.seen ?? 0} of {post.seen?.total ?? 0}</DialogTitle>
                    <DialogDescription>
                        A student has seen it once they open the class’s announcements or the notification.
                    </DialogDescription>
                </DialogHeader>
                {query.isPending && <p role="status" className="text-sm text-muted-foreground">Loading…</p>}
                <ErrorNotice error={query.error} />
                {query.isSuccess && (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {section('Seen', seen)}
                        {section('Not yet', notSeen)}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}

/**
 * One announcement. Teachers edit it in place and use its menu to pin it,
 * turn comments off or delete it (the feed offers an undo); unposted ones
 * show when they go out, with Post now.
 */
export default function AnnouncementCard({
    post,
    manage,
    isNew = false,
    highlighted = false,
    onDelete,
    tourActions = false,
    startCommentsOpen = false,
}) {
    const [editing, setEditing] = useState(false)
    const [seenOpen, setSeenOpen] = useState(false)
    const headingId = useId()
    const name = personName(post.author)

    const draft = !post.published && !post.scheduled_at
    const scheduled = !post.published && Boolean(post.scheduled_at)
    const when = post.published
        ? whenPosted(post.posted_at)
        : scheduled ? formatDateTime(post.scheduled_at) : whenPosted(post.created_at)
    const label = `the post from ${post.published ? when : scheduled ? `scheduled for ${when}` : 'your drafts'}`

    const change = useClassworkMutation(
        (values, url) => axios.patch(`${url}/announcements/${post.id}`, values),
        (_, values) => {
            if ('published' in values) toast.success('Announcement posted')
            else if ('pinned' in values) toast.success(values.pinned ? 'Pinned to the top' : 'Unpinned')
            else if ('comments_enabled' in values) toast.success(values.comments_enabled ? 'Comments turned on' : 'Comments turned off')
        }
    )

    return (
        <article
            id={`announcement-${post.id}`}
            aria-labelledby={headingId}
            className={cn(
                'min-w-0 scroll-mt-20 rounded-xl border bg-card text-card-foreground shadow-sm transition-shadow duration-500',
                !post.published && 'border-dashed bg-muted/20',
                highlighted && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
            )}
            data-tour-item="announcement"
        >
            <header className="flex items-start gap-3 px-4 pt-4 sm:px-5 sm:pt-5">
                <Avatar className="size-10">
                    <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                        {initials(post.author)}
                    </AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <h3 id={headingId} className="min-w-0 break-words text-sm font-semibold text-foreground">
                            {name}
                            <span className="sr-only">, {post.published ? when : scheduled ? `scheduled for ${when}` : 'draft'}</span>
                        </h3>
                        {post.pinned && (
                            <Badge variant="secondary" className={cn(BADGE, 'border border-border')}>
                                <Pin className="size-3" aria-hidden="true" /> Pinned
                            </Badge>
                        )}
                        {scheduled && (
                            <Badge variant="secondary" className={cn(BADGE, 'border border-border')}>
                                <CalendarClock className="size-3" aria-hidden="true" /> Scheduled
                            </Badge>
                        )}
                        {draft && (
                            <Badge variant="secondary" className={cn(BADGE, 'border border-border')}>Draft</Badge>
                        )}
                        {isNew && <Badge className={BADGE}>New</Badge>}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        {scheduled ? 'Posts ' : draft ? 'Saved ' : ''}
                        <time dateTime={(post.published ? post.posted_at : post.scheduled_at ?? post.created_at) ?? undefined}
                            title={formatDateTime(post.published ? post.posted_at : post.scheduled_at ?? post.created_at)}>
                            {when}
                        </time>
                        {post.edited_at && (
                            <span title={`Edited ${formatDateTime(post.edited_at)}`}> · Edited</span>
                        )}
                        {post.published && !post.comments_enabled && (
                            <span> · Comments off</span>
                        )}
                    </p>
                </div>

                {manage && !editing && (
                    <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                            <Button type="button" variant="ghost" size="icon"
                                className="-mr-2 -mt-1 size-9 shrink-0 text-muted-foreground hover:text-foreground"
                                aria-label={`Actions for ${label}`}
                                data-tour={tourActions ? 'announcement-actions' : undefined}>
                                <MoreVertical className="size-4" aria-hidden="true" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuItem onSelect={() => setEditing(true)}>
                                <Pencil className="size-4" aria-hidden="true" /> Edit
                            </DropdownMenuItem>
                            {post.published && (
                                <DropdownMenuItem disabled={change.isPending} onSelect={() => change.mutate({ pinned: !post.pinned })}>
                                    {post.pinned
                                        ? <><PinOff className="size-4" aria-hidden="true" /> Unpin</>
                                        : <><Pin className="size-4" aria-hidden="true" /> Pin to top</>}
                                </DropdownMenuItem>
                            )}
                            {post.published && (
                                <DropdownMenuItem disabled={change.isPending}
                                    onSelect={() => change.mutate({ comments_enabled: !post.comments_enabled })}>
                                    {post.comments_enabled
                                        ? <><MessageSquareOff className="size-4" aria-hidden="true" /> Turn off comments</>
                                        : <><MessageSquare className="size-4" aria-hidden="true" /> Turn on comments</>}
                                </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={onDelete} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                                <Trash2 className="size-4" aria-hidden="true" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </header>

            <div className="space-y-4 p-4 sm:px-5 sm:pb-5">
                {editing ? (
                    <Composer post={post} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />
                ) : (
                    <>
                        <Body html={post.body} />

                        <Files
                            kind="announcements"
                            id={post.id}
                            preloaded={post.files}
                            title={null}
                            compact
                            hideEmpty
                            thumbnails
                        />

                        {manage && !post.published && (
                            <div className="space-y-2">
                                <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-muted-foreground">
                                        {scheduled
                                            ? `Students see it on ${formatDateTime(post.scheduled_at)}.`
                                            : 'Not posted yet. Students can’t see it.'}
                                    </p>
                                    <Button type="button" size="sm" className="gap-2" disabled={change.isPending}
                                        onClick={() => change.mutate({ published: true })}>
                                        <Send className="size-4" aria-hidden="true" />
                                        {change.isPending ? 'Posting…' : 'Post now'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {manage && post.published && post.seen?.total > 0 && (
                            <Button type="button" variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5 px-2 text-muted-foreground"
                                onClick={() => setSeenOpen(true)}>
                                <Eye className="size-4" aria-hidden="true" />
                                Seen by {post.seen.seen} of {post.seen.total}
                                <span className="sr-only"> students: {label}</span>
                            </Button>
                        )}

                        <ErrorNotice error={change.error} />
                    </>
                )}
            </div>

            {post.published && !editing && (
                <Comments post={post} manage={manage} startOpen={startCommentsOpen} label={label} />
            )}

            {manage && post.published && (
                <SeenBy post={post} open={seenOpen} onOpenChange={setSeenOpen} />
            )}
        </article>
    )
}
