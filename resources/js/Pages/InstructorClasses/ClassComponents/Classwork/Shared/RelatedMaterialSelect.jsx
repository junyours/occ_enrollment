import React, { useId, useState } from 'react'
import { Search, X } from 'lucide-react'

import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Checkbox } from '@/Components/ui/checkbox'
import { Input } from '@/Components/ui/input'

import { cn } from '@/Lib/Utils'

import { ErrorNotice, useClassworkQuery } from './api'

const LIMIT = 50

export default function RelatedMaterialSelect({
    value,
    onChange,
    disabled,
    className,
}) {
    const query = useClassworkQuery('materials')
    const [search, setSearch] = useState('')
    const fieldId = useId()

    const selected = value.map(String)

    // Archived materials can't be newly linked, but stay listed while
    // linked so the teacher can unlink them.
    const items = (query.data?.items ?? []).filter((item) =>
        !item.archived_at || selected.includes(String(item.id))
    )

    const matches = items.filter((item) =>
        item.title
            .toLocaleLowerCase()
            .includes(search.trim().toLocaleLowerCase())
    )

    function toggle(id, checked) {
        if (disabled) return

        const nextId = String(id)

        if (checked) {
            if (
                !selected.includes(nextId)
                && selected.length < LIMIT
            ) {
                onChange([...selected, nextId])
            }
        } else {
            onChange(selected.filter((entry) => entry !== nextId))
        }
    }

    return (
        <section
            className={cn('min-w-0 space-y-3 rounded-xl border bg-background p-4', className)}
            aria-labelledby={`${fieldId}-label`}
        >
            <div>
                <h3
                    id={`${fieldId}-label`}
                    className="text-sm font-medium"
                >
                    Related materials{' '}
                    <span className="font-normal text-muted-foreground">
                        (optional)
                    </span>
                </h3>

                <p className="mt-1 text-xs text-muted-foreground">
                    Link existing class resources. Their files stay with
                    the original material.
                </p>
            </div>

            {selected.length > 0 && (
                <div
                    className="flex flex-wrap gap-2"
                    aria-label="Selected materials"
                >
                    {selected.map((id) => {
                        const material = items.find(
                            (item) => String(item.id) === id
                        )

                        const title = material?.title || `Material #${id}`

                        return (
                            <Badge
                                key={id}
                                variant="secondary"
                                className="max-w-full gap-1 py-1 pl-2 pr-1"
                            >
                                <span className="truncate">{title}</span>

                                <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="size-5 shrink-0"
                                    disabled={disabled}
                                    aria-label={`Unlink ${title}`}
                                    onClick={() => toggle(id, false)}
                                >
                                    <X className="size-3" />
                                </Button>
                            </Badge>
                        )
                    })}
                </div>
            )}

            <div className="relative">
                <Search
                    className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground"
                    aria-hidden="true"
                />

                <Input
                    id={fieldId}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    disabled={disabled}
                    aria-label="Search materials"
                    placeholder="Search materials…"
                    className="h-9 pl-9"
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') event.preventDefault()
                    }}
                />
            </div>

            <ErrorNotice error={query.error} />

            {query.isError && (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => query.refetch()}
                >
                    Retry materials
                </Button>
            )}

            {query.isPending && (
                <p className="text-sm text-muted-foreground">
                    Loading materials…
                </p>
            )}

            {!query.isPending && !query.isError && matches.length === 0 && (
                <p className="text-sm text-muted-foreground">
                    {items.length
                        ? 'No matching materials.'
                        : 'No materials yet. You can link them later.'}
                </p>
            )}

            {matches.length > 0 && (
                <div className="max-h-48 divide-y overflow-y-auto overscroll-contain rounded-lg border">
                    {matches.map((item) => {
                        const checked = selected.includes(String(item.id))
                        const titleId = `${fieldId}-${item.id}-title`

                        return (
                            <label
                                key={item.id}
                                className="flex cursor-pointer items-start gap-3 px-3 py-2.5 hover:bg-muted/40"
                            >
                                <Checkbox
                                    checked={checked}
                                    aria-labelledby={titleId}
                                    className="mt-0.5"
                                    disabled={
                                        disabled
                                        || (!checked && selected.length >= LIMIT)
                                    }
                                    onCheckedChange={(next) =>
                                        toggle(item.id, next === true)
                                    }
                                />

                                <span className="min-w-0 flex-1">
                                    <span
                                        id={titleId}
                                        className="block break-words text-sm font-medium"
                                    >
                                        {item.title}
                                    </span>

                                </span>

                                {(item.archived_at || !item.published) && (
                                    <Badge
                                        variant="secondary"
                                        className="shrink-0 text-xs"
                                    >
                                        {item.archived_at ? 'Archived' : 'Draft'}
                                    </Badge>
                                )}
                            </label>
                        )
                    })}
                </div>
            )}

            <p className="text-xs text-muted-foreground">
                {selected.length} / {LIMIT} linked. Students see only
                published materials. Linking a draft does not publish it.
            </p>
        </section>
    )
}