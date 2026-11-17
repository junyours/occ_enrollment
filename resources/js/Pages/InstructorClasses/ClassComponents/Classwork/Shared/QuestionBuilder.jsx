import React, { useEffect, useRef } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

import { Button } from '@/Components/ui/button'
import { Checkbox } from '@/Components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Textarea } from '@/Components/ui/textarea'

import { MAX_QUESTIONS, PROMPT_MAX, QUESTION_TYPES, newQuestion } from './submissionRules'

/**
 * The teacher's list of questions: prompt, type and Required for each,
 * reordered with the arrow buttons. `questions` come from toDraft().
 */
export default function QuestionBuilder({ id, questions, onChange, disabled }) {
    // Focus moves once React has added, moved or removed the row.
    const focusTarget = useRef(null)
    const focusSoon = (elementId) => { focusTarget.current = elementId }

    useEffect(() => {
        if (!focusTarget.current) return
        document.getElementById(focusTarget.current)?.focus()
        focusTarget.current = null
    })

    const update = (key, patch) =>
        onChange(questions.map((question) => question.key === key ? { ...question, ...patch } : question))

    function move(index, offset) {
        const target = index + offset
        if (target < 0 || target >= questions.length) return

        const next = [...questions]
        ;[next[index], next[target]] = [next[target], next[index]]
        onChange(next)

        // Keep focus on the moved question; at either end its arrow turns
        // off, so focus the other one.
        const atEnd = target === 0 || target === questions.length - 1
        const arrow = (offset < 0) !== atEnd ? 'up' : 'down'
        focusSoon(`${id}-${questions[index].key}-${arrow}`)
    }

    function remove(index) {
        const next = questions.filter((_, position) => position !== index)
        onChange(next)

        const neighbour = next[Math.min(index, next.length - 1)]
        focusSoon(neighbour ? `${id}-${neighbour.key}-prompt` : `${id}-add`)
    }

    function add() {
        const question = newQuestion()
        onChange([...questions, question])
        focusSoon(`${id}-${question.key}-prompt`)
    }

    return (
        <div className="space-y-3">
            <ol className="space-y-3">
                {questions.map((question, index) => {
                    const rowId = `${id}-${question.key}`
                    const number = index + 1

                    return (
                        <li key={question.key} className="min-w-0 space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                            <div className="flex items-center gap-2">
                                <label htmlFor={`${rowId}-prompt`} className="text-xs font-semibold">
                                    Question {number}
                                </label>

                                <div className="ml-auto flex items-center">
                                    <Button id={`${rowId}-up`} type="button" variant="ghost" size="icon" className="size-8"
                                        disabled={disabled || index === 0} aria-label={`Move question ${number} up`}
                                        onClick={() => move(index, -1)}>
                                        <ArrowUp className="size-4" aria-hidden="true" />
                                    </Button>
                                    <Button id={`${rowId}-down`} type="button" variant="ghost" size="icon" className="size-8"
                                        disabled={disabled || index === questions.length - 1} aria-label={`Move question ${number} down`}
                                        onClick={() => move(index, 1)}>
                                        <ArrowDown className="size-4" aria-hidden="true" />
                                    </Button>
                                    {/* The last question stays; turn off Questions instead. */}
                                    <Button type="button" variant="ghost" size="icon" className="size-8 hover:text-destructive"
                                        disabled={disabled || questions.length === 1} aria-label={`Remove question ${number}`}
                                        onClick={() => remove(index)}>
                                        <Trash2 className="size-4" aria-hidden="true" />
                                    </Button>
                                </div>
                            </div>

                            <Textarea
                                id={`${rowId}-prompt`}
                                value={question.prompt}
                                rows={2}
                                maxLength={PROMPT_MAX}
                                disabled={disabled}
                                placeholder="Type the question students will answer"
                                onChange={(event) => update(question.key, { prompt: event.target.value })}
                                className="block min-h-16 w-full resize-y max-md:text-base"
                            />

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                <label htmlFor={`${rowId}-type`} className="sr-only">Question {number} type</label>
                                {/* Always pass SelectValue children and ignore '' (Radix in a form). */}
                                <Select value={question.type} disabled={disabled}
                                    onValueChange={(type) => { if (type) update(question.key, { type }) }}>
                                    <SelectTrigger id={`${rowId}-type`} className="h-9 w-full bg-background sm:w-60">
                                        <SelectValue>{QUESTION_TYPES[question.type]?.label ?? ''}</SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(QUESTION_TYPES).map(([type, info]) => (
                                            <SelectItem key={type} value={type}>{info.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>

                                {/* A lone question is always required: students
                                    must answer something to turn in. */}
                                {questions.length > 1 && (
                                    <div className="flex items-center gap-2">
                                        <Checkbox id={`${rowId}-required`} checked={question.required} disabled={disabled}
                                            onCheckedChange={(value) => update(question.key, { required: value === true })} />
                                        <label htmlFor={`${rowId}-required`} className="cursor-pointer text-sm">Required</label>
                                    </div>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ol>

            <Button id={`${id}-add`} type="button" variant="outline" size="sm"
                disabled={disabled || questions.length >= MAX_QUESTIONS} onClick={add}>
                <Plus className="size-4" aria-hidden="true" />
                Add question
            </Button>
        </div>
    )
}
