import React, { useId, useState } from 'react'
import { ChevronDown, FolderOpen } from 'lucide-react'

import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'

import Files from './Files'
import RichTextContent from './RichTextContent'
import { ErrorNotice, useClassworkQuery } from './api'

export default function RelatedMaterials({ materialIds }) {
    const query = useClassworkQuery('materials')
    const [expanded, setExpanded] = useState(null)
    const regionId = useId()

    const ids = new Set(materialIds.map(String))

    const items = (query.data?.items ?? []).filter(
        (item) => ids.has(String(item.id))
    )

    if (!query.isPending && !query.isError && items.length === 0) {
        return null
    }

    return (
        <section
            aria-labelledby={`${regionId}-title`}
            className="space-y-3"
        >
            <h5
                id={`${regionId}-title`}
                className="text-sm font-medium"
            >
                Related materials
            </h5>

            {query.isPending && (
                <p className="text-sm text-muted-foreground">
                    Loading materials…
                </p>
            )}

            <ErrorNotice error={query.error} />

            {query.isError && (
                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => query.refetch()}
                >
                    Retry materials
                </Button>
            )}

            <div className="divide-y overflow-hidden rounded-lg border">
                {items.map((item) => {
                    const open = expanded === item.id
                    const panelId = `${regionId}-${item.id}`

                    return (
                        <div key={item.id}>
                            <Button
                                type="button"
                                variant="ghost"
                                className="h-auto w-full justify-start gap-3 whitespace-normal rounded-none px-3 py-3 text-left"
                                aria-expanded={open}
                                aria-controls={panelId}
                                onClick={() =>
                                    setExpanded(open ? null : item.id)
                                }
                            >
                                <FolderOpen className="size-4 shrink-0 text-muted-foreground" />

                                <span className="min-w-0 flex-1 break-words">
                                    {item.title}
                                </span>

                                {query.data?.can_manage && (item.archived_at || !item.published) && (
                                    <Badge variant="secondary">
                                        {item.archived_at ? 'Archived' : 'Draft'}
                                    </Badge>
                                )}

                                <ChevronDown
                                    className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''
                                        }`}
                                />
                            </Button>

                            {open && (
                                <div
                                    id={panelId}
                                    className="space-y-3 border-t bg-muted/10 p-3"
                                >
                                    <RichTextContent
                                        value={item.description}
                                        format={item.body_format ?? 'text'}
                                    />

                                    <Files
                                        kind="materials"
                                        id={item.id}
                                    />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </section>
    )
}