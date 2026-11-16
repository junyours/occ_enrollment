import React, { useId, useState } from 'react'
import {
    CalendarDays, ChevronDown, ClipboardList, FileText,
    FolderOpen, Layers, Link2, Pencil, Plus, Trophy,
} from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent } from '@/Components/ui/card'
import { Skeleton } from '@/Components/ui/skeleton'
import Editor from './Editor'
import Files from './Files'
import RichTextContent from './RichTextContent'
import RelatedMaterials from './RelatedMaterials'
import StatusBadge from './StatusBadge'
import {
    classProgress, ErrorNotice, formatDateTime,
    studentStatus, useClassworkQuery,
} from './api'

function formatDeadline(value) {
    if (!value) return 'No deadline'
    const formatted = formatDateTime(value)
    return formatted ? `Due ${formatted}` : 'Due date unavailable'
}

function ResourceHeader({
    item, assignment, manage, status, progress, open,
    uploading, onEdit, onToggle, panelId, titleId,
}) {
    const deadlinePolicy = assignment && item.due_at
        ? item.allow_late ? 'Late submissions allowed' : 'Closes at deadline'
        : undefined

    const metadataClass = 'inline-flex max-w-full items-center gap-2'
    const separatedClass = `${metadataClass} sm:border-l sm:border-border sm:pl-3`

    return (
        <div className="relative isolate rounded-xl">
            <Button type="button" variant="ghost" disabled={uploading} onClick={onToggle}
                aria-label={`${open ? 'Collapse' : 'Expand'} ${item.title}`}
                aria-expanded={open} aria-controls={open ? panelId : undefined} title={deadlinePolicy}
                className="absolute inset-0 z-0 h-full w-full cursor-pointer rounded-xl border-0 p-0 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset" />

            <div className="pointer-events-none relative flex min-w-0 items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h4 id={titleId} className="break-words text-base font-semibold leading-6 text-foreground">
                            {item.title}
                        </h4>
                        {manage && (
                            <Badge variant="secondary" className="h-6 rounded-lg border border-border bg-muted/70 px-2.5 text-xs font-medium">
                                {item.published ? 'Published' : 'Draft'}
                            </Badge>
                        )}
                        {status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
                        {progress && <StatusBadge tone={progress.tone}>{progress.label}</StatusBadge>}
                    </div>

                    {assignment && <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
                        <span className={metadataClass}>
                            <FileText className="size-4 shrink-0" aria-hidden="true" />
                            <span className="capitalize">{item.period}</span>
                        </span>
                        <span className={separatedClass}>
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
                    {manage && (
                        <Button type="button" variant="ghost" size="sm" disabled={uploading} onClick={onEdit}
                            aria-label={`Edit ${item.title}`} title={`Edit ${item.title}`}
                            className="pointer-events-auto relative z-10 size-10 gap-2 rounded-lg p-0 sm:h-8 sm:w-auto sm:px-3">
                            <Pencil className="size-4" aria-hidden="true" />
                            <span className="hidden sm:inline">Edit</span>
                        </Button>
                    )}
                    <span className="flex h-10 items-center text-muted-foreground sm:h-8" aria-hidden="true">
                        <ChevronDown className={`size-4 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
                    </span>
                </div>
            </div>
        </div>
    )
}

function groupByTopic(items) {
    const groups = new Map()

    for (const item of items) {
        const key = item.topic_id == null
            ? 'general'
            : String(item.topic_id)

        if (!groups.has(key)) {
            groups.set(key, {
                key,
                name: item.topic_name || 'General',
                order: item.topic_id == null
                    ? Infinity
                    : Number(item.topic_sort_order ?? 0),
                items: [],
            })
        }

        groups.get(key).items.push(item)
    }

    return [...groups.values()].sort(
        (a, b) => a.order - b.order || a.name.localeCompare(b.name)
    )
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
    const query = useClassworkQuery(kind)
    const [editor, setEditor] = useState(null)
    const [expanded, setExpanded] = useState(() => new Set())
    const [uploading, setUploading] = useState(false)
    const [filter, setFilter] = useState('all')

    const listId = useId()
    const headingId = useId()
    const assignment = kind === 'assignments'
    const manage = query.data?.can_manage === true
    const items = query.data?.items ?? []
    const noun = assignment ? 'assignment' : 'material'

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
        ? items.filter((item) => statuses.get(item.id)?.done === (filter === 'done'))
        : items

    const groups = groupByTopic(visible)

    function toggle(id) {
        setExpanded((current) => {
            const next = new Set(current)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const addButton = manage && (
        <Button onClick={() => setEditor({})} disabled={uploading} className="w-full sm:w-auto">
            <Plus size={16} aria-hidden="true" />
            Add {noun}
        </Button>
    )

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

                {items.length > 0 && addButton}
            </div>

            {studentView && items.length > 0 && (
                <div role="group" aria-label="Filter assignments" className="flex flex-wrap gap-2">
                    {FILTERS.map((option) => {
                        const active = filter === option.value
                        return (
                            <Button key={option.value} type="button" size="sm"
                                variant={active ? 'secondary' : 'ghost'} aria-pressed={active}
                                onClick={() => setFilter(option.value)}
                                className={`h-9 gap-2 rounded-full px-3 ${active ? 'border border-border' : ''}`}>
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
                    aria-label={`${group.name} ${kind}`}
                >
                    <div className="flex items-center gap-2 pt-2">
                        <h3 className="text-sm font-semibold">
                            {group.name}
                        </h3>

                        <Badge variant="secondary" className="text-xs">
                            {group.items.length}
                        </Badge>
                    </div>

                    {group.items.map((item) => {
                        const open = expanded.has(item.id)
                        const panelId = `${listId}-${kind}-${item.id}`
                        const titleId = `${panelId}-title`

                        return (
                            <Card key={item.id} className="gap-0 py-0">
                                <CardContent className="p-0">
                                    <ResourceHeader
                                        item={item}
                                        assignment={assignment}
                                        manage={manage}
                                        status={statuses.get(item.id)}
                                        progress={manage && assignment ? classProgress(item.progress) : null}
                                        open={open}
                                        uploading={uploading}
                                        panelId={panelId}
                                        titleId={titleId}
                                        onEdit={() => setEditor(item)}
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
                                                value={
                                                    assignment
                                                        ? item.instructions
                                                        : item.description
                                                }
                                                format={item.body_format ?? 'text'}
                                            />

                                            <Files
                                                kind={kind}
                                                id={item.id}
                                                editable={manage}
                                                onBusyChange={setUploading}
                                                headingLevel={5}
                                            />

                                            {assignment
                                                && item.material_ids?.length > 0
                                                && (
                                                    <RelatedMaterials
                                                        materialIds={item.material_ids}
                                                    />
                                                )}

                                            {renderWork?.(item, manage)}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </section>
            ))}

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
