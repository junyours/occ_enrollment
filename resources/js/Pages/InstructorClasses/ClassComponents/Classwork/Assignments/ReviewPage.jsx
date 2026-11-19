import React, { useState } from 'react'
import { Link } from '@inertiajs/react'
import { ArrowLeft, CalendarDays, ClipboardList, Pencil, SearchX, Trophy } from 'lucide-react'

import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Skeleton } from '@/Components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs'

import Editor from '../Shared/Editor'
import Files from '../Shared/Files'
import RelatedMaterials from '../Shared/RelatedMaterials'
import RichTextContent from '../Shared/RichTextContent'
import { GuideButton, useGuide } from '../Shared/GuideTour'
import { instructionsGuide, studentWorkGuide } from '../Shared/guides'
import { ErrorNotice, formatDateTime, useClassworkQuery } from '../Shared/api'
import { QUESTION_TYPES, SUBMISSION_TYPES, describeFiles, normalizeSettings } from '../Shared/submissionRules'
import SubmissionReview from './SubmissionReview'

const PERIODS = { midterm: 'Midterm', final: 'Final' }
const TRIGGER = 'h-8 flex-1 gap-2 px-4 sm:flex-none'

function PageSkeleton() {
    return (
        <div role="status" aria-label="Loading assignment" className="space-y-4">
            <div className="flex items-start gap-4">
                <Skeleton className="size-12 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-7 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </div>
            <Skeleton className="h-px w-full" />
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-48 w-full rounded-xl" />
        </div>
    )
}

function Unavailable({ backHref }) {
    return (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-12 text-center">
            <span className="rounded-full bg-muted p-3 text-muted-foreground">
                <SearchX className="size-6" aria-hidden="true" />
            </span>
            <div className="space-y-1">
                <p className="font-medium text-foreground">This assignment isn’t available</p>
                <p className="text-sm text-muted-foreground">It may have been deleted, or its grading assessment removed.</p>
            </div>
            <Button asChild variant="outline">
                <Link href={backHref}>Back to classwork</Link>
            </Button>
        </div>
    )
}

function Header({ item, onEdit }) {
    const due = item.due_at ? formatDateTime(item.due_at) : null
    const policy = item.due_at
        ? item.allow_late ? 'Late work accepted' : 'Closes at the due date'
        : null
    const byline = [item.category, PERIODS[item.period], item.assessment_name && `Scores go to ${item.assessment_name}`]
        .filter(Boolean)
        .join(' · ')

    return (
        <header className="space-y-4">
            <div className="flex items-start gap-3 sm:gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:size-12" aria-hidden="true">
                    <ClipboardList className="size-5 sm:size-6" />
                </span>

                <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        <h2 className="break-words text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                            {item.title}
                        </h2>
                        <Badge variant="secondary" className="h-6 rounded-lg border border-border bg-muted/70 px-2.5 text-xs font-medium">
                            {item.published ? 'Published' : 'Draft'}
                        </Badge>
                    </div>
                    {byline && <p className="text-sm text-muted-foreground">{byline}</p>}
                </div>

                <Button type="button" variant="outline" onClick={onEdit} data-tour="review-edit"
                    aria-label={`Edit ${item.title}`} className="shrink-0 gap-2 px-3">
                    <Pencil className="size-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Edit</span>
                </Button>
            </div>

            <dl className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-b border-border pb-4 text-sm">
                <div className="flex items-center gap-2">
                    <dt className="sr-only">Points</dt>
                    <Trophy className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <dd className="font-medium text-foreground">{item.max_score} points</dd>
                </div>

                <div className="flex min-w-0 items-center gap-2">
                    <dt className="sr-only">Due</dt>
                    <CalendarDays className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <dd className="min-w-0">
                        <span className="font-medium text-foreground">{due ? `Due ${due}` : 'No due date'}</span>
                        {policy && <span className="text-muted-foreground"> · {policy}</span>}
                    </dd>
                </div>
            </dl>
        </header>
    )
}

// What students hand in, as the teacher set it up.
function HandIn({ item }) {
    const settings = normalizeSettings(item.submission_settings)
    const questions = settings.type === 'questions' ? (item.questions ?? []) : []

    return (
        <section aria-labelledby={`hand-in-${item.id}`} className="space-y-2 rounded-xl border border-border bg-card p-4" data-tour="review-hand-in">
            <h3 id={`hand-in-${item.id}`} className="text-sm font-semibold text-foreground">What students hand in</h3>

            <p className="text-sm text-foreground">
                {SUBMISSION_TYPES[settings.type]?.label}
                <span className="text-muted-foreground">
                    {settings.type === 'files' && ` · ${describeFiles(settings.files)}`}
                    {settings.type === 'links' && ` · ${settings.links.domain ? `on ${settings.links.domain}, ` : ''}up to ${settings.links.max_links}`}
                </span>
            </p>

            {questions.length > 0 && (
                <ol className="space-y-2 pt-1">
                    {questions.map((question, index) => (
                        <li key={question.id} className="text-sm">
                            <span className="text-xs font-medium text-muted-foreground">
                                Question {index + 1} · {QUESTION_TYPES[question.type]?.label ?? question.type}
                                {questions.length > 1 && !question.required && ' · optional'}
                            </span>
                            <span className="block whitespace-pre-wrap break-words text-foreground">{question.prompt}</span>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    )
}

function Instructions({ item, guideButton }) {
    return (
        <div className="space-y-6">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1" data-tour="review-instructions">
                    {item.instructions ? (
                        <RichTextContent value={item.instructions} format={item.body_format ?? 'text'} />
                    ) : (
                        <p className="text-sm text-muted-foreground">No instructions yet. Use Edit to add some.</p>
                    )}
                </div>
                {guideButton}
            </div>

            <div data-tour="review-attachments">
                <Files kind="assignments" id={item.id} editable removable headingLevel={3} />
            </div>

            {item.material_ids?.length > 0 && (
                <div data-tour="review-materials">
                    <RelatedMaterials materialIds={item.material_ids} />
                </div>
            )}

            <HandIn item={item} />
        </div>
    )
}

/**
 * One assignment on its own page, for its teacher: the students' work
 * (where they stand, grading one by one) and, on a second tab, what was
 * posted. Data comes from the cached classwork list.
 */
export default function ReviewPage({ assignmentId, backHref, backLabel }) {
    const query = useClassworkQuery('assignments')
    const item = query.data?.items?.find((entry) => entry.id === assignmentId)
    const [tab, setTab] = useState('work')
    const [editing, setEditing] = useState(false)

    // Each tab has a guide: shown the first time a teacher opens that tab,
    // and again from its Guide button. Student work waits for the student
    // list it points at (the same cached request the tab makes).
    const submissions = useClassworkQuery(`assignments/${assignmentId}/submissions`, {
        enabled: Boolean(item),
    })
    const workGuide = useGuide({
        guide: 'review-work',
        steps: studentWorkGuide,
        ready: Boolean(item) && tab === 'work' && submissions.isSuccess && !editing,
    })
    const instructionsTour = useGuide({
        guide: 'review-instructions',
        steps: instructionsGuide,
        ready: Boolean(item) && tab === 'instructions' && !editing,
    })

    const progress = item?.progress

    return (
        <div className="min-w-0 space-y-5">
            <Link
                href={backHref}
                className="-ml-1 inline-flex max-w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
                <ArrowLeft className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{backLabel}</span>
            </Link>

            {query.isPending && <PageSkeleton />}

            {query.isError && (
                <div className="space-y-3">
                    <ErrorNotice error={query.error} />
                    <Button variant="outline" onClick={() => query.refetch()}>Try again</Button>
                </div>
            )}

            {query.isSuccess && !item && <Unavailable backHref={backHref} />}

            {item && (
                <>
                    <Header item={item} onEdit={() => setEditing(true)} />

                    <Tabs value={tab} onValueChange={setTab} className="min-w-0 space-y-4">
                        <TabsList className="h-10 w-full sm:w-auto" aria-label="Assignment sections" data-tour="review-tabs">
                            <TabsTrigger value="work" className={TRIGGER}>
                                Student work
                                {progress?.students > 0 && (
                                    <span className="rounded-full bg-background px-1.5 text-xs tabular-nums text-muted-foreground">
                                        {progress.turned_in}/{progress.students}
                                    </span>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="instructions" className={TRIGGER}>
                                Instructions
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="work" className="mt-0">
                            <SubmissionReview
                                assignment={item}
                                page
                                actions={<GuideButton onClick={workGuide.start} />}
                            />
                        </TabsContent>

                        <TabsContent value="instructions" className="mt-0">
                            <Instructions
                                item={item}
                                guideButton={<GuideButton onClick={instructionsTour.start} />}
                            />
                        </TabsContent>
                    </Tabs>

                    {editing && (
                        <Editor
                            kind="assignments"
                            item={item}
                            onClose={() => setEditing(false)}
                            onSaved={() => setEditing(false)}
                        />
                    )}

                    {workGuide.tour}
                    {instructionsTour.tour}
                </>
            )}
        </div>
    )
}
