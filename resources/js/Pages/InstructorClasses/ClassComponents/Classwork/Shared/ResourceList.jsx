import React, { useId, useState } from 'react'
import axios from 'axios'
import { Link } from '@inertiajs/react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
    Archive, ArchiveRestore, CalendarDays, ChevronDown, ChevronRight, ClipboardList,
    FolderOpen, Layers, Link2, Pencil, Plus, Trash2, Trophy,
} from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent } from '@/Components/ui/card'
import { Skeleton } from '@/Components/ui/skeleton'
import {
    AlertDialog, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/Components/ui/alert-dialog'
import Editor from './Editor'
import Files from './Files'
import { GuideButton, useGuide } from './GuideTour'
import { assignmentsGuide, materialsGuide } from './guides'
import RichTextContent from './RichTextContent'
import RelatedMaterials from './RelatedMaterials'
import StatusBadge from './StatusBadge'
import {
    classProgress, ErrorNotice, errorMessage, formatDate, formatDateTime,
    studentStatus, useClasswork, useClassworkQuery,
} from './api'

function formatDeadline(value) {
    if (!value) return 'No deadline'
    const formatted = formatDateTime(value)
    return formatted ? `Due ${formatted}` : 'Due date unavailable'
}

// Small action button that is icon-only on phones and labelled from `sm`.
function HeaderAction({ icon: Icon, label, onClick, disabled, variant = 'ghost', className = '' }) {
    return (
        <Button type="button" variant={variant} size="sm" disabled={disabled} onClick={onClick}
            aria-label={label} title={label}
            className={`pointer-events-auto relative z-10 size-10 gap-2 rounded-lg p-0 sm:h-8 sm:w-auto sm:px-3 ${className}`}>
            <Icon className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">{label.split(' ')[0]}</span>
        </Button>
    )
}

function ResourceHeader({
    item, assignment, manage, status, progress, open, busy, href,
    onEdit, onArchive, onRestore, onDelete, onToggle, panelId, titleId,
}) {
    const archived = Boolean(item.archived_at)
    const deadlinePolicy = assignment && item.due_at
        ? item.allow_late ? 'Late submissions allowed' : 'Closes at deadline'
        : undefined

    const metadataClass = 'inline-flex max-w-full items-center gap-2'
    const separatedClass = `${metadataClass} sm:border-l sm:border-border sm:pl-3`

    return (
        <div className="relative isolate rounded-xl">
            {/* The whole header is the target: a link to the assignment's
                page for students, a toggle otherwise. */}
            {href ? (
                <Link href={href} aria-labelledby={titleId} title={deadlinePolicy}
                    className="absolute inset-0 z-0 rounded-xl hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" />
            ) : (
                <Button type="button" variant="ghost" disabled={busy} onClick={onToggle}
                    aria-label={`${open ? 'Collapse' : 'Expand'} ${item.title}`}
                    aria-expanded={open} aria-controls={open ? panelId : undefined} title={deadlinePolicy}
                    className="absolute inset-0 z-0 h-full w-full cursor-pointer rounded-xl border-0 p-0 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset" />
            )}

            <div className="pointer-events-none relative flex min-w-0 items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h4 id={titleId} className={`break-words text-base font-semibold leading-6 ${archived ? 'text-muted-foreground' : 'text-foreground'}`}>
                            {item.title}
                        </h4>
                        {manage && !archived && (
                            <Badge variant="secondary" className="h-6 rounded-lg border border-border bg-muted/70 px-2.5 text-xs font-medium">
                                {item.published ? 'Published' : 'Draft'}
                            </Badge>
                        )}
                        {archived && (
                            <StatusBadge tone="neutral">Archived · {formatDate(item.archived_at)}</StatusBadge>
                        )}
                        {status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
                        {progress && <StatusBadge tone={progress.tone}>{progress.label}</StatusBadge>}
                    </div>

                    {!assignment && manage && item.linked_assignments?.length > 0 && (
                        <p className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Link2 className="size-4 shrink-0" aria-hidden="true" />
                            Linked to {item.linked_assignments.length} assignment{item.linked_assignments.length === 1 ? '' : 's'}
                        </p>
                    )}

                    {assignment && <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                        {/* The period is the group heading above. */}
                        <span className={metadataClass}>
                            <Layers className="size-4 shrink-0" aria-hidden="true" />
                            <span className="break-words">{item.category}</span>
                        </span>
                        <span className={separatedClass}>
                            <Trophy className="size-4 shrink-0" aria-hidden="true" />
                            <span>{item.max_score} points</span>
                        </span>
                        <span className={separatedClass} title={deadlinePolicy}>
                            <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
                            <span>{formatDeadline(item.due_at)}</span>
                            {deadlinePolicy && <span className="sr-only"> · {deadlinePolicy}</span>}
                        </span>
                        {manage && Boolean(item.assessment_id) && (
                            <Badge variant="outline" className="h-auto max-w-full gap-1.5 whitespace-normal rounded-lg border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                                title="Assignment scores are saved to the linked grading assessment.">
                                <Link2 className="size-3.5 shrink-0" aria-hidden="true" />
                                Linked to grading
                            </Badge>
                        )}
                    </div>}
                </div>

                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                    {manage && !archived && (
                        <HeaderAction icon={Pencil} label={`Edit ${item.title}`} onClick={onEdit} disabled={busy} />
                    )}
                    {manage && !archived && onArchive && (
                        <HeaderAction icon={Archive} label={`Archive ${item.title}`} onClick={onArchive} disabled={busy} />
                    )}
                    {archived && (
                        <>
                            <HeaderAction icon={ArchiveRestore} label={`Restore ${item.title}`} onClick={onRestore} disabled={busy} />
                            <HeaderAction icon={Trash2} label={`Delete ${item.title}`} onClick={onDelete} disabled={busy}
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive" />
                        </>
                    )}
                    <span className="flex h-10 items-center text-muted-foreground sm:h-8" aria-hidden="true">
                        {href
                            ? <ChevronRight className="size-4" />
                            : <ChevronDown className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />}
                    </span>
                </div>
            </div>
        </div>
    )
}

const PERIODS = [
    { key: 'midterm', name: 'Midterm' },
    { key: 'final', name: 'Final' },
]

// Soonest due first; work without a due date last, newest first.
function byDueDate(a, b) {
    const aDue = a.due_at ? Date.parse(a.due_at) : null
    const bDue = b.due_at ? Date.parse(b.due_at) : null

    if (aDue !== null && bDue !== null && aDue !== bDue) return aDue - bDue
    if (aDue === null && bDue !== null) return 1
    if (aDue !== null && bDue === null) return -1
    return b.id - a.id
}

// Assignments follow their grading period, like the Grading tab.
function groupByPeriod(items) {
    const known = PERIODS.map((period) => ({
        ...period,
        items: items.filter((item) => item.period === period.key).sort(byDueDate),
    }))
    const other = items.filter((item) => !PERIODS.some((period) => period.key === item.period))

    return [...known, { key: 'other', name: 'Other', items: other.sort(byDueDate) }]
        .filter((group) => group.items.length > 0)
}

function ListSkeleton({ label }) {
    return (
        <div role="status" aria-label={label} className="space-y-3">
            {[0, 1, 2].map((index) => (
                <div key={index} className="space-y-3 rounded-xl border border-border p-4">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            ))}
        </div>
    )
}

function EmptyState({ icon: Icon, title, children, action }) {
    return (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <span className="rounded-full bg-muted p-3 text-muted-foreground">
                <Icon className="size-6" aria-hidden="true" />
            </span>
            <div className="space-y-1">
                <p className="font-medium text-foreground">{title}</p>
                <p className="text-sm text-muted-foreground">{children}</p>
            </div>
            {action}
        </div>
    )
}

const FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'todo', label: 'To do' },
    { value: 'done', label: 'Done' },
]

export default function ResourceList({ kind, renderWork }) {
    const { base, key, assignmentHref } = useClasswork()
    const client = useQueryClient()
    const query = useClassworkQuery(kind)
    const [editor, setEditor] = useState(null)
    const [expanded, setExpanded] = useState(() => new Set())
    const [uploading, setUploading] = useState(false)
    const [filter, setFilter] = useState('all')
    const [showArchived, setShowArchived] = useState(false)
    const [deleting, setDeleting] = useState(null)

    const listId = useId()
    const headingId = useId()
    const archivedHeadingId = useId()
    const assignment = kind === 'assignments'
    const manage = query.data?.can_manage === true
    const items = query.data?.items ?? []
    const noun = assignment ? 'assignment' : 'material'

    // Materials: the main list shows active ones; archived ones are listed
    // separately for the teacher (students never receive them).
    const active = assignment ? items : items.filter((item) => !item.archived_at)
    const archived = assignment ? [] : items.filter((item) => item.archived_at)

    // Students see their own status; teachers see class progress.
    const studentView = assignment && Boolean(query.data) && !manage
    const now = new Date()
    const statuses = new Map(
        studentView ? items.map((item) => [item.id, studentStatus(item, now)]) : []
    )
    const counts = {
        all: items.length,
        todo: items.filter((item) => statuses.get(item.id)?.done === false).length,
        done: items.filter((item) => statuses.get(item.id)?.done === true).length,
    }

    const visible = studentView && filter !== 'all'
        ? active.filter((item) => statuses.get(item.id)?.done === (filter === 'done'))
        : active

    // Assignments are grouped by grading period; materials are one list,
    // newest first.
    const groups = assignment
        ? groupByPeriod(visible)
        : visible.length ? [{ key: 'materials', name: null, items: visible }] : []

    function toggle(id) {
        setExpanded((current) => {
            const next = new Set(current)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const archive = useMutation({
        retry: false,
        mutationFn: ({ item, value }) =>
            axios.post(`${base}/materials/${item.id}/archive`, { archived: value }),
        onSuccess: async (_, { item, value, undo }) => {
            await client.invalidateQueries({ queryKey: key })
            setExpanded((current) => {
                const next = new Set(current)
                next.delete(item.id)
                return next
            })

            if (value) {
                toast.success('Material archived', {
                    description: `${item.title} is hidden from students.`,
                    action: {
                        label: 'Undo',
                        onClick: () => archive.mutate({ item, value: false, undo: true }),
                    },
                })
            } else if (!undo) {
                toast.success('Material restored', { description: item.title })
            }
        },
        onError: (error) => toast.error(errorMessage(error)),
    })

    const remove = useMutation({
        retry: false,
        mutationFn: (item) => axios.delete(`${base}/materials/${item.id}`),
        onSuccess: async ({ data }, item) => {
            await client.invalidateQueries({ queryKey: key })
            setDeleting(null)
            toast.success('Material deleted', { description: item.title })

            if (data?.files_not_trashed > 0) {
                toast.warning(`${data.files_not_trashed} file(s) could not be moved to the Drive trash.`, {
                    description: 'Remove them from Google Drive manually if needed.',
                })
            }
        },
    })

    const busy = uploading || archive.isPending || remove.isPending

    // Instructors get a guided tour the first time they open each tab.
    const guide = useGuide({
        guide: kind,
        steps: assignment ? assignmentsGuide : materialsGuide,
        ready: manage && query.isSuccess && !editor,
    })

    const addButton = manage && (
        <Button onClick={() => setEditor({})} disabled={busy} className="w-full sm:w-auto" data-tour={`add-${noun}`}>
            <Plus size={16} aria-hidden="true" />
            Add {noun}
        </Button>
    )

    const guideButton = manage && (
        <GuideButton onClick={guide.start} data-tour={`guide-${kind}`} />
    )

    function renderCard(item) {
        // Assignments open on their own page when one is set up: the
        // student's work, or the teacher's view of everyone's work.
        const href = assignment && assignmentHref ? assignmentHref(item.id) : null
        const open = !href && expanded.has(item.id)
        const panelId = `${listId}-${kind}-${item.id}`
        const titleId = `${panelId}-title`

        return (
            <Card key={item.id} className={`gap-0 py-0 ${item.archived_at ? 'bg-muted/30' : ''}`} data-tour-item={kind}>
                <CardContent className="p-0">
                    <ResourceHeader
                        item={item}
                        assignment={assignment}
                        manage={manage}
                        status={statuses.get(item.id)}
                        progress={manage && assignment ? classProgress(item.progress) : null}
                        open={open}
                        busy={busy}
                        href={href}
                        panelId={panelId}
                        titleId={titleId}
                        onEdit={() => setEditor(item)}
                        onArchive={assignment ? null : () => archive.mutate({ item, value: true })}
                        onRestore={() => archive.mutate({ item, value: false })}
                        onDelete={() => {
                            remove.reset()
                            setDeleting(item)
                        }}
                        onToggle={() => toggle(item.id)}
                    />

                    {open && (
                        <div
                            id={panelId}
                            role="region"
                            aria-labelledby={titleId}
                            className="mx-4 mb-4 space-y-5 border-t border-border pt-4"
                        >
                            <RichTextContent
                                value={assignment ? item.instructions : item.description}
                                format={item.body_format ?? 'text'}
                            />

                            <Files
                                kind={kind}
                                id={item.id}
                                editable={manage && !item.archived_at}
                                removable={manage && !item.archived_at}
                                hideEmpty={!manage}
                                onBusyChange={setUploading}
                                headingLevel={5}
                            />

                            {assignment && item.material_ids?.length > 0 && (
                                <RelatedMaterials materialIds={item.material_ids} />
                            )}

                            {renderWork?.(item, manage)}
                        </div>
                    )}
                </CardContent>
            </Card>
        )
    }

    const linked = deleting?.linked_assignments ?? []

    return (
        <section aria-labelledby={headingId} className="min-w-0 space-y-4">
            <h2 id={headingId} className="sr-only">
                {assignment ? 'Assignments' : 'Materials'}
            </h2>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                    {assignment
                        ? manage
                            ? 'Each assignment records its scores in a grading assessment.'
                            : 'Work from your instructor. Your score appears here once graded.'
                        : 'Documents, notes and resources for this class.'}
                </p>

                {manage && (
                    <div className="flex w-full items-center gap-2 sm:w-auto">
                        {guideButton}
                        {items.length > 0 && addButton}
                    </div>
                )}
            </div>

            {studentView && items.length > 0 && (
                <div role="group" aria-label="Filter assignments" className="flex flex-wrap gap-2">
                    {FILTERS.map((option) => {
                        const isActive = filter === option.value
                        return (
                            <Button key={option.value} type="button" size="sm"
                                variant={isActive ? 'secondary' : 'ghost'} aria-pressed={isActive}
                                onClick={() => setFilter(option.value)}
                                className={`h-9 gap-2 rounded-full px-3 ${isActive ? 'border border-border' : ''}`}>
                                {option.label}
                                <span className="min-w-5 rounded-full bg-background px-1.5 text-xs tabular-nums text-muted-foreground">
                                    {counts[option.value]}
                                </span>
                            </Button>
                        )
                    })}
                </div>
            )}

            <ErrorNotice error={query.error} />

            {query.isError && (
                <Button variant="outline" onClick={() => query.refetch()}>
                    Try again
                </Button>
            )}

            {query.isPending && <ListSkeleton label={`Loading ${kind}`} />}

            {query.data && items.length === 0 && (
                <EmptyState
                    icon={assignment ? ClipboardList : FolderOpen}
                    title={manage ? `No ${kind} yet` : assignment ? 'Nothing assigned yet' : 'No materials yet'}
                    action={addButton}
                >
                    {manage
                        ? assignment
                            ? 'Create one to collect work and record scores in Grading.'
                            : 'Post handouts, slides and links for your students.'
                        : `New ${kind} from your instructor will show up here.`}
                </EmptyState>
            )}

            {!assignment && manage && items.length > 0 && active.length === 0 && (
                <EmptyState icon={FolderOpen} title="No active materials">
                    Everything is archived. Restore a material below, or add a new one.
                </EmptyState>
            )}

            {studentView && items.length > 0 && visible.length === 0 && (
                <EmptyState icon={ClipboardList} title={filter === 'todo' ? 'All caught up' : 'Nothing turned in yet'}>
                    {filter === 'todo'
                        ? 'You have no assignments left to turn in.'
                        : 'Assignments you turn in will show up here.'}
                </EmptyState>
            )}

            {groups.map((group) => (
                <section
                    key={group.key}
                    className="space-y-3"
                    aria-label={group.name ? `${group.name} ${kind}` : undefined}
                >
                    {group.name && (
                        <div className="flex items-center gap-2 pt-2">
                            <h3 className="text-sm font-semibold">
                                {group.name}
                            </h3>

                            <Badge variant="secondary" className="text-xs">
                                {group.items.length}
                            </Badge>
                        </div>
                    )}

                    {group.items.map(renderCard)}
                </section>
            ))}

            {archived.length > 0 && (
                <section aria-labelledby={archivedHeadingId} className="space-y-3 border-t border-border pt-4">
                    <h3 id={archivedHeadingId}>
                        <Button type="button" variant="ghost" aria-expanded={showArchived}
                            onClick={() => setShowArchived((value) => !value)}
                            className="h-9 gap-2 px-2 text-sm font-semibold">
                            <ChevronDown className={`size-4 transition-transform motion-reduce:transition-none ${showArchived ? 'rotate-180' : ''}`} aria-hidden="true" />
                            Archived
                            <Badge variant="secondary" className="text-xs">{archived.length}</Badge>
                        </Button>
                    </h3>

                    {showArchived && (
                        <>
                            <p className="text-xs text-muted-foreground">
                                Hidden from students. Restore one to show it again, or delete it permanently.
                            </p>
                            {archived.map(renderCard)}
                        </>
                    )}
                </section>
            )}

            <AlertDialog
                open={Boolean(deleting)}
                onOpenChange={(open) => {
                    if (!open && !remove.isPending) setDeleting(null)
                }}
            >
                <AlertDialogContent className="w-[calc(100%-2rem)] rounded-xl sm:w-full">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="break-words">
                            Delete “{deleting?.title}” permanently?
                        </AlertDialogTitle>

                        <AlertDialogDescription asChild>
                            <div className="space-y-3 text-sm text-muted-foreground">
                                <p>
                                    The material and its attachments are removed from the class.
                                    Its files go to the Google Drive trash, where they can be
                                    recovered for 30 days. This can't be undone here.
                                </p>

                                {linked.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="font-medium text-foreground">
                                            It will also be removed from {linked.length} assignment{linked.length === 1 ? '' : 's'}:
                                        </p>
                                        <ul className="list-disc space-y-0.5 pl-5">
                                            {linked.map((entry) => <li key={entry.id} className="break-words">{entry.title}</li>)}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <ErrorNotice error={remove.error} />

                    <AlertDialogFooter>
                        <Button variant="outline" disabled={remove.isPending} onClick={() => setDeleting(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" disabled={remove.isPending} onClick={() => remove.mutate(deleting)}>
                            {remove.isPending ? 'Deleting…' : 'Delete permanently'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {guide.tour}

            {editor && (
                <Editor
                    key={editor.id || 'new'}
                    kind={kind}
                    item={editor.id ? editor : null}
                    onClose={() => setEditor(null)}
                    onSaved={(id) => {
                        setExpanded((current) => new Set(current).add(id))
                        setEditor(null)
                    }}
                />
            )}
        </section>
    )
}
