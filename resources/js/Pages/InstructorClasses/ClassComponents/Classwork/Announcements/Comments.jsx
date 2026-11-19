import React, { useId, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'sonner'
import { ChevronDown, Loader2, MessageSquare, SendHorizontal, Trash2 } from 'lucide-react'

import { Avatar, AvatarFallback } from '@/Components/ui/avatar'
import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { cn } from '@/Lib/Utils'

import { ErrorNotice, formatDateTime, useClassworkMutation, useClassworkQuery } from '../Shared/api'
import { initials, personName, whenPosted } from './format'

const MAX_LENGTH = 1000

function CommentItem({ comment, onDelete, deleting }) {
    const [confirming, setConfirming] = useState(false)
    const name = comment.author ? personName(comment.author) : 'Former member'

    return (
        <li className="flex gap-2.5">
            <Avatar className="size-8">
                <AvatarFallback className={cn('text-xs font-semibold', comment.is_teacher ? 'bg-primary/10 text-primary' : 'bg-muted')}>
                    {comment.author ? initials(comment.author) : '?'}
                </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                    <span className="font-medium text-foreground">{name}</span>
                    {comment.is_teacher && (
                        <Badge variant="secondary" className="h-4 rounded px-1 text-[10px] font-medium">Instructor</Badge>
                    )}
                    <time dateTime={comment.created_at} title={formatDateTime(comment.created_at)} className="text-xs text-muted-foreground">
                        {whenPosted(comment.created_at)}
                    </time>
                </p>
                <p className="whitespace-pre-wrap break-words text-sm text-foreground">{comment.body}</p>
            </div>

            {comment.can_delete && (confirming ? (
                <div className="flex shrink-0 items-start gap-1">
                    <Button type="button" variant="destructive" size="sm" className="h-7 px-2 text-xs" disabled={deleting}
                        onClick={() => onDelete(comment)}>
                        {deleting ? 'Deleting…' : 'Delete'}
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={deleting}
                        onClick={() => setConfirming(false)}>
                        Cancel
                    </Button>
                </div>
            ) : (
                <Button type="button" variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`Delete ${comment.mine ? 'your' : `${name}’s`} comment`} title="Delete comment"
                    onClick={() => setConfirming(true)}>
                    <Trash2 className="size-3.5" aria-hidden="true" />
                </Button>
            ))}
        </li>
    )
}

/**
 * Class comments under a posted announcement. The list loads when opened;
 * students can comment while comments are on, the teacher always can.
 */
export default function Comments({ post, manage, startOpen = false, label }) {
    const count = post.comments_count
    const [open, setOpen] = useState(startOpen && count > 0)
    const [text, setText] = useState('')
    const [removingId, setRemovingId] = useState(null)
    const listId = useId()
    const inputId = useId()
    const input = useRef(null)
    const canComment = manage || post.comments_enabled

    const query = useClassworkQuery(`announcements/${post.id}/comments`, { enabled: open && count > 0 })
    const items = query.data?.items ?? []

    const add = useClassworkMutation(
        (body, url) => axios.post(`${url}/announcements/${post.id}/comments`, { body }),
        () => {
            setText('')
            setOpen(true)
            if (input.current) input.current.style.height = ''
        }
    )

    const remove = useClassworkMutation(
        (comment, url) => axios.delete(`${url}/announcements/${post.id}/comments/${comment.id}`),
        () => {
            setRemovingId(null)
            toast.success('Comment deleted')
        }
    )

    function send() {
        const body = text.trim()
        if (!body || add.isPending) return
        add.mutate(body)
    }

    function grow(element) {
        element.style.height = 'auto'
        element.style.height = `${Math.min(element.scrollHeight, 160)}px`
    }

    return (
        <div className="space-y-3 border-t border-border px-4 py-3 sm:px-5">
            {count > 0 && (
                <button
                    type="button"
                    onClick={() => setOpen((value) => !value)}
                    aria-expanded={open}
                    aria-controls={listId}
                    className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <MessageSquare className="size-4" aria-hidden="true" />
                    {count} class comment{count === 1 ? '' : 's'}
                    <span className="sr-only"> on {label}</span>
                    <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
                </button>
            )}

            {open && count > 0 && (
                <div id={listId}>
                    {query.isPending && (
                        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading comments…
                        </p>
                    )}
                    <ErrorNotice error={query.error} />
                    {items.length > 0 && (
                        <ul className="space-y-3" aria-label={`Comments on ${label}`}>
                            {items.map((comment) => (
                                <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    deleting={remove.isPending && removingId === comment.id}
                                    onDelete={(target) => {
                                        setRemovingId(target.id)
                                        remove.mutate(target)
                                    }}
                                />
                            ))}
                        </ul>
                    )}
                    <ErrorNotice error={remove.error} />
                </div>
            )}

            {canComment ? (
                <form
                    className="flex items-end gap-2"
                    onSubmit={(event) => {
                        event.preventDefault()
                        send()
                    }}
                >
                    <label htmlFor={inputId} className="sr-only">Add a class comment on {label}</label>
                    <textarea
                        ref={input}
                        id={inputId}
                        rows={1}
                        value={text}
                        maxLength={MAX_LENGTH}
                        disabled={add.isPending}
                        placeholder={manage && !post.comments_enabled ? 'Reply (comments are off for students)…' : 'Add a class comment…'}
                        onChange={(event) => {
                            setText(event.target.value)
                            grow(event.target)
                        }}
                        onKeyDown={(event) => {
                            // Enter sends; Shift+Enter starts a new line.
                            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                                event.preventDefault()
                                send()
                            }
                        }}
                        className="min-h-9 flex-1 resize-none rounded-full border border-input bg-background px-4 py-1.5 text-sm leading-6 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                    />
                    <Button type="submit" variant="ghost" size="icon" className="size-9 shrink-0 text-primary"
                        disabled={!text.trim() || add.isPending} aria-label="Send comment">
                        {add.isPending
                            ? <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            : <SendHorizontal className="size-4" aria-hidden="true" />}
                    </Button>
                </form>
            ) : (
                <p className="text-xs text-muted-foreground">Your instructor turned off comments for this announcement.</p>
            )}

            <ErrorNotice error={add.error} />
        </div>
    )
}
