import React, { useEffect, useId, useRef, useState } from 'react'
import axios from 'axios'
import { format, startOfDay } from 'date-fns'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarDays, CircleHelp, ClipboardList, FolderOpen, Loader2, Plus, X } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Calendar } from '@/Components/ui/calendar'
import { Field, FieldLabel } from '@/Components/ui/field'
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
import { Checkbox } from '@/Components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle } from '@/Components/ui/drawer'
import AttachmentPicker from './AttachmentPicker'
import Files from './Files'
import RichTextEditor from './RichTextEditor'
import { toEditorHtml } from './richText'
import { ErrorNotice, errorMessage, localDateInput, refreshGrading, useClasswork, useClassworkQuery } from './api'
import { cn } from '@/Lib/Utils'
import RelatedMaterialSelect from './RelatedMaterialSelect'
import SubmissionSettings from './SubmissionSettings'
import { useGuide } from './GuideTour'
import { editorGuide } from './guides'
import { fromDraft, questionsPayload, settingsProblem, toDraft } from './submissionRules'
import useIsMobile from './useIsMobile'

function periodLabel(period) {
    return period ? period.charAt(0).toUpperCase() + period.slice(1) : ''
}

// Creates the grading assessment right here, instead of sending the
// teacher to the Grading tab and back.
function NewAssessment({ disabled, onCreated, onCancel, onBusyChange }) {
    const { base, key } = useClasswork()
    const client = useQueryClient()
    const categories = useClassworkQuery('grading-categories')
    const [categoryId, setCategoryId] = useState('')
    const [name, setName] = useState('')
    const [maxScore, setMaxScore] = useState('')
    const fieldId = useId()

    const create = useMutation({
        retry: false,
        networkMode: 'always',
        mutationFn: async (payload) => (await axios.post(`${base}/assessments`, payload)).data,
        onSuccess: (assessment) => {
            client.setQueryData([...key, 'assessments'], (current = []) => [...current, assessment])
            void client.invalidateQueries({ queryKey: [...key, 'assessments'], exact: true })
            void refreshGrading(client)
            toast.success('Assessment created', {
                description: `${assessment.name} · ${assessment.max_score} points · ${periodLabel(assessment.period)}`,
            })
            onCreated(assessment)
        },
        onSettled: () => onBusyChange?.(false),
    })

    const score = Number(maxScore)
    const ready = categoryId && name.trim() && Number.isInteger(score) && score >= 1 && score <= 10000

    function submit() {
        if (!ready || create.isPending || disabled) return
        onBusyChange?.(true)
        create.mutate({ grading_category_id: Number(categoryId), name: name.trim(), max_score: score })
    }

    // Enter creates the assessment instead of submitting the whole editor.
    const enterCreates = (event) => {
        if (event.key === 'Enter' && !event.nativeEvent.isComposing) {
            event.preventDefault()
            event.stopPropagation()
            submit()
        }
    }

    const selectedCategory = categories.data?.find((item) => String(item.id) === String(categoryId))

    return (
        <div className="space-y-3 rounded-lg border border-border bg-background p-3">
            <p className="text-sm font-medium">New assessment</p>

            {categories.isPending && <p role="status" className="text-xs text-muted-foreground">Loading grading categories…</p>}
            <ErrorNotice error={categories.error} />

            {categories.data?.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                    This class has no grading categories yet. Set them up in the Grading tab, then come back.
                </p>
            ) : categories.data && (
                <>
                    <div className="space-y-1.5">
                        <label htmlFor={`${fieldId}-category`} className="text-xs font-medium">Grading category</label>
                        <Select value={categoryId} disabled={disabled || create.isPending}
                            onValueChange={(next) => { if (next) setCategoryId(next) }}>
                            <SelectTrigger id={`${fieldId}-category`} className="h-9 w-full min-w-0">
                                <SelectValue placeholder="Choose a category">
                                    {selectedCategory ? `${periodLabel(selectedCategory.period)} · ${selectedCategory.name}` : ''}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {categories.data.map((item) => (
                                    <SelectItem key={item.id} value={String(item.id)}>
                                        {periodLabel(item.period)} · {item.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor={`${fieldId}-name`} className="text-xs font-medium">Name</label>
                        <Input id={`${fieldId}-name`} value={name} maxLength={255} placeholder="e.g. Lab 4"
                            disabled={disabled || create.isPending} onKeyDown={enterCreates}
                            onChange={(event) => setName(event.target.value)} />
                    </div>

                    <div className="space-y-1.5">
                        <label htmlFor={`${fieldId}-max`} className="text-xs font-medium">Maximum score</label>
                        <Input id={`${fieldId}-max`} type="number" inputMode="numeric" min={1} max={10000} step={1}
                            value={maxScore} placeholder="e.g. 50" disabled={disabled || create.isPending}
                            onKeyDown={enterCreates} onChange={(event) => setMaxScore(event.target.value)} />
                    </div>
                </>
            )}

            <ErrorNotice error={create.error} />

            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" disabled={create.isPending} onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="button" size="sm" disabled={disabled || create.isPending || !ready} onClick={submit}>
                    {create.isPending ? 'Creating…' : 'Create'}
                </Button>
            </div>
        </div>
    )
}

function AssessmentSelect({ selected, onChange, disabled, onBusyChange }) {
    const query = useClassworkQuery('assessments')
    const [adding, setAdding] = useState(false)
    const fieldId = useId()
    const options = query.data ?? []
    const listed = selected && !options.some((item) => String(item.id) === String(selected.id))
        ? [...options, selected]
        : options

    return (
        <div className="space-y-2">
            <label htmlFor={fieldId} className="text-sm font-medium">Linked assessment</label>
            {/* Inside a <form>, Radix mirrors the value into a hidden native
                select; a value set from code can bounce back as '' before
                its option exists. No option is empty, so ignore ''. */}
            <Select value={selected ? String(selected.id) : ''} disabled={disabled}
                onValueChange={(id) => {
                    if (!id) return
                    onChange(listed.find((item) => String(item.id) === String(id)) || null)
                }}>
                <SelectTrigger id={fieldId} className="w-full min-w-0" aria-describedby={`${fieldId}-help`}>
                    {/* Always pass children: with none, Radix copies the item text into
                        the trigger itself, and setting the value from code (inline
                        creation) then crashes React when it removes that node. */}
                    <SelectValue className="truncate" placeholder="Choose an assessment">{selected?.name ?? ''}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                    {listed.map((item) => <SelectItem key={item.id} value={String(item.id)}>
                        {periodLabel(item.period)} · {item.category} · {item.name} ({item.max_score} points)
                    </SelectItem>)}
                </SelectContent>
            </Select>

            {query.isPending && <p role="status" className="text-xs text-muted-foreground">Loading assessments…</p>}
            <ErrorNotice error={query.error} />
            {query.isError && <Button type="button" size="sm" variant="outline" onClick={() => query.refetch()}>Retry</Button>}

            <p id={`${fieldId}-help`} className="text-xs text-muted-foreground">
                {query.data?.length === 0 && !selected
                    ? 'No unlinked assessments yet. Create one below.'
                    : 'Scores from this assignment are saved to this assessment.'}
            </p>

            {adding ? (
                <NewAssessment
                    disabled={disabled}
                    onBusyChange={onBusyChange}
                    onCancel={() => setAdding(false)}
                    onCreated={(assessment) => {
                        onChange(assessment)
                        setAdding(false)
                    }}
                />
            ) : (
                <Button type="button" variant="outline" size="sm" className="w-full" disabled={disabled} onClick={() => setAdding(true)}>
                    <Plus className="size-4" aria-hidden="true" />
                    New assessment
                </Button>
            )}
        </div>
    )
}

// The sticky `top` that keeps `panel` in view while the rest of `scroller`
// scrolls: 0 when it fits, otherwise negative by the overflow, so a tall
// panel scrolls just far enough to show its last fields, then stays.
function useStickyTop(scroller, panel) {
    const [top, setTop] = useState(0)

    useEffect(() => {
        if (!scroller || !panel || typeof ResizeObserver === 'undefined') return undefined

        const measure = () => {
            const style = window.getComputedStyle(scroller)
            const room = scroller.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom)
            setTop(Math.min(0, Math.floor(room - panel.offsetHeight)))
        }

        const observer = new ResizeObserver(measure)
        observer.observe(scroller)
        observer.observe(panel)
        measure()

        return () => observer.disconnect()
    }, [scroller, panel])

    return top
}

// Materials: the teacher's other classes this school year. Each one ticked
// gets its own copy, files included, when the material is posted.
function AlsoPostTo({ targets, value, onChange, disabled }) {
    const headingId = useId()

    function toggle(id, checked) {
        onChange((current) => (checked ? [...current, id] : current.filter((entry) => entry !== id)))
    }

    return (
        <section aria-labelledby={headingId} className="space-y-3 rounded-xl border bg-background p-3 sm:p-4" data-tour="editor-other-classes">
            <div>
                <h3 id={headingId} className="text-sm font-semibold">
                    Also post to <span className="font-normal text-muted-foreground">(optional)</span>
                </h3>
                <p className="text-xs text-muted-foreground">
                    Each class you tick gets its own copy, files included, when you post. Drafts stay in this class.
                </p>
            </div>

            <ul className="grid gap-2 sm:grid-cols-2">
                {targets.map((target) => (
                    <li key={target.id}>
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors hover:bg-muted/40 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring">
                            <Checkbox
                                className="mt-0.5"
                                checked={value.includes(target.id)}
                                disabled={disabled}
                                onCheckedChange={(checked) => toggle(target.id, checked === true)}
                            />
                            <span className="min-w-0 text-sm">
                                <span className="font-medium">{target.subject}</span>
                                <span className="text-muted-foreground"> · {target.section}</span>
                                <span className="block truncate text-xs text-muted-foreground">{target.title}</span>
                            </span>
                        </label>
                    </li>
                ))}
            </ul>
        </section>
    )
}

export default function Editor({ kind, item, onClose, onSaved }) {
    const assignment = kind === 'assignments'
    const Icon = assignment ? ClipboardList : FolderOpen
    const isMobile = useIsMobile()
    const [drawerOpen, setDrawerOpen] = useState(false)

    // On wide screens the assignment settings stay in view while the
    // details, attachments and submission options scroll.
    const [scroller, setScroller] = useState(null)
    const [settingsPanel, setSettingsPanel] = useState(null)
    const settingsTop = useStickyTop(scroller, settingsPanel)

    const [materialIds, setMaterialIds] = useState(
        () => (item?.material_ids ?? []).map(String)
    )

    const [creatingAssessment, setCreatingAssessment] = useState(false)

    // Mount closed, then open so Base UI runs its entry transition.
    useEffect(() => {
        setDrawerOpen(true)
    }, [])

    const { base, key } = useClasswork()

    // The first time an instructor opens this editor, a guide walks through
    // it once the drawer has slid in. It draws inside the drawer, whose
    // focus trap would block anything drawn over the page.
    const [opened, setOpened] = useState(false)
    const [guideHost, setGuideHost] = useState(null)
    const guide = useGuide({
        guide: `${kind}-editor`,
        steps: () => editorGuide({ assignment, editing: Boolean(item) }),
        ready: opened && Boolean(guideHost),
        container: guideHost,
    })

    const client = useQueryClient()
    const savedId = useRef(item?.id ?? null)
    const completedUploads = useRef(new Set())
    const saving = useRef(false)
    const [recordId, setRecordId] = useState(item?.id ?? null)
    const [selectedAssessment, setSelectedAssessment] = useState(null)
    const [title, setTitle] = useState(item?.title || '')
    const [body, setBody] = useState(() => toEditorHtml(
        assignment
            ? item?.instructions
            : item?.description,
        item?.body_format ?? 'text'
    ))
    const [dueAt, setDueAt] = useState(localDateInput(item?.due_at))
    const [dueDateOpen, setDueDateOpen] = useState(false)
    const dueDateId = useId()
    const dueTimeId = useId()
    const [dueDatePart = '', dueTimePart = ''] = dueAt.split('T')
    const selectedDueDate = dueDatePart
        ? new Date(`${dueDatePart}T00:00:00`)
        : undefined
    const invalidDueAt = Boolean(dueAt) && (
        !dueTimePart || Number.isNaN(new Date(dueAt).getTime())
    )
    const calendarYear = new Date().getFullYear()
    const selectedYear = selectedDueDate?.getFullYear() ?? calendarYear

    function selectDueDate(date) {
        if (disabled) return
        setDueAt(date ? `${format(date, 'yyyy-MM-dd')}T${dueTimePart || '23:59'}` : '')
        setDueDateOpen(false)
    }

    const [allowLate, setAllowLate] = useState(item?.allow_late ?? true)
    const [submission, setSubmission] = useState(() => toDraft(item?.submission_settings, item?.questions))
    const [published, setPublished] = useState(Boolean(item?.published))
    const [attachments, setAttachments] = useState([])
    const [stage, setStage] = useState('')

    // A new material can also go to the teacher's other classes.
    const offersCopies = !assignment && !item
    const [alsoIds, setAlsoIds] = useState([])
    const targets = useClassworkQuery('targets', {
        enabled: offersCopies,
        staleTime: 5 * 60_000,
    }).data ?? []

    function updateAttachment(id, changes) {
        setAttachments((current) => current.map((entry) => entry.id === id ? { ...entry, ...changes } : entry))
    }

    const save = useMutation({
        retry: false,
        networkMode: 'always',
        mutationFn: async ({ fields, publish, files, assessmentId, also = [] }) => {
            if (!navigator.onLine) throw new Error('You are offline. Your selected files are still here; reconnect and try again.')

            let toSave = fields

            // Create once and retain its ID if an upload or publishing fails.
            if (!savedId.current) {
                setStage('Creating draft…')
                const response = await axios.post(`${base}/${kind}`, {
                    ...fields,
                    published: false,
                    ...(assignment ? { assessment_id: assessmentId } : {}),
                })
                savedId.current = response.data.id
                setRecordId(response.data.id)

                // Send the new questions' ids from now on, so the next save
                // (and any retry) updates them instead of adding copies.
                const ids = response.data.question_ids
                if (Array.isArray(ids) && Array.isArray(fields.questions)) {
                    const withId = (question, index) => ids[index] ? { ...question, id: ids[index] } : question
                    toSave = { ...fields, questions: fields.questions.map(withId) }
                    setSubmission((current) => ({ ...current, questions: current.questions.map(withId) }))
                }
            }

            const id = savedId.current
            const pending = files.filter((entry) => !completedUploads.current.has(entry.id))

            for (const [index, entry] of pending.entries()) {
                setStage(`Uploading ${index + 1} of ${pending.length}: ${entry.file.name}`)
                updateAttachment(entry.id, { status: 'uploading', progress: 0, error: '' })
                const form = new FormData()
                form.append('file', entry.file)

                try {
                    await axios.post(`${base}/${kind}/${id}/files`, form, {
                        onUploadProgress: ({ loaded, total }) => updateAttachment(entry.id, {
                            progress: total ? Math.min(100, Math.round(loaded / total * 100)) : 0,
                        }),
                    })
                    completedUploads.current.add(entry.id)
                    updateAttachment(entry.id, { status: 'uploaded', progress: 100 })
                } catch (error) {
                    updateAttachment(entry.id, { status: 'error', error: errorMessage(error) })
                    throw error
                }
            }

            setStage(publish ? 'Publishing…' : 'Saving draft…')
            // An existing assignment's assessment_id must not be sent in PATCH.
            await axios.patch(`${base}/${kind}/${id}`, { ...toSave, published: publish })

            // Once it's posted here, each class picked gets its own copy. A
            // copy that fails is reported; the post here stays.
            const copied = []
            const failed = []

            for (const target of also) {
                setStage(`Copying to ${target.subject} · ${target.section}…`)

                try {
                    await axios.post(`/classes/${encodeURIComponent(target.id)}/classwork/materials/copy`, {
                        source_class_id: Number(key[2]),
                        material_ids: [id],
                        published: true,
                    })
                    copied.push(target)
                } catch (error) {
                    // Say why only when trying again won't help (e.g. no
                    // longer their class); otherwise just how to retry.
                    const status = error.response?.status ?? 0
                    failed.push({ target, reason: status >= 400 && status < 500 ? errorMessage(error) : '' })
                }
            }

            return { id, copied, failed }
        },
        onSuccess: async ({ id, copied, failed }, { publish }) => {
            await client.invalidateQueries({ queryKey: key })

            // The classes copied to show the copy next time they're opened.
            copied.forEach((target) => {
                void client.invalidateQueries({ queryKey: [key[0], key[1], String(target.id)] })
            })

            const label = (target) => `${target.subject} · ${target.section}`

            toast.success(
                item
                    ? 'Changes saved'
                    : !publish
                        ? 'Draft saved'
                        : assignment ? 'Assignment posted' : 'Material posted',
                { description: copied.length ? `Also posted to ${copied.map(label).join(', ')}.` : title.trim() }
            )

            if (failed.length) {
                const reason = failed.find((entry) => entry.reason)?.reason

                toast.warning(`Not posted to ${failed.map(({ target }) => label(target)).join(', ')}`, {
                    description: [
                        reason,
                        `It’s posted here. To add it there, open ${failed.length === 1 ? 'that class' : 'those classes'} and choose Copy from another class.`,
                    ].filter(Boolean).join(' '),
                    duration: 10_000,
                })
            }

            onSaved(id)
        },
        onError: () => {
            setStage('')
            // A partially completed creation is still discoverable as a draft.
            void client.invalidateQueries({ queryKey: key })
        },
        onSettled: () => { saving.current = false },
    })

    useEffect(() => {
        if (!save.isPending) return
        const preventRefresh = (event) => { event.preventDefault(); event.returnValue = '' }
        window.addEventListener('beforeunload', preventRefresh)
        return () => window.removeEventListener('beforeunload', preventRefresh)
    }, [save.isPending])

    function submit(event) {
        event.preventDefault()

        if (
            saving.current
            || creatingAssessment
            || attachments.some((entry) => entry.status === 'invalid')
        ) {
            return
        }

        if (assignment && !recordId && !selectedAssessment) return
        if (assignment && invalidDueAt) return
        if (assignment && settingsProblem(submission)) return
        if (!title.trim()) return

        const intent = event.nativeEvent.submitter?.value

        const publish = intent === 'draft'
            ? false
            : item
                ? published
                : true

        const fields = {
            title: title.trim(),
            body_format: 'html',

            ...(assignment
                ? {
                    instructions: body,
                    submission_settings: fromDraft(submission),
                    questions: questionsPayload(submission),
                    due_at: dueAt ? new Date(dueAt).toISOString() : null,
                    allow_late: allowLate,
                    material_ids: materialIds.map(Number),
                }
                : {
                    description: body,
                }),
        }

        saving.current = true

        save.mutate({
            fields,
            publish,
            files: [...attachments],
            assessmentId: selectedAssessment?.id,
            also: offersCopies && publish ? targets.filter((target) => alsoIds.includes(target.id)) : [],
        })
    }

    const disabled = save.isPending || creatingAssessment

    // Say why the save buttons are disabled instead of leaving users to guess.
    const blockedReason = !title.trim()
        ? 'Add a title to continue.'
        : assignment && settingsProblem(submission)
            ? settingsProblem(submission)
        : assignment && !recordId && !selectedAssessment
            ? 'Choose or create a linked assessment.'
            : assignment && invalidDueAt
                ? 'Set a due time or clear the due date.'
                : attachments.some((entry) => entry.status === 'invalid')
                    ? 'Remove the files that can’t be uploaded.'
                    : ''
    const invalid = Boolean(blockedReason)
    const assessmentTitle = item?.assessment_name || selectedAssessment?.name || 'Linked grading assessment'
    const maximum = item?.max_score ?? selectedAssessment?.max_score
    const close = () => { if (!saving.current && !disabled) setDrawerOpen(false) }

    return (
        <Drawer open={drawerOpen} swipeDirection={isMobile ? 'down' : 'right'} showSwipeHandle={false}
            disablePointerDismissal
            onOpenChange={(nextOpen, details) => {
                // Only our buttons (or a successful save) close this editor.
                // Cancel Escape, backdrop presses, and swipe dismissal.
                if (!nextOpen) {
                    details.cancel()
                    return
                }
                setDrawerOpen(nextOpen)
            }}
            onOpenChangeComplete={(open) => {
                if (open) setOpened(true)
                else onClose()
            }}>
            {/* overflow-clip, not hidden: a hidden box can still be scrolled
                by script (scrollIntoView, focus), which would shift the drawer. */}
            <DrawerContent data-base-ui-swipe-ignore className="overflow-clip data-[swipe-axis=y]:h-[92dvh] data-[swipe-axis=y]:max-h-[92dvh] data-[swipe-axis=x]:w-[calc(100vw-1rem)] data-[swipe-axis=x]:sm:w-[calc(100vw-1rem)] data-[swipe-axis=x]:lg:w-[60rem]">
                <DrawerHeader className="gap-2 border-b border-border p-4 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
                    <div className="flex items-center justify-between gap-3">
                        <DrawerTitle className="flex items-center gap-2">
                            <span className="rounded-lg bg-primary/10 p-2 text-primary"><Icon className="size-5" /></span>
                            {item ? 'Edit' : 'Create'} {assignment ? 'assignment' : 'material'}
                        </DrawerTitle>
                        <Button type="button" variant="ghost" size="icon" aria-label="Show guide" title="Show guide" disabled={disabled}
                            onClick={guide.start} className="ml-auto shrink-0 text-muted-foreground hover:text-foreground">
                            <CircleHelp className="size-4" aria-hidden="true" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" aria-label="Close editor" disabled={disabled} onClick={close} className="shrink-0">
                            <X className="size-4" aria-hidden="true" />
                        </Button>
                    </div>
                    <DrawerDescription>Add the details and attach files, then {assignment ? 'assign the work' : 'post the material'} to your class.</DrawerDescription>
                </DrawerHeader>

                <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
                    <div ref={setScroller} className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4">
                        <div className={`grid min-w-0 grid-cols-1 gap-5 ${assignment ? 'lg:grid-cols-[minmax(0,1fr)_260px]' : ''}`}>
                            {/* The work reads top to bottom: details, attachments,
                                what students submit, related materials. Below lg the
                                settings aside comes right after the details, so the
                                required linked assessment is not buried; `contents`
                                lets the grid reorder these sections. */}
                            <div className={cn('min-w-0 space-y-4', assignment && 'max-lg:contents max-lg:space-y-0')}>
                                <div className="space-y-4 rounded-xl border bg-background p-3 sm:p-4" data-tour="editor-details">
                                    <label className="block space-y-2 text-sm font-medium">Title
                                        <Input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={255} disabled={disabled} placeholder={assignment ? 'e.g. Week 1 laboratory report' : 'e.g. Week 1 reading materials'} />
                                    </label>
                                    <RichTextEditor
                                        value={body}
                                        onChange={setBody}
                                        disabled={disabled}
                                        label={assignment ? 'Instructions' : 'Description'}
                                        optional
                                    />
                                </div>

                                <div className="min-w-0 space-y-4 max-lg:order-2" data-tour="editor-attachments">
                                    {/* One "(optional)", on the first Attachments heading. */}
                                    {item && <Files kind={kind} id={item.id} optional removable />}
                                    <AttachmentPicker files={attachments} onChange={setAttachments} disabled={disabled} optional={!item} />
                                    {!assignment && item && <label className="flex items-start gap-2 text-sm"><Checkbox checked={published} disabled={disabled} onCheckedChange={(value) => setPublished(value === true)} />Published — visible to enrolled students</label>}
                                </div>

                                {offersCopies && targets.length > 0 && (
                                    <AlsoPostTo targets={targets} value={alsoIds} onChange={setAlsoIds} disabled={disabled} />
                                )}

                                {assignment && (
                                    <SubmissionSettings
                                        data-tour="editor-submit"
                                        value={submission}
                                        onChange={setSubmission}
                                        disabled={disabled}
                                        savedType={item?.submission_settings?.type}
                                        className="max-lg:order-3"
                                    />
                                )}

                                {assignment && (
                                    <RelatedMaterialSelect
                                        value={materialIds}
                                        onChange={setMaterialIds}
                                        disabled={disabled}
                                        className="max-lg:order-4"
                                    />
                                )}
                            </div>

                            {assignment && <aside ref={setSettingsPanel} aria-label="Assignment settings" style={{ top: settingsTop }} data-tour="editor-settings"
                                className="min-w-0 self-start space-y-5 rounded-xl border bg-muted/20 p-3 max-lg:order-1 sm:p-4 lg:sticky">
                                <h3 className="border-b border-border pb-3 text-sm font-semibold">Assignment settings</h3>
                                {!recordId && <AssessmentSelect selected={selectedAssessment} onChange={setSelectedAssessment} disabled={disabled} onBusyChange={setCreatingAssessment} />}
                                {recordId && <div><p className="text-sm font-medium">Linked assessment</p><p className="break-words text-sm text-muted-foreground">{assessmentTitle}</p></div>}
                                {maximum != null && <div><p className="text-sm font-medium">Points</p><p className="text-2xl font-semibold">{maximum}</p><p className="text-xs text-muted-foreground">Uses the assessment's maximum score.</p></div>}
                                <div className="space-y-3">
                                    <Field>
                                        <div className="flex items-center justify-between gap-2">
                                            <FieldLabel htmlFor={dueDateId}>Due date (optional)</FieldLabel>
                                            {dueDatePart && (
                                                <Button type="button" variant="ghost" size="sm" disabled={disabled}
                                                    className="h-7 px-2 text-xs" aria-label="Clear due date"
                                                    onClick={() => { setDueAt(''); setDueDateOpen(false) }}>
                                                    Clear
                                                </Button>
                                            )}
                                        </div>
                                        <Popover open={dueDateOpen && !disabled} onOpenChange={setDueDateOpen}>
                                            <PopoverTrigger asChild>
                                                <Button type="button" variant="outline" id={dueDateId} disabled={disabled}
                                                    className={cn('h-9 w-full justify-start text-left font-normal', !selectedDueDate && 'text-muted-foreground')}>
                                                    <CalendarDays className="mr-2 size-4 shrink-0" />
                                                    {selectedDueDate ? format(selectedDueDate, 'PP') : 'Select date'}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="z-[60] w-auto overflow-hidden p-0" align="start">
                                                <Calendar mode="single" selected={selectedDueDate} defaultMonth={selectedDueDate}
                                                    captionLayout="dropdown" disabled={
                                                        disabled
                                                            ? true
                                                            : { before: startOfDay(new Date()) }
                                                    } autoFocus
                                                    startMonth={new Date(Math.min(calendarYear - 10, selectedYear), 0)}
                                                    endMonth={new Date(Math.max(calendarYear + 10, selectedYear), 11)}
                                                    onSelect={selectDueDate} />
                                            </PopoverContent>
                                        </Popover>
                                    </Field>
                                    <Field className="w-36 max-w-full">
                                        <FieldLabel htmlFor={dueTimeId}>Time</FieldLabel>
                                        <Input type="time" id={dueTimeId} step="60" value={dueTimePart}
                                            disabled={disabled || !dueDatePart} required={Boolean(dueDatePart)}
                                            aria-invalid={invalidDueAt} aria-describedby={`${dueTimeId}-help`}
                                            onChange={(event) => setDueAt(`${dueDatePart}T${event.target.value}`)}
                                            className="h-9 appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none" />
                                    </Field>
                                    <p id={`${dueTimeId}-help`} className={cn('text-xs', invalidDueAt ? 'text-destructive' : 'text-muted-foreground')}>
                                        {invalidDueAt ? 'Select a time or clear the due date.' : 'Your local time.'}
                                    </p>
                                </div>
                                <div className="space-y-1.5">
                                    <label className={`flex items-center gap-2 text-sm ${disabled || !dueAt ? 'text-muted-foreground' : ''}`}>
                                        <Checkbox checked={Boolean(dueAt) && allowLate} disabled={disabled || !dueAt} onCheckedChange={(value) => setAllowLate(value === true)} />
                                        Allow late submissions
                                    </label>
                                    {!dueAt && <p className="text-xs text-muted-foreground">Select a due date to enable this option.</p>}
                                </div>
                                {item && <label className="flex items-start gap-2 text-sm"><Checkbox checked={published} disabled={disabled} onCheckedChange={(value) => setPublished(value === true)} />Published — visible to enrolled students</label>}
                            </aside>}
                        </div>

                        <div className="space-y-2" aria-live="polite">
                            {stage && <p className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin" />{stage}</p>}
                            <ErrorNotice error={save.error} />
                            {save.isError && recordId && <p className="text-sm text-muted-foreground">
                                {item ? 'The item still exists.' : 'Your draft is saved.'} Files marked Uploaded are already attached. Retry to finish, or close and return later.
                            </p>}
                        </div>

                    </div>
                    <DrawerFooter className="flex-row flex-wrap items-center justify-end gap-2 border-t border-border bg-background p-4" data-tour="editor-actions">
                        {blockedReason && !save.isPending && (
                            <p className="w-full text-xs text-muted-foreground sm:mr-auto sm:w-auto">
                                {blockedReason}
                            </p>
                        )}
                        <Button type="button" variant="ghost" disabled={disabled} onClick={close}>{recordId && !item ? 'Close · keep draft' : 'Cancel'}</Button>
                        {!item && <Button type="submit" name="intent" value="draft" variant="outline" disabled={disabled || invalid} className="border-border bg-background text-foreground hover:bg-muted disabled:text-muted-foreground dark:bg-background dark:hover:bg-muted">Save draft</Button>}
                        <Button type="submit" name="intent" value="publish" disabled={disabled || invalid}>
                            {disabled
                                ? 'Saving…'
                                : item ? 'Save changes'
                                    : assignment ? 'Assign'
                                        : alsoIds.length ? `Post to ${alsoIds.length + 1} classes` : 'Post material'}
                        </Button>
                    </DrawerFooter>
                </form>
                {/* Where the editor's guide draws: over the whole drawer. */}
                <div ref={setGuideHost} className="pointer-events-none absolute inset-0 z-[60] rounded-xl" />
                {guide.tour}
            </DrawerContent>
        </Drawer>
    )
}
