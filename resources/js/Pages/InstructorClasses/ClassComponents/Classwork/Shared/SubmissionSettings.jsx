import React, { useId } from 'react'
import { FileUp, Link2, ListChecks } from 'lucide-react'

import { Input } from '@/Components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/Components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { cn } from '@/Lib/Utils'

import QuestionBuilder from './QuestionBuilder'
import {
    FILE_PRESETS,
    SUBMISSION_TYPES,
    describeFiles,
    fromDraft,
    normalizeSettings,
    settingsProblem,
} from './submissionRules'

const TYPE_ICONS = { files: FileUp, questions: ListChecks, links: Link2 }

// What students will hand in after a type change, for the notice.
const TYPE_WORK = { files: 'files', questions: 'answers to your questions', links: 'links' }

function NumberField({ id, label, value, onChange, min, max, suffix, disabled }) {
    return (
        <div className="space-y-1.5">
            <label htmlFor={id} className="text-xs font-medium">{label}</label>
            <div className="flex items-center gap-2">
                <Input
                    id={id}
                    type="number"
                    inputMode="numeric"
                    min={min}
                    max={max}
                    step={1}
                    value={value}
                    disabled={disabled}
                    onChange={(event) => onChange(event.target.value)}
                    className="h-9 w-24"
                />
                {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
            </div>
        </div>
    )
}

/**
 * How students hand in an assignment: exactly one of file upload (the
 * default), questions or links, with that type's options. `value` is the
 * editable draft from toDraft(); the editor sends fromDraft(value) and
 * questionsPayload(value) when saving. `savedType` is set when editing.
 */
export default function SubmissionSettings({ value, onChange, disabled, savedType, className }) {
    const id = useId()
    const { type, files, links } = value

    const set = (section, patch) => onChange({ ...value, [section]: { ...value[section], ...patch } })
    const problem = settingsProblem(value, { skipBlankPrompts: true })
    const preview = normalizeSettings(fromDraft(value))

    return (
        <section aria-labelledby={`${id}-title`} className={cn('min-w-0 space-y-3 rounded-xl border bg-background p-3 sm:p-4', className)}>
            <div>
                <h3 id={`${id}-title`} className="text-sm font-semibold">What students submit</h3>
                <p id={`${id}-help`} className="text-xs text-muted-foreground">
                    Choose one. Students see what to hand in before they start, and the server enforces it.
                </p>
            </div>

            {/* Ignore '' like the selects: Radix controls inside a form can echo it. */}
            <RadioGroup
                value={type}
                disabled={disabled}
                aria-labelledby={`${id}-title`}
                aria-describedby={`${id}-help`}
                onValueChange={(next) => { if (next) onChange({ ...value, type: next }) }}
                className="grid gap-2 sm:grid-cols-3"
            >
                {Object.entries(SUBMISSION_TYPES).map(([key, info]) => {
                    const Icon = TYPE_ICONS[key]
                    const itemId = `${id}-type-${key}`

                    return (
                        <label
                            key={key}
                            htmlFor={itemId}
                            className={cn(
                                'flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors',
                                key === type ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/40',
                                disabled && 'cursor-not-allowed opacity-60'
                            )}
                        >
                            <RadioGroupItem
                                id={itemId}
                                value={key}
                                aria-labelledby={`${itemId}-label`}
                                aria-describedby={`${itemId}-description`}
                                className="mt-0.5 shrink-0"
                            />
                            <span className="min-w-0">
                                <span id={`${itemId}-label`} className="flex items-center gap-1.5 text-sm font-medium">
                                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                    {info.label}
                                </span>
                                <span id={`${itemId}-description`} className="mt-0.5 block text-xs text-muted-foreground">
                                    {info.description}
                                </span>
                            </span>
                        </label>
                    )
                })}
            </RadioGroup>

            {savedType && savedType !== type && (
                <p role="note" className="rounded-lg border border-amber-600/25 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
                    {savedType === 'questions' && 'Saving removes the questions. '}
                    Work already turned in stays, and you can still see it. Students still working will hand in {TYPE_WORK[type]} instead.
                </p>
            )}

            <div className="space-y-3 border-t border-border pt-3">
                {type === 'files' && (
                    <>
                        <div className="space-y-1.5">
                            <label htmlFor={`${id}-types`} className="text-xs font-medium">Allowed file types</label>
                            {/* Always pass SelectValue children and ignore '' (Radix in a form). */}
                            <Select value={files.types} disabled={disabled}
                                onValueChange={(types) => { if (types) set('files', { types }) }}>
                                <SelectTrigger id={`${id}-types`} className="h-9 w-full sm:w-72">
                                    <SelectValue>{FILE_PRESETS[files.types]?.label ?? ''}</SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(FILE_PRESETS).map(([key, preset]) => (
                                        <SelectItem key={key} value={key}>{preset.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {files.types === 'custom' && (
                            <div className="space-y-1.5">
                                <label htmlFor={`${id}-extensions`} className="text-xs font-medium">File extensions</label>
                                <Input id={`${id}-extensions`} value={files.extensionsText} disabled={disabled}
                                    placeholder="e.g. pdf, docx, zip" className="h-9"
                                    onChange={(event) => set('files', { extensionsText: event.target.value })} />
                            </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                            Students attach at least one file: {describeFiles(preview.files)}
                        </p>
                    </>
                )}

                {type === 'questions' && (
                    <QuestionBuilder
                        id={`${id}-questions`}
                        questions={value.questions}
                        disabled={disabled}
                        onChange={(questions) => onChange({ ...value, questions })}
                    />
                )}

                {type === 'links' && (
                    <>
                        <div className="space-y-1.5">
                            <label htmlFor={`${id}-domain`} className="text-xs font-medium">
                                Only allow links from <span className="font-normal text-muted-foreground">(optional)</span>
                            </label>
                            <Input id={`${id}-domain`} value={links.domain} disabled={disabled}
                                placeholder="e.g. github.com" className="h-9 sm:w-72"
                                onChange={(event) => set('links', { domain: event.target.value })} />
                        </div>

                        <NumberField id={`${id}-link-count`} label="Max number of links" value={links.max_links}
                            min={1} max={10} disabled={disabled}
                            onChange={(max_links) => set('links', { max_links })} />

                        <p className="text-xs text-muted-foreground">Students add at least one link.</p>
                    </>
                )}
            </div>

            {problem && <p role="alert" className="text-xs text-destructive">{problem}</p>}
        </section>
    )
}
