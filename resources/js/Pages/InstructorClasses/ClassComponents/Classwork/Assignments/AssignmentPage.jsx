import React from 'react'
import { Link } from '@inertiajs/react'
import { ArrowLeft, CalendarDays, ClipboardList, SearchX, Trophy } from 'lucide-react'

import { Button } from '@/Components/ui/button'
import { Skeleton } from '@/Components/ui/skeleton'
import { formatFullName } from '@/Lib/Utils'

import Files from '../Shared/Files'
import RelatedMaterials from '../Shared/RelatedMaterials'
import RichTextContent from '../Shared/RichTextContent'
import { ErrorNotice, formatDateTime, useClassworkQuery } from '../Shared/api'
import StudentWork from './StudentWork'

const PERIODS = { midterm: 'Midterm', final: 'Final' }

// Two columns from `lg`: the assignment, and the "Your work" panel.
const COLUMNS = 'grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]'

function PageSkeleton() {
    return (
        <div role="status" aria-label="Loading assignment" className={COLUMNS}>
            <div className="space-y-4">
                <div className="flex items-start gap-4">
                    <Skeleton className="size-12 shrink-0 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-7 w-2/3" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </div>
                <Skeleton className="h-px w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
            </div>
            <Skeleton className="h-56 w-full rounded-xl" />
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
                <p className="text-sm text-muted-foreground">
                    Your instructor may have removed it or taken it down for now.
                </p>
            </div>
            <Button asChild variant="outline">
                <Link href={backHref}>Back to classwork</Link>
            </Button>
        </div>
    )
}

// The status lives on the "Your work" card, which follows the content.
function Header({ item, instructor }) {
    const due =item.due_at ? formatDateTime(item.due_at) : null
    const policy = item.due_at
        ? item.allow_late ? 'Late work accepted' : 'Closes at the due date'
        : null
    const byline = [
        instructor && formatFullName(instructor),
        item.category,
        PERIODS[item.period],
    ].filter(Boolean).join(' · ')

    return (
        <header className="space-y-4">
            <div className="flex items-start gap-3 sm:gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground sm:size-12" aria-hidden="true">
                    <ClipboardList className="size-5 sm:size-6" />
                </span>

                <div className="min-w-0 flex-1 space-y-1.5">
                    <h2 className="break-words text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                        {item.title}
                    </h2>
                    {byline && <p className="text-sm text-muted-foreground">{byline}</p>}
                </div>
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

/**
 * One assignment on its own page, for a student: the instructions on the
 * left, "Your work" on the right (stacked on phones). The data comes from
 * the cached classwork list, so opening it from the class is instant.
 */
export default function AssignmentPage({ assignmentId, backHref, backLabel, instructor }) {
    const query = useClassworkQuery('assignments')
    const item = query.data?.items?.find((entry) => entry.id === assignmentId)

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
                <StudentWork key={item.id} assignment={item}>
                    {({ answers, panel }) => (
                        <div className={COLUMNS}>
                            <div className="min-w-0 space-y-6">
                                <Header item={item} instructor={instructor} />

                                <RichTextContent
                                    value={item.instructions}
                                    format={item.body_format ?? 'text'}
                                />

                                <Files kind="assignments" id={item.id} hideEmpty headingLevel={3} />

                                {item.material_ids?.length > 0 && (
                                    <RelatedMaterials materialIds={item.material_ids} />
                                )}

                                {answers}
                            </div>

                            <div className="min-w-0 space-y-4">
                                {panel}
                            </div>
                        </div>
                    )}
                </StudentWork>
            )}
        </div>
    )
}
