import React, { useId, useMemo, useState } from 'react'
import {
    ArrowDown, ArrowRight, BookOpen, Calculator, CheckCircle2,
    ChevronDown, GraduationCap, Info, RotateCcw,
} from 'lucide-react'
import { Button } from '@/Components/ui/button'
import NumberInput from '@/Components/ui/NumberInput'
import {
    buildGradeSummary, gradeEquivalent,
    CLASS_STANDING_WEIGHT, EXAM_WEIGHT,
} from './gradeCalculations'

const CATEGORIES = [
    {
        id: 1, name: 'Quizzes', weight: 30, assessments: [
            { id: 11, name: 'Quiz 1', max_score: 10, initial: 8 },
            { id: 12, name: 'Quiz 2', max_score: 40, initial: 32 },
        ]
    },
    {
        id: 2, name: 'Laboratory', weight: 30, assessments: [
            { id: 21, name: 'Laboratory activity', max_score: 100, initial: 100 },
        ]
    },
    {
        id: 3, name: 'Assignments', weight: 30, assessments: [
            { id: 31, name: 'Assignment', max_score: 100, initial: 90 },
        ]
    },
    {
        id: 4, name: 'Participation', weight: 10, assessments: [
            { id: 41, name: 'Participation score', max_score: 100, initial: 90 },
        ]
    },
]
const EXAM_MAXIMUM = 100
const initialScores = () => Object.fromEntries([
    ...CATEGORIES.flatMap(category => category.assessments.map(item => [item.id, item.initial])),
    ['exam', 80],
])
const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 })
const number = value => value == null ? '—' : numberFormatter.format(value)
const percent = value => value == null ? '—' : `${Math.round(Number(value) + 1e-9)}%`
const contribution = (value, weight) => value == null ? null : value * weight / 100

// Use the same calculator as Grade Summary so the explanation follows its rules.
export function calculateExample(scores) {
    return buildGradeSummary({
        students: [{ student_id: 1, student_subject_id: 1, first_name: 'Example', last_name: 'Student' }],
        categories: CATEGORIES.map((category, index) => ({ ...category, period: 'midterm', sort_order: index })),
        assessments: [],
        assessment_scores: CATEGORIES.flatMap(category => category.assessments.map(item => ({
            assessment_id: item.id, student_subject_id: 1, score: scores[item.id] === '' ? null : scores[item.id],
        }))),
        exams: [{ id: 1, period: 'midterm', name: 'Example exam', max_score: EXAM_MAXIMUM }],
        exam_scores: [{ exam_id: 1, student_subject_id: 1, score: scores.exam === '' ? null : scores.exam }],
    }, 'midterm').rows[0]
}

function StepHeading({ step, title, children, violet = false }) {
    return (
        <div className="mb-5 flex items-start gap-3">
            <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${violet ? 'bg-violet-500/15 text-violet-700 dark:text-violet-300' : 'bg-blue-500/15 text-blue-700 dark:text-blue-300'}`}>
                {step}
            </span>
            <div>
                <h3 className="font-semibold tracking-tight">{title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{children}</p>
            </div>
        </div>
    )
}

function Note({ children }) {
    return (
        <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>{children}</div>
        </div>
    )
}

function GradeScale({ roundedPercentage }) {
    const entries = Array.from({ length: 21 }, (_, index) => {
        const percentage = 95 - index
        return {
            label: percentage === 95 ? '95–100%' : `${percentage}%`,
            grade: gradeEquivalent(percentage),
            active: roundedPercentage != null && (percentage === 95 ? roundedPercentage >= 95 : roundedPercentage === percentage),
        }
    })
    entries.push({ label: '74% & below', grade: 5, active: roundedPercentage != null && roundedPercentage < 75 })

    return (
        <details className="group rounded-xl border bg-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium [&::-webkit-details-marker]:hidden">
                See all grade equivalents
                <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
            </summary>
            <div className="border-t p-4">
                <p className="mb-3 text-xs text-muted-foreground">Match the rounded term percentage to this scale. The current example is highlighted.</p>
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {entries.map(entry => (
                        <div key={entry.label} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs ${entry.active ? 'bg-primary text-primary-foreground' : 'bg-muted/50'}`}>
                            <dt>{entry.label}</dt>
                            <dd className="font-semibold tabular-nums">{entry.grade.toFixed(1)}{entry.active && <span className="sr-only">, current example</span>}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </details>
    )
}

export default function HowItWorks() {
    const id = useId()
    const [scores, setScores] = useState(initialScores)
    const [activeCategoryId, setActiveCategoryId] = useState(CATEGORIES[0].id)
    const result = useMemo(() => calculateExample(scores), [scores])
    const active = result.category_results.find(category => category.id === activeCategoryId)
    const sourceCategory = CATEGORIES.find(category => category.id === activeCategoryId)
    const standingPoints = contribution(result.class_standing, CLASS_STANDING_WEIGHT)
    const examPoints = contribution(result.exam.percentage, EXAM_WEIGHT)
    const complete = result.equivalent !== null
    const passed = complete && result.equivalent <= 3
    const status = !complete ? 'Incomplete' : passed ? 'Passed' : 'Failed'
    const statusTone = !complete ? 'text-muted-foreground' : passed
        ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'

    function changeScore(key, nextValue, maximum) {
        const value = nextValue === '' ? '' : Math.min(maximum, Math.max(0, Math.trunc(Number(nextValue) || 0)))
        setScores(current => ({ ...current, [key]: value }))
    }

    function reset() {
        setScores(initialScores())
        setActiveCategoryId(CATEGORIES[0].id)
    }

    return (
        <section className="mx-auto max-w-7xl space-y-6 text-foreground" aria-labelledby={`${id}-title`}>
            <header className="space-y-2">
                {/* <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-blue-700 dark:text-blue-300">
                    <BookOpen className="size-4" aria-hidden="true" /> A guide to your grading system
                </div> */}
                <h2 id={`${id}-title`} className="text-2xl font-bold tracking-tight sm:text-3xl">From scores to a term grade.</h2>
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    Your categories form Class Standing. Class Standing and the exam combine to produce one term grade.
                    The same process applies separately to Midterm and Final.
                </p>
            </header>

            <div className="overflow-hidden rounded-2xl border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5">
                    <h3 className="text-sm font-semibold">The big picture</h3>
                    <span className="text-xs text-muted-foreground">One term = 100 possible points</span>
                </div>
                <div className="space-y-4 p-4 sm:p-5">
                    <div className="flex h-12 overflow-hidden rounded-xl text-sm font-semibold" role="img" aria-label={`Class Standing makes up ${CLASS_STANDING_WEIGHT} percent, and the exam makes up ${EXAM_WEIGHT} percent, of each term grade.`}>
                        <div className="flex items-center justify-center gap-2 bg-blue-600 px-2 text-white" style={{ width: `${CLASS_STANDING_WEIGHT}%` }}>
                            <BookOpen className="hidden size-4 sm:block" aria-hidden="true" />{CLASS_STANDING_WEIGHT}% Class Standing
                        </div>
                        <div className="flex items-center justify-center gap-2 bg-violet-600 px-2 text-white" style={{ width: `${EXAM_WEIGHT}%` }}>
                            <GraduationCap className="hidden size-4 sm:block" aria-hidden="true" />{EXAM_WEIGHT}% Exam
                        </div>
                    </div>
                    <div className="grid gap-4 md:grid-cols-[7fr_3fr]">
                        <div className="rounded-xl bg-blue-500/5 p-4">
                            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Inside Class Standing: categories total 100%</p>
                            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Category weights divide the Class Standing portion. Your actual names and weights come from Grading Settings.</p>
                            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {CATEGORIES.map(category => (
                                    <div key={category.id} className="rounded-lg bg-background/80 p-2 text-center">
                                        <p className="text-xs text-muted-foreground">{category.name}</p>
                                        <p className="mt-1 text-sm font-semibold tabular-nums">{category.weight}%</p>
                                    </div>
                                ))}
                            </div>
                            <p className="mt-3 text-xs font-medium">These sample weights add up to 100% of Class Standing, which supplies {CLASS_STANDING_WEIGHT}% of the term.</p>
                        </div>
                        <div className="rounded-xl bg-violet-500/5 p-4">
                            <GraduationCap className="mb-2 size-6 text-violet-700 dark:text-violet-300" aria-hidden="true" />
                            <p className="text-sm font-semibold">The exam has its own share.</p>
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Convert the exam score to a percentage, then apply its {EXAM_WEIGHT}% weight. It can contribute up to {EXAM_WEIGHT} points to the term.</p>
                        </div>
                    </div>
                    <Note>A category with a 30% weight can contribute up to {number(CLASS_STANDING_WEIGHT * 0.3)} term points: 30% of the {CLASS_STANDING_WEIGHT}-point Class Standing portion.</Note>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="flex items-center gap-2 font-semibold"><Calculator className="size-5 text-blue-600 dark:text-blue-300" aria-hidden="true" />Follow a worked example</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Try changing a score. This is a practice example; student records are not changed.</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={reset} className="gap-2"><RotateCcw className="size-4" aria-hidden="true" />Reset example</Button>
            </div>

            <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="min-w-0 space-y-5">
                    <article className="rounded-2xl border bg-card p-4 sm:p-5">
                        <StepHeading step="1" title="Find each category’s earned percentage">
                            Add the earned points. Add the possible points. Divide the two totals and multiply by 100.
                        </StepHeading>
                        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Choose an example category">
                            {CATEGORIES.map(category => (
                                <Button key={category.id} type="button" size="sm" variant={activeCategoryId === category.id ? 'default' : 'outline'}
                                    aria-pressed={activeCategoryId === category.id} aria-controls={`${id}-category`}
                                    onClick={() => setActiveCategoryId(category.id)}>
                                    {category.name}
                                </Button>
                            ))}
                        </div>
                        <div id={`${id}-category`} className="space-y-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{active.name} assessment scores</p>
                            <div className="divide-y rounded-xl border px-3">
                                {sourceCategory.assessments.map(item => (
                                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                                        <label htmlFor={`${id}-${item.id}`} className="text-sm font-medium">{item.name}</label>
                                        <div className="flex items-center gap-2">
                                            <NumberInput id={`${id}-${item.id}`} value={scores[item.id]} min={0} max={item.max_score} step={1}
                                                className="w-24" aria-label={`Example ${item.name} score`}
                                                onValueChange={value => changeScore(item.id, value, item.max_score)} />
                                            <span className="w-12 text-xs text-muted-foreground">/ {item.max_score} pts</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-500/5 p-4">
                                <div>
                                    <p className="text-xs text-muted-foreground">Total earned / total possible</p>
                                    <p className="mt-1 text-xl font-bold tabular-nums">{active.status === 'complete' ? number(active.earned) : '—'} / {number(active.maximum)}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">{active.status === 'complete'
                                        ? `${active.assessments.map(item => number(item.score)).join(' + ')} earned; ${active.assessments.map(item => number(item.maximum)).join(' + ')} possible`
                                        : `${active.entered}/${active.total} scores entered`}</p>
                                </div>
                                <ArrowRight className="size-5 text-blue-500" aria-hidden="true" />
                                <div className="text-right">
                                    <p className="text-xs text-muted-foreground">Earned %</p>
                                    <p className="mt-1 text-3xl font-bold text-blue-700 tabular-nums dark:text-blue-300">{percent(active.percentage)}</p>
                                    <p className="mt-1 text-xs text-muted-foreground">The student’s performance</p>
                                </div>
                            </div>
                            <Note>{active.status === 'complete'
                                ? <>({number(active.earned)} ÷ {number(active.maximum)}) × 100 ≈ <strong className="text-foreground">{percent(active.percentage)}</strong>. Using total points means an assessment with more possible points carries more weight within its category.</>
                                : 'A blank score is still missing. Enter every required score in this category to calculate its percentage.'}</Note>
                        </div>
                    </article>

                    <article className="rounded-2xl border bg-card p-4 sm:p-5">
                        <StepHeading step="2" title="Apply the category weights">
                            Multiply each earned percentage by its category weight, then add the contributions.
                        </StepHeading>
                        <div className="mb-4 grid gap-2 sm:grid-cols-2">
                            <div className="rounded-lg bg-blue-500/5 p-3"><p className="text-sm font-semibold">Earned %</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">How well this student performed. It changes when their scores change.</p></div>
                            <div className="rounded-lg bg-muted/60 p-3"><p className="text-sm font-semibold">Weight</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">How much the category counts. It is set in Grading Settings.</p></div>
                        </div>
                        <div className="overflow-x-auto rounded-xl border">
                            <table className="w-full min-w-[420px] text-sm">
                                <caption className="sr-only">Category performance multiplied by category weight gives points toward Class Standing.</caption>
                                <thead className="bg-muted/50 text-xs text-muted-foreground"><tr>
                                    <th scope="col" className="p-3 text-left font-medium">Category</th>
                                    <th scope="col" className="p-3 text-right font-medium">Earned %</th>
                                    <th scope="col" className="p-3 text-right font-medium">Weight</th>
                                    <th scope="col" className="p-3 text-right font-medium">Adds to standing</th>
                                </tr></thead>
                                <tbody className="divide-y">
                                    {result.category_results.map(category => (
                                        <tr key={category.id} className={category.id === activeCategoryId ? 'bg-blue-500/5' : ''}>
                                            <th scope="row" className="p-3 text-left text-xs font-medium">{category.name}</th>
                                            <td className="p-3 text-right tabular-nums">{percent(category.percentage)}</td>
                                            <td className="p-3 text-right text-muted-foreground tabular-nums">{percent(category.weight)}</td>
                                            <td className="whitespace-nowrap p-3 text-right font-semibold tabular-nums">{number(category.weighted_percentage)} pts</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="border-t bg-muted/40"><tr>
                                    <th scope="row" colSpan={2} className="p-3 text-left text-xs font-semibold">Class Standing total</th>
                                    <td className="p-3 text-right text-xs tabular-nums">100%</td>
                                    <td className="whitespace-nowrap p-3 text-right font-semibold tabular-nums">{number(result.class_standing)} / 100</td>
                                </tr></tfoot>
                            </table>
                        </div>
                        <div className="mt-3 space-y-2">
                            <p className="text-xs leading-relaxed text-muted-foreground">For {active.name}: {percent(active.percentage)} earned × {percent(active.weight)} weight ≈ <strong className="text-foreground">{number(active.weighted_percentage)} standing points.</strong></p>
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-blue-500/10 p-3">
                                <span className="text-sm font-semibold">Class Standing result</span>
                                <span className="text-2xl font-bold text-blue-700 tabular-nums dark:text-blue-300">{percent(result.class_standing)}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">This result will be scaled to the {CLASS_STANDING_WEIGHT}-point share of the term.</p>
                        </div>
                    </article>
                </div>

                <div className="min-w-0 space-y-5 xl:sticky xl:top-6">
                    <article className="rounded-2xl border bg-card p-4 sm:p-5">
                        <StepHeading step="3" title="Calculate the exam result" violet>
                            Divide the exam score by its maximum, then multiply by 100.
                        </StepHeading>
                        <label htmlFor={`${id}-exam`} className="mb-2 block text-xs font-medium text-muted-foreground">Example exam score</label>
                        <div className="flex flex-wrap items-center gap-3">
                            <NumberInput id={`${id}-exam`} value={scores.exam} min={0} max={EXAM_MAXIMUM} step={1} className="w-28"
                                onValueChange={value => changeScore('exam', value, EXAM_MAXIMUM)} />
                            <span className="text-sm text-muted-foreground">/ {EXAM_MAXIMUM}</span>
                            <ArrowRight className="size-4 text-muted-foreground" aria-hidden="true" />
                            <span className="text-3xl font-bold text-violet-700 tabular-nums dark:text-violet-300">{percent(result.exam.percentage)}</span>
                        </div>
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">({number(result.exam.score)} ÷ {EXAM_MAXIMUM}) × 100 ≈ {percent(result.exam.percentage)}. This result supplies the exam’s {EXAM_WEIGHT}-point share.</p>
                        <Button type="button" variant="ghost" size="sm" className="mt-2 px-0 text-xs" onClick={() => changeScore('exam', '', EXAM_MAXIMUM)}>Try a missing exam score</Button>
                    </article>

                    <article className="overflow-hidden rounded-2xl border bg-card">
                        <div className="p-4 sm:p-5">
                            <StepHeading step="4" title="Combine, then find the grade">
                                Apply the fixed {CLASS_STANDING_WEIGHT}/{EXAM_WEIGHT} split to the two results.
                            </StepHeading>
                            <div className="space-y-2 text-sm tabular-nums">
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-blue-500/5 px-3 py-2"><span>Class Standing <span className="text-xs text-muted-foreground">{percent(result.class_standing)} × {CLASS_STANDING_WEIGHT}%</span></span><strong className="text-blue-700 dark:text-blue-300">≈ {number(standingPoints)} pts</strong></div>
                                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-violet-500/5 px-3 py-2"><span>Exam <span className="text-xs text-muted-foreground">{percent(result.exam.percentage)} × {EXAM_WEIGHT}%</span></span><strong className="text-violet-700 dark:text-violet-300">≈ {number(examPoints)} pts</strong></div>
                            </div>
                            <div className="my-4 flex justify-center"><ArrowDown className="size-5 text-muted-foreground" aria-hidden="true" /></div>
                            <div className="text-center">
                                <p className="text-xs text-muted-foreground">{complete ? `${number(standingPoints)} + ${number(examPoints)} = ${number(result.percentage)} points out of 100` : 'Complete the required scores to calculate the term grade.'}</p>
                                <p className="mt-2 text-4xl font-bold tracking-tight tabular-nums">{percent(result.percentage)}</p>
                                <p className="mt-1 text-xs text-muted-foreground">Rounded term percentage</p>
                            </div>
                            {complete && (
                                <div className="mt-4">
                                    <div className="flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${number(standingPoints)} Class Standing points and ${number(examPoints)} exam points out of 100 total points.`}>
                                        <div className="h-full bg-blue-600 transition-[width] motion-reduce:transition-none" style={{ width: `${standingPoints}%` }} />
                                        <div className="h-full bg-violet-600 transition-[width] motion-reduce:transition-none" style={{ width: `${examPoints}%` }} />
                                    </div>
                                    <div className="mt-2 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground"><span>Blue: Class Standing</span><span>Violet: Exam</span><span>Gray: Unearned</span></div>
                                </div>
                            )}
                        </div>
                        <div className={`border-t p-4 sm:p-5 ${!complete ? 'bg-muted/30' : passed ? 'bg-emerald-500/5' : 'bg-rose-500/5'}`}>
                            <div className="flex items-center justify-between gap-3">
                                <div><p className="text-xs text-muted-foreground">Grade equivalent</p><p className={`mt-1 text-3xl font-bold tabular-nums ${statusTone}`}>{complete ? result.equivalent.toFixed(1) : '—'}</p></div>
                                <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${statusTone}`}>{passed && <CheckCircle2 className="size-4" aria-hidden="true" />}{status}</span>
                            </div>
                            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{complete
                                ? `${percent(result.rounded_percentage)} on the grade scale → ${result.equivalent.toFixed(1)}. Grades from 1.0 to 3.0 pass; grades above 3.0 fail.`
                                : `${result.missing} required score${result.missing === 1 ? ' is' : 's are'} missing. A blank is not treated as zero.`}</p>
                        </div>
                    </article>
                    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{complete ? `Example result: ${percent(result.percentage)}, grade ${result.equivalent.toFixed(1)}, ${status}.` : `Example result incomplete. ${result.missing} scores missing.`}</p>
                    <GradeScale roundedPercentage={result.rounded_percentage} />
                </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
                {[
                    ['Do category weights total 70% or 100%?', `They total 100% inside Class Standing. After calculating that result, multiply it by ${CLASS_STANDING_WEIGHT}% to get its contribution to the term. The exam supplies the other ${EXAM_WEIGHT}%.`],
                    ['What happens with a blank or a zero?', 'A blank means a score is missing, so the term stays incomplete. An entered zero is a real score and counts in the calculation. Categories with 0% weight do not affect the grade.'],
                    ['Why do some displayed formulas use ≈?', 'Percentages are displayed as whole numbers. The calculation keeps full precision, so rounded display values may not reproduce every point exactly. The term percentage is rounded once when looking up its grade equivalent.'],
                ].map(([question, answer]) => (
                    <details key={question} className="group self-start rounded-xl border bg-card">
                        <summary className="flex cursor-pointer list-none items-start justify-between gap-2 p-4 text-sm font-medium [&::-webkit-details-marker]:hidden">{question}<ChevronDown className="mt-0.5 size-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" /></summary>
                        <p className="px-4 pb-4 text-xs leading-relaxed text-muted-foreground">{answer}</p>
                    </details>
                ))}
            </div>
        </section>
    )
}
