import React, { useId, useState } from 'react'
import { ChevronDown, FileText, GraduationCap, Info, PieChart } from 'lucide-react'
import { CLASS_STANDING_WEIGHT, EXAM_WEIGHT, getGradeStatus } from './gradeCalculations'

const formatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })
const number = value => value == null ? '—' : formatter.format(value)
const percent = value => value == null ? '—' : `${Math.round(Number(value) + 1e-9)}%`
const points = value => value == null ? '—' : `${number(value)} pts`

const statusLabels = {
    passed: 'Passed', failed: 'Failed', incomplete: 'Incomplete',
    configuration: 'Check settings', invalid: 'Check scores',
}
const statusTones = {
    passed: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    failed: 'border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300',
    incomplete: 'border-border bg-muted text-muted-foreground',
}

function resultStatus(result) {
    const status = getGradeStatus(result?.equivalent)
    return {
        status,
        label: statusLabels[status === 'incomplete' ? result?.status : status] ?? 'Incomplete',
        grade: status === 'incomplete' ? '—' : Number(result.equivalent).toFixed(1),
    }
}

function GradePill({ result }) {
    const { status, label, grade } = resultStatus(result)
    return (
        <span className={`inline-flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${statusTones[status]}`}>
            <span className="text-base tabular-nums">{grade}</span>
            <span aria-hidden="true">·</span>
            {label}
        </span>
    )
}

function ContributionCard({ title, weight, value, contribution, icon: Icon }) {
    return (
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-blue-200/70 bg-blue-50/60 p-3 dark:border-blue-400/15 dark:bg-blue-400/5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-300">
                <Icon className="size-5" strokeWidth={1.7} aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{title} ({weight}%)</p>
                <p className="text-lg font-semibold leading-snug tabular-nums">{percent(value)}</p>
                <p className="text-xs text-muted-foreground tabular-nums">
                    {number(contribution)} / {weight} pts toward the term
                </p>
            </div>
        </div>
    )
}

function CategoryRow({ category }) {
    const [open, setOpen] = useState(false)
    const detailsId = useId()
    const complete = category.status === 'complete'
    const excluded = category.status === 'excluded'
    const hint = excluded ? 'Not counted (0% weight)'
        : complete ? null
            : category.status === 'incomplete' ? `${category.entered}/${category.total} scores entered`
                : statusLabels[category.status]

    return (
        <>
            <tr className="border-b border-border/60 hover:bg-muted/30">
                <th scope="row" className="px-3 py-2.5 text-left font-medium">
                    <button type="button" aria-expanded={open} aria-controls={detailsId}
                        aria-label={`${open ? 'Hide' : 'Show'} ${category.name} assessment scores`}
                        onClick={() => setOpen(value => !value)}
                        className="flex w-full items-start gap-1.5 rounded text-left outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <ChevronDown className={`mt-0.5 size-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                        <span className="break-words">
                            {category.name}
                            {hint && <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">{hint}</span>}
                        </span>
                    </button>
                </th>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums">
                    {category.entered ? number(category.earned) : '—'} / {number(category.maximum)}
                </td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums">{percent(category.percentage)}</td>
                <td className="whitespace-nowrap px-2 py-2.5 text-right text-muted-foreground tabular-nums">{percent(category.weight)}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums">{points(category.weighted_percentage)}</td>
            </tr>
            <tr hidden={!open}>
                <td colSpan={5} className="border-b border-border/60 bg-muted/25 p-3">
                    <div id={detailsId}>
                        {open && (
                            <div className="space-y-3">
                                <p className="text-xs font-medium">{category.name} assessments</p>
                                <table className="w-full text-xs">
                                    <caption className="sr-only">Assessment scores for {category.name}</caption>
                                    <thead className="text-muted-foreground">
                                        <tr>
                                            <th scope="col" className="pb-2 text-left font-normal">Assessment</th>
                                            <th scope="col" className="pb-2 text-right font-normal">Score / Maximum</th>
                                            <th scope="col" className="pb-2 pl-3 text-right font-normal">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {category.assessments.map(item => (
                                            <tr key={item.id}>
                                                <th scope="row" className="py-2 pr-3 text-left font-normal">{item.name}</th>
                                                <td className="whitespace-nowrap py-2 text-right tabular-nums">{number(item.score)} / {number(item.maximum)}</td>
                                                <td className={`py-2 pl-3 text-right ${item.status === 'invalid' ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                    {item.status === 'complete' ? 'Entered' : item.status === 'incomplete' ? 'Not entered' : 'Check score'}
                                                </td>
                                            </tr>
                                        ))}
                                        {!category.assessments.length && <tr><td colSpan={3} className="py-3 text-muted-foreground">No assessments in this category.</td></tr>}
                                    </tbody>
                                </table>
                                {complete ? (
                                    <div className="space-y-1 border-t border-border/60 pt-2 text-xs text-muted-foreground tabular-nums">
                                        <p>Earned %: {number(category.earned)} ÷ {number(category.maximum)} × 100 ≈ <strong className="text-foreground">{percent(category.percentage)}</strong></p>
                                        <p>Contribution: {percent(category.percentage)} × {percent(category.weight)} ≈ <strong className="text-foreground">{points(category.weighted_percentage)}</strong> to Class Standing.</p>
                                    </div>
                                ) : (
                                    <p className="text-xs text-muted-foreground">
                                        {excluded ? 'A 0% category contributes 0 points and does not block the term grade.'
                                            : 'Complete the scores and resolve any settings errors to calculate this category.'}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                </td>
            </tr>
        </>
    )
}

function TermDetails({ label, result, summary, isFinal = false }) {
    if (!result) return <p className="rounded-xl border p-4 text-muted-foreground">No {label.toLowerCase()} data.</p>

    const Icon = isFinal ? GraduationCap : FileText
    const standing = result.class_standing ?? null
    const exam = result.exam ?? {}
    const standingPoints = standing === null ? null : standing * CLASS_STANDING_WEIGHT / 100
    const examPoints = exam.percentage == null ? null : exam.percentage * EXAM_WEIGHT / 100
    const categories = result.category_results ?? []
    const { grade, label: statusLabel, status } = resultStatus(result)
    const complete = status !== 'incomplete'
    const issues = summary?.issues ?? []

    return (
        <section aria-label={`${label} grade breakdown`} className="min-w-0 space-y-3 rounded-xl border border-blue-200/70 bg-background p-3 dark:border-blue-400/20 dark:bg-[#0b1420] sm:p-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <span className={`flex size-9 items-center justify-center rounded-lg ${isFinal ? 'bg-violet-500/15 text-violet-600 dark:text-violet-300' : 'bg-blue-500/15 text-blue-600 dark:text-blue-300'}`}>
                        <Icon className="size-5" aria-hidden="true" />
                    </span>
                    {label} Details
                </h3>
                <GradePill result={result} />
            </header>

            {issues.length > 0 && (
                <ul className="list-disc space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 py-2 pl-6 pr-3 text-xs text-amber-800 dark:text-amber-200">
                    {issues.map(issue => <li key={issue}>{issue}</li>)}
                </ul>
            )}

            <div className="grid gap-2 sm:grid-cols-2">
                <ContributionCard title="Class Standing" weight={CLASS_STANDING_WEIGHT} value={standing} contribution={standingPoints} icon={PieChart} />
                <ContributionCard title="Exam" weight={EXAM_WEIGHT} value={exam.percentage} contribution={examPoints} icon={FileText} />
            </div>

            <div className="overflow-hidden rounded-lg border border-border/70">
                <div className="border-b border-border/70 bg-muted/60 px-3 py-2">
                    <h4 className="text-xs font-semibold">Class Standing Breakdown ({label})</h4>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Expand a category to see its assessment scores.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[440px] text-xs">
                        <caption className="sr-only">{label} category scores, student performance, category weights, and contributions to class standing.</caption>
                        <thead className="border-b border-border/70 bg-muted/20 text-muted-foreground">
                            <tr>
                                <th scope="col" className="px-3 py-2 text-left font-medium">Category</th>
                                <th scope="col" className="px-2 py-2 text-right font-medium">Score</th>
                                <th scope="col" className="px-2 py-2 text-right font-medium">Earned %</th>
                                <th scope="col" className="px-2 py-2 text-right font-medium">Weight</th>
                                <th scope="col" className="px-3 py-2 text-right font-medium">Contribution</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map(category => <CategoryRow key={category.id} category={category} />)}
                            {!categories.length && <tr><td colSpan={5} className="p-3 text-muted-foreground">No categories configured.</td></tr>}
                        </tbody>
                        <tfoot className="bg-blue-500/5 text-blue-700 dark:text-blue-300">
                            <tr>
                                <th scope="row" colSpan={4} className="px-3 py-2.5 text-left font-semibold">Class Standing Total</th>
                                <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{percent(standing)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <div className="space-y-1 rounded-lg bg-muted/35 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">How the {label.toLowerCase()} grade is calculated</p>
                <p className="tabular-nums">Class Standing: {percent(standing)} × {CLASS_STANDING_WEIGHT}% ≈ <strong className="text-foreground">{points(standingPoints)}</strong></p>
                <p className="tabular-nums">Exam score: {number(exam.score)} / {number(exam.maximum)} → {percent(exam.percentage)}.</p>
                <p className="tabular-nums">Exam: {percent(exam.percentage)} × {EXAM_WEIGHT}% ≈ <strong className="text-foreground">{points(examPoints)}</strong></p>
                {complete ? (
                    <p className="pt-1 font-medium text-foreground tabular-nums">Total: {number(standingPoints)} + {number(examPoints)} ≈ {percent(result.percentage)}</p>
                ) : (
                    <p className="pt-1">{statusLabel}.{result.status === 'incomplete' && ` ${result.missing} score${result.missing === 1 ? '' : 's'} still missing.`} Missing scores are not counted as zero.</p>
                )}
            </div>

            <dl className="grid grid-cols-3 divide-x divide-border/70 rounded-lg border border-blue-200/70 bg-blue-50/60 py-3 text-center dark:border-blue-400/15 dark:bg-blue-400/5">
                <div className="px-2"><dt className="text-[11px] text-muted-foreground">Term percentage</dt><dd className="mt-1 font-semibold tabular-nums">{percent(result.percentage)}</dd></div>
                <div className="px-2"><dt className="text-[11px] text-muted-foreground">Grade equivalent</dt><dd className="mt-1 font-semibold tabular-nums">{grade}</dd></div>
                <div className="px-2"><dt className="text-[11px] text-muted-foreground">Status</dt><dd className={`mt-1 text-sm font-semibold ${status === 'passed' ? 'text-emerald-600 dark:text-emerald-300' : status === 'failed' ? 'text-rose-600 dark:text-rose-300' : 'text-muted-foreground'}`}>{statusLabel}</dd></div>
            </dl>
            {complete && <p className="text-[11px] text-muted-foreground tabular-nums">Grade lookup: {percent(result.rounded_percentage)} → {grade}.</p>}
        </section>
    )
}

const glossary = [
    ['Score', 'Total points earned / total possible points in that category.'],
    ['Earned %', 'Student performance: earned ÷ possible × 100. Example: 24/30 = 80%.'],
    ['Weight', 'How much the category counts within Class Standing. Category weights total 100%.'],
    ['Contribution', 'Earned % × category weight. Example: 80% × 30% = 24 points toward Class Standing.'],
]

export default function StudentGradeBreakdown({ student, summaries }) {
    return (
        <div className="min-w-0 space-y-3">
            <div className="grid min-w-0 items-start gap-3 lg:grid-cols-2">
                <TermDetails label="Midterm" result={student.midterm} summary={summaries.midterm} />
                <TermDetails label="Final" result={student.final} summary={summaries.final} isFinal />
            </div>
            <aside aria-label="Understanding grade calculations" className="rounded-xl border border-blue-200/70 bg-blue-50/60 p-3 dark:border-blue-400/20 dark:bg-blue-400/5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="flex items-start gap-2">
                        <Info className="mt-0.5 size-5 shrink-0 text-blue-600 dark:text-blue-300" aria-hidden="true" />
                        <div><h3 className="text-xs font-semibold">Understanding the columns</h3><p className="mt-1 text-[11px] text-muted-foreground">Performance and weight are different.</p></div>
                    </div>
                    {glossary.map(([term, definition]) => (
                        <dl key={term} className="border-t border-blue-200/70 pt-2 dark:border-blue-400/20 xl:border-l xl:border-t-0 xl:pl-3 xl:pt-0">
                            <dt className="text-xs font-semibold text-blue-700 dark:text-blue-300">{term}</dt>
                            <dd className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{definition}</dd>
                        </dl>
                    ))}
                </div>
            </aside>
            <p className="text-[11px] leading-relaxed text-muted-foreground">Category contributions make up Class Standing, which supplies {CLASS_STANDING_WEIGHT}% of the term grade. The exam supplies {EXAM_WEIGHT}%. Displayed percentages are rounded to whole numbers; calculations use full precision. The ≈ symbol indicates rounded display values. The term percentage is rounded once for grade lookup. Grades ≤ 3.0 pass; grades &gt; 3.0 fail.</p>
        </div>
    )
}
