import React, { useId, useRef, useState } from 'react'
import axios from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'

import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select'

import {
    ErrorNotice,
    useClasswork,
    useClassworkQuery,
} from './api'

const GENERAL = '__general__'

export default function TopicSelect({
    value,
    selectedName,
    onChange,
    disabled,
    onBusyChange,
}) {
    const { base, key } = useClasswork()
    const client = useQueryClient()
    const query = useClassworkQuery('topics')

    const [adding, setAdding] = useState(false)
    const [name, setName] = useState('')
    const busy = useRef(false)
    const fieldId = useId()

    const topics = query.data ?? []

    const selected = topics.find(
        (topic) => String(topic.id) === String(value)
    )

    const create = useMutation({
        retry: false,
        networkMode: 'always',

        mutationFn: async (topicName) => {
            const response = await axios.post(`${base}/topics`, {
                name: topicName,
            })

            return response.data
        },

        onSuccess: (topic) => {
            client.setQueryData([...key, 'topics'], (current = []) =>
                [
                    ...current.filter(
                        (entry) => String(entry.id) !== String(topic.id)
                    ),
                    topic,
                ].sort(
                    (a, b) => a.sort_order - b.sort_order || a.id - b.id
                )
            )

            void client.invalidateQueries({
                queryKey: [...key, 'topics'],
                exact: true,
            })

            onChange(String(topic.id))
            setAdding(false)
            setName('')
        },

        onSettled: () => {
            busy.current = false
            onBusyChange?.(false)
        },
    })

    function addTopic() {
        if (disabled || busy.current || !name.trim()) return

        busy.current = true
        onBusyChange?.(true)
        create.mutate(name.trim())
    }

    return (
        <div className="space-y-2">
            <label
                htmlFor={fieldId}
                className="text-sm font-medium"
            >
                Topic{' '}
                <span className="font-normal text-muted-foreground">
                    (optional)
                </span>
            </label>

            <div className="flex items-center gap-2">
                {/* Inside a <form>, Radix mirrors the value into a hidden native
                    select; selecting a just-created topic from code can bounce
                    back as '' and reset it to General. No option is empty. */}
                <Select
                    value={value ? String(value) : GENERAL}
                    disabled={disabled || create.isPending}
                    onValueChange={(next) => {
                        if (!next) return
                        onChange(next === GENERAL ? '' : next)
                    }}
                >
                    <SelectTrigger
                        id={fieldId}
                        className="h-9 min-w-0 flex-1"
                    >
                        <SelectValue>
                            {value
                                ? selected?.name
                                ?? selectedName
                                ?? 'Selected topic'
                                : 'General'}
                        </SelectValue>
                    </SelectTrigger>

                    <SelectContent>
                        <SelectItem value={GENERAL}>
                            General
                        </SelectItem>

                        {value && !selected && (
                            <SelectItem value={String(value)}>
                                {selectedName || 'Selected topic'}
                            </SelectItem>
                        )}

                        {topics.map((topic) => (
                            <SelectItem
                                key={topic.id}
                                value={String(topic.id)}
                            >
                                {topic.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled || adding}
                    onClick={() => {
                        create.reset()
                        setAdding(true)
                    }}
                >
                    <Plus className="size-4" />
                    New topic
                </Button>
            </div>

            <p className="text-xs text-muted-foreground">
                Organizes classwork. This does not change grading categories.
            </p>

            {query.isPending && (
                <p className="text-xs text-muted-foreground">
                    Loading topics…
                </p>
            )}

            <ErrorNotice error={query.error} />

            {query.isError && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => query.refetch()}
                >
                    Retry topics
                </Button>
            )}

            {adding && (
                <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
                    <label
                        htmlFor={`${fieldId}-new`}
                        className="text-sm font-medium"
                    >
                        New topic name
                    </label>

                    <Input
                        id={`${fieldId}-new`}
                        value={name}
                        maxLength={120}
                        autoFocus
                        disabled={disabled || create.isPending}
                        placeholder="e.g. Week 1 — Introduction"
                        onChange={(event) => setName(event.target.value)}
                        onKeyDown={(event) => {
                            if (
                                event.key === 'Enter'
                                && !event.nativeEvent.isComposing
                            ) {
                                event.preventDefault()
                                event.stopPropagation()
                                addTopic()
                            }
                        }}
                    />

                    <ErrorNotice error={create.error} />

                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={disabled || create.isPending}
                            onClick={() => {
                                setAdding(false)
                                setName('')
                                create.reset()
                            }}
                        >
                            Cancel topic
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            disabled={
                                disabled
                                || create.isPending
                                || !name.trim()
                            }
                            onClick={addTopic}
                        >
                            {create.isPending ? 'Adding…' : 'Add topic'}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}