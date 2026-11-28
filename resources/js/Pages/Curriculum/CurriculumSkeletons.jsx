import React from "react";
import { Skeleton } from "@/Components/ui/skeleton";

// Placeholders shaped like the curriculum pages, so nothing jumps when the data arrives.
// Widths vary a little row to row so the lists don't look like stripes.
const TITLE_WIDTHS = ["w-48", "w-64", "w-40", "w-56", "w-44", "w-72", "w-52", "w-36", "w-60"];
const CODE_WIDTHS = ["w-14", "w-16", "w-12", "w-[4.5rem]", "w-14", "w-16", "w-12"];
const pick = (list, index) => list[index % list.length];

const YEAR_KEYS = ["firstYear", "secondYear", "thirdYear", "fourthYear"];

/** One semester of the curriculum page (CurriculumTable): strip, column headers, rows. */
function SemesterSkeleton({ rows, offset = 0 }) {
    return (
        <div className="min-w-0 border-l-2 border-l-border">
            <div className="flex items-center justify-between gap-2 bg-muted px-3 py-1.5">
                <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-4 rounded-[4px]" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="hidden h-3 w-44 sm:block" />
                </div>
                <Skeleton className="h-7 w-28" />
            </div>
            <div className="overflow-hidden">
                <table className="w-full min-w-[880px] text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground">
                        <tr>
                            <th className="h-8 w-32 px-3 text-left font-medium">Subject code</th>
                            <th className="h-8 px-3 text-left font-medium">Descriptive title</th>
                            <th className="h-8 w-16 px-2 text-center font-medium">Units</th>
                            <th className="h-8 w-16 px-2 text-center font-medium">Lec</th>
                            <th className="h-8 w-16 px-2 text-center font-medium">Lab</th>
                            <th className="h-8 w-20 px-2 text-center font-medium">Hrs/week</th>
                            <th className="h-8 w-48 px-3 text-left font-medium">Prerequisites</th>
                            <th className="h-8 w-20 px-3 text-right font-medium">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: rows }, (_, i) => (
                            <tr key={i} className="border-b border-border/50">
                                <td className="px-3 py-2.5"><Skeleton className={`h-3.5 ${pick(CODE_WIDTHS, i + offset)}`} /></td>
                                <td className="px-3 py-2.5"><Skeleton className={`h-3.5 ${pick(TITLE_WIDTHS, i + offset)}`} /></td>
                                {[0, 1, 2, 3].map((n) => <td key={n} className="px-2 py-2.5"><Skeleton className="mx-auto h-3.5 w-4" /></td>)}
                                <td className="px-3 py-2.5"><Skeleton className="h-3.5 w-10" /></td>
                                <td className="px-3 py-2"><div className="flex justify-end gap-1.5"><Skeleton className="h-6 w-6" /><Skeleton className="h-6 w-6" /></div></td>
                            </tr>
                        ))}
                        <tr className="bg-muted/30">
                            <td colSpan={2} className="px-3 py-2"><Skeleton className="h-3 w-24" /></td>
                            {[0, 1, 2, 3].map((n) => <td key={n} className="px-2 py-2"><Skeleton className="mx-auto h-3.5 w-5" /></td>)}
                            <td colSpan={2} />
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/**
 * The curriculum page (CurriculumInfo) while it loads. Years the person had open (remembered
 * per curriculum) show their semester tables; closed years show just their header.
 */
export function CurriculumPageSkeleton({ openYears = { firstYear: true } }) {
    return (
        <div className="min-w-0 py-2" role="status" aria-busy="true" aria-label="Loading curriculum">
            <span className="sr-only">Loading curriculum…</span>
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {["w-14", "w-10", "w-8", "w-16"].map((width, i) => (
                        <div key={i} className="rounded-lg bg-muted/50 px-3 py-4 sm:px-5">
                            <div className="flex items-center justify-between gap-2"><Skeleton className={`h-7 ${width}`} /><Skeleton className="hidden size-4 sm:block" /></div>
                            <Skeleton className="mt-2 h-3.5 w-24" />
                        </div>
                    ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">{["w-[5.5rem]", "w-28", "w-24", "w-28"].map((width, i) => <Skeleton key={i} className={`h-8 ${width}`} />)}</div>
                    <div className="flex items-center gap-4"><Skeleton className="h-5 w-64 max-w-full" /><Skeleton className="h-8 w-20" /></div>
                </div>
            </div>

            <div className="space-y-5 mt-5">
                {YEAR_KEYS.map((key, yearIndex) => (
                    <div key={key} className="min-w-0 rounded-xl border bg-card">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
                            <Skeleton className="size-5 rounded" />
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-3.5 w-48" />
                        </div>
                        {openYears[key] && (
                            <div className="space-y-4 px-3 pb-3 sm:px-4 sm:pb-4">
                                <SemesterSkeleton rows={yearIndex === 0 ? 9 : 7} offset={yearIndex} />
                                <SemesterSkeleton rows={yearIndex === 0 ? 9 : 7} offset={yearIndex + 3} />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

/** The compare page (CurriculumCompare) results while the first comparison loads. */
export function CompareSkeleton() {
    return (
        <div className="space-y-5" role="status" aria-busy="true" aria-label="Comparing curriculum years">
            <span className="sr-only">Comparing curriculum years…</span>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="rounded-lg bg-muted/50 px-4 py-3">
                        <Skeleton className="h-7 w-20" />
                        <Skeleton className="mt-1.5 h-3.5 w-32" />
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap gap-1.5">{["w-32", "w-20", "w-24", "w-24", "w-28"].map((width, i) => <Skeleton key={i} className={`h-8 ${width}`} />)}</div>
            <Skeleton className="h-3 w-full max-w-xl" />
            {[6, 4].map((rows, group) => (
                <div key={group} className="min-w-0 border-l-2 border-l-border">
                    <div className="flex items-center gap-2 bg-muted px-3 py-1.5">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-4 rounded-[4px]" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    <div className="overflow-hidden">
                        <table className="w-full min-w-[900px] text-sm">
                            <thead className="bg-muted/40 text-xs text-muted-foreground">
                                <tr>
                                    <th className="h-8 w-24 px-3 text-left font-medium">Status</th>
                                    <th className="h-8 w-40 px-3 text-left font-medium">Subject code</th>
                                    <th className="h-8 px-3 text-left font-medium">Descriptive title</th>
                                    <th className="h-8 w-20 px-3 text-center font-medium">Units</th>
                                    <th className="h-8 w-48 px-3 text-left font-medium">Prerequisites</th>
                                    <th className="h-8 w-64 px-3 text-left font-medium">What changed</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: rows }, (_, i) => (
                                    <tr key={i} className="border-b border-border/50">
                                        <td className="px-3 py-2"><Skeleton className="h-5 w-16 rounded" /></td>
                                        <td className="px-3 py-2"><Skeleton className={`h-3.5 ${i % 3 === 0 ? "w-28" : pick(CODE_WIDTHS, i + group)}`} /></td>
                                        <td className="px-3 py-2"><Skeleton className={`h-3.5 ${pick(TITLE_WIDTHS, i + group * 2)}`} /></td>
                                        <td className="px-3 py-2"><Skeleton className="mx-auto h-3.5 w-5" /></td>
                                        <td className="px-3 py-2"><Skeleton className="h-3.5 w-10" /></td>
                                        <td className="px-3 py-2"><div className="flex gap-1"><Skeleton className="h-5 w-12" />{i % 2 === 0 && <Skeleton className="h-5 w-24" />}</div></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Result rows of "Use existing subject" (SubjectDialog) while the search runs. */
export function SubjectResultsSkeleton({ rows = 4 }) {
    return (
        <div role="status" aria-busy="true" aria-label="Loading subjects">
            <span className="sr-only">Loading subjects…</span>
            {Array.from({ length: rows }, (_, i) => (
                <div key={i} className="space-y-1.5 border-b px-3 py-3 last:border-b-0">
                    <Skeleton className={`h-4 ${pick(CODE_WIDTHS, i)}`} />
                    <Skeleton className={`h-3.5 ${pick(TITLE_WIDTHS, i + 2)} max-w-full`} />
                    <Skeleton className="h-3 w-40" />
                    <Skeleton className="h-3 w-52 max-w-full" />
                </div>
            ))}
        </div>
    );
}

/** A program card of the curriculum library (CoursesCurriculumLists) while programs load. */
export function ProgramCardSkeleton({ versions = 3 }) {
    return (
        <div className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/80 shadow-sm" aria-hidden="true">
            <div className="space-y-4 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                    <Skeleton className="h-11 w-20 rounded-lg" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-5 w-4/5" />
                    <Skeleton className="h-4 w-1/2" />
                </div>
            </div>
            <div className="flex-1 space-y-1 px-5 pb-5 sm:px-6 sm:pb-6">
                <div className="mb-2 flex items-center justify-between"><Skeleton className="h-3 w-28" /><Skeleton className="h-3 w-20" /></div>
                {Array.from({ length: versions }, (_, i) => (
                    <div key={i} className="flex min-h-14 items-center gap-3 px-3 py-3">
                        <Skeleton className="size-4" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="ml-auto size-4" />
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-1 gap-2 border-t border-border/60 bg-muted/20 px-5 py-4 sm:grid-cols-2 sm:px-6">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
            </div>
        </div>
    );
}
