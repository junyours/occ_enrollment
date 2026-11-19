import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ArrowLeft, ChevronRight, FolderOpen, Loader2, Paperclip } from 'lucide-react'

import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Checkbox } from '@/Components/ui/checkbox'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/Components/ui/dialog'
import { Skeleton } from '@/Components/ui/skeleton'

import { ErrorNotice, useClasswork, useClassworkQuery } from '../Shared/api'

// The server copies up to this many in one go.
const MAX_AT_ONCE = 20

function ListSkeleton() {
    return (
        <div role="status" aria-label="Loading" className="space-y-2">
            {[0, 1, 2].map((index) => <Skeleton key={index} className="h-14 w-full rounded-lg" />)}
        </div>
    )
}

function LoadProblem({ query }) {
    return (
        <div className="space-y-3">
            <ErrorNotice error={query.error} />
            <Button type="button" variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.refetch()}>
                Try again
            </Button>
        </div>
    )
}

// Your other classes with materials, grouped by school year.
function ClassList({ query, onPick }) {
    if (query.isPending) return <ListSkeleton />
    if (query.isError) return <LoadProblem query={query} />

    const classes = query.data ?? []

    if (classes.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center">
                <FolderOpen className="size-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium">Nothing to copy yet</p>
                <p className="text-sm text-muted-foreground">None of your other classes have materials.</p>
            </div>
        )
    }

    const years = []
    for (const item of classes) {
        const label = item.school_year ?? 'Other classes'
        const year = years.find((entry) => entry.label === label)
        if (year) year.classes.push(item)
        else years.push({ label, classes: [item] })
    }

    return (
        <div className="space-y-4">
            {years.map((year) => (
                <section key={year.label} aria-label={year.label} className="space-y-2">
                    <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{year.label}</h3>
                    <ul className="space-y-2">
                        {year.classes.map((item) => (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    onClick={() => onPick(item)}
                                    className="flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="text-sm font-medium">{item.subject}</span>
                                        <span className="text-sm text-muted-foreground"> · {item.section}</span>
                                        <span className="block truncate text-xs text-muted-foreground">{item.title}</span>
                                    </span>
                                    <span className="shrink-0 text-xs text-muted-foreground">
                                        {item.materials} material{item.materials === 1 ? '' : 's'}
                                    </span>
                                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </div>
    )
}

function MaterialList({ query, selected, onToggle, onToggleAll, disabled }) {
    if (query.isPending) return <ListSkeleton />
    if (query.isError) return <LoadProblem query={query} />

    const materials = query.data ?? []

    if (materials.length === 0) {
        return <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">This class has no materials.</p>
    }

    const allChosen = materials.every((material) => selected.has(material.id))

    return (
        <div className="space-y-2">
            <label className="flex cursor-pointer items-center gap-2.5 px-1 text-sm font-medium">
                <Checkbox
                    checked={allChosen ? true : selected.size > 0 ? 'indeterminate' : false}
                    disabled={disabled}
                    onCheckedChange={() => onToggleAll(allChosen ? [] : materials.map((material) => material.id))}
                />
                Select all ({materials.length})
            </label>

            <ul className="space-y-2" aria-label="Materials in this class">
                {materials.map((material) => (
                    <li key={material.id}>
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                            <Checkbox
                                className="mt-0.5"
                                checked={selected.has(material.id)}
                                disabled={disabled}
                                onCheckedChange={(checked) => onToggle(material.id, checked === true)}
                            />
                            <span className="min-w-0 flex-1">
                                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="break-words text-sm font-medium">{material.title}</span>
                                    {!material.published && <Badge variant="secondary" className="h-5 px-1.5 text-[11px] font-medium">Draft</Badge>}
                                    {material.archived && <Badge variant="outline" className="h-5 px-1.5 text-[11px] font-medium">Archived</Badge>}
                                </span>
                                {material.summary && (
                                    <span className="mt-0.5 line-clamp-2 block break-words text-xs text-muted-foreground">{material.summary}</span>
                                )}
                                {material.files > 0 && (
                                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                                        <Paperclip className="size-3" aria-hidden="true" />
                                        {material.files} file{material.files === 1 ? '' : 's'}
                                    </span>
                                )}
                            </span>
                        </label>
                    </li>
                ))}
            </ul>
        </div>
    )
}

/**
 * Copies materials from the teacher's other classes, this school year or
 * earlier ones, into this class: pick a class, tick materials, then copy
 * them as drafts or posted. Files are copied too.
 */
export default function CopyMaterialsDialog({ open, onOpenChange }) {
    const { base, key } = useClasswork()
    const client = useQueryClient()
    const [source, setSource] = useState(null)
    const [selected, setSelected] = useState(() => new Set())

    const sources = useClassworkQuery('materials/sources', { enabled: open, staleTime: 60_000 })
    const materials = useClassworkQuery(`materials/sources/${source?.id ?? 'none'}`, {
        enabled: open && Boolean(source),
        staleTime: 60_000,
    })

    const copy = useMutation({
        mutationFn: async ({ publish }) => {
            const { data } = await axios.post(`${base}/materials/copy`, {
                source_class_id: source.id,
                material_ids: [...selected],
                published: publish,
            })

            return data
        },
        onSuccess: async (data, { publish }) => {
            await client.invalidateQueries({ queryKey: key })

            const count = data?.ids?.length ?? selected.size
            toast.success(`${count} material${count === 1 ? '' : 's'} copied`, {
                description: publish ? 'Students can see them now.' : 'Saved as drafts. Post them when you’re ready.',
            })

            onOpenChange(false)
        },
    })

    // Start over each time it opens.
    useEffect(() => {
        if (open) return

        setSource(null)
        setSelected(new Set())
        copy.reset()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    function toggle(id, checked) {
        setSelected((current) => {
            const next = new Set(current)
            if (checked) next.add(id)
            else next.delete(id)
            return next
        })
    }

    const busy = copy.isPending
    const tooMany = selected.size > MAX_AT_ONCE
    const canCopy = selected.size > 0 && !tooMany && !busy

    return (
        <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
            <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg flex-col gap-0 rounded-xl p-0">
                <DialogHeader className="space-y-1 border-b px-5 py-4 text-left">
                    <DialogTitle>Copy materials from another class</DialogTitle>
                    <DialogDescription>
                        {source
                            ? `From ${source.subject} · ${source.section}${source.school_year ? ` (${source.school_year})` : ''}. Files are copied too.`
                            : 'Choose one of your classes. Files are copied too.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                    {source ? (
                        <div className="space-y-3">
                            <Button type="button" variant="ghost" size="sm" className="-ml-2 h-8 gap-1.5 px-2" disabled={busy}
                                onClick={() => {
                                    setSource(null)
                                    setSelected(new Set())
                                    copy.reset()
                                }}>
                                <ArrowLeft className="size-4" aria-hidden="true" />
                                All classes
                            </Button>
                            <MaterialList
                                query={materials}
                                selected={selected}
                                disabled={busy}
                                onToggle={toggle}
                                onToggleAll={(ids) => setSelected(new Set(ids))}
                            />
                        </div>
                    ) : (
                        <ClassList query={sources} onPick={setSource} />
                    )}
                </div>

                {source && (
                    <div className="space-y-2 border-t px-5 py-3">
                        <ErrorNotice error={copy.error} />
                        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:space-x-0">
                            <div className="text-xs sm:mr-auto" aria-live="polite">
                                {tooMany
                                    ? <span className="text-destructive">{selected.size} selected. Copy up to {MAX_AT_ONCE} at a time.</span>
                                    : <span className="text-muted-foreground">{selected.size} selected</span>}
                            </div>
                            <Button type="button" variant="outline" disabled={!canCopy} onClick={() => copy.mutate({ publish: false })}>
                                Copy as drafts
                            </Button>
                            <Button type="button" disabled={!canCopy} className="gap-2" onClick={() => copy.mutate({ publish: true })}>
                                {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                                {busy ? 'Copying…' : 'Copy and post'}
                            </Button>
                        </DialogFooter>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
