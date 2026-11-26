import { Card, CardContent, CardHeader } from '@/Components/ui/card'
import { Skeleton } from '@/Components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { SubmissionBar } from './SubmissionBar'

// Placeholders shaped like the grades tab, so nothing jumps when it loads.
// The widths vary a little row to row so the list doesn't look like stripes.
const NAME_WIDTHS = ['w-40', 'w-52', 'w-36', 'w-48', 'w-44', 'w-56', 'w-40', 'w-32']

/** The grade list (GradesStudentList): a table on wider screens, cards on phones. */
export function GradeListSkeleton({ rows = 8 }) {
    const list = Array.from({ length: rows })

    return (
        <Card aria-busy="true" aria-label="Loading grades">
            <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                    <Skeleton className="size-4 shrink-0 rounded-full" />
                    <Skeleton className="h-4 w-full max-w-md" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="hidden md:block">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-8 text-center">#</TableHead>
                                <TableHead>ID NUMBER</TableHead>
                                <TableHead>STUDENT NAME</TableHead>
                                <TableHead className="text-center">MIDTERM</TableHead>
                                <TableHead className="text-center">FINAL</TableHead>
                                <TableHead className="text-center">FINAL RATING</TableHead>
                                <TableHead className="text-center">REMARKS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {list.map((_, index) => (
                                <TableRow key={index} className="hover:bg-transparent">
                                    <TableCell className="text-center"><Skeleton className="mx-auto h-4 w-4" /></TableCell>
                                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                                    <TableCell><Skeleton className={`h-4 ${NAME_WIDTHS[index % NAME_WIDTHS.length]}`} /></TableCell>
                                    <TableCell className="py-1.5"><Skeleton className="mx-auto h-9 w-20" /></TableCell>
                                    <TableCell className="py-1.5"><Skeleton className="mx-auto h-9 w-20" /></TableCell>
                                    <TableCell><Skeleton className="mx-auto h-4 w-8" /></TableCell>
                                    <TableCell><Skeleton className="mx-auto h-5 w-16 rounded-full" /></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <ul className="divide-y md:hidden">
                    {list.map((_, index) => (
                        <li key={index} className="space-y-2 py-3">
                            <div className="flex items-start justify-between gap-3">
                                <div className="space-y-1.5">
                                    <Skeleton className={`h-4 ${NAME_WIDTHS[index % NAME_WIDTHS.length]}`} />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {['Midterm', 'Final', 'Rating'].map((label) => (
                                    <div key={label} className="space-y-1">
                                        <p className="text-xs text-muted-foreground">{label}</p>
                                        <Skeleton className="h-9 w-full" />
                                    </div>
                                ))}
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}

/** One period's card in the submission bar (SubmissionPanel). */
function SubmissionPanelSkeleton({ title }) {
    return (
        <div className="rounded-xl border bg-card px-3 py-2.5">
            <div className="flex h-8 items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <div className="flex gap-1">
                        {[0, 1, 2, 3].map((step) => <Skeleton key={step} className="h-1 flex-1 rounded-full" />)}
                    </div>
                </div>
                <Skeleton className="h-9 w-24" />
            </div>
        </div>
    )
}

/** The submission bar with both periods. */
export function SubmissionBarSkeleton() {
    return (
        <SubmissionBar>
            <SubmissionPanelSkeleton title="Midterm grade" />
            <SubmissionPanelSkeleton title="Final grade" />
        </SubmissionBar>
    )
}

/** The whole tab: toolbar, list and submission bar. */
export default function GradesSkeleton({ rows = 8 }) {
    return (
        <div className="grades-panel relative space-y-4 pb-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <Skeleton className="size-4 rounded-full" />
                    <Skeleton className="h-4 w-28" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Skeleton className="h-9 w-44" />
                    <Skeleton className="h-9 w-36" />
                    <Skeleton className="h-9 w-24" />
                </div>
            </div>

            <GradeListSkeleton rows={rows} />
            <SubmissionBarSkeleton />
        </div>
    )
}
