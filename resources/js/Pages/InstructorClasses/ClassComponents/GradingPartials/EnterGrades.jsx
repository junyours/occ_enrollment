import { useEffect, useId, useRef, useState } from 'react'
import { GraduationCap, LayoutGrid, ListChecks, Loader2, Notebook, Plus } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'

import { Button } from '@/Components/ui/button'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card'
import { Input } from '@/Components/ui/input'
import { PillTab } from '@/Components/ui/PillTab'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/Components/ui/popover'
import { Separator } from '@/Components/ui/separator'
import { Skeleton } from '@/Components/ui/skeleton'

import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/Lib/Utils'
import GradebookGrid from './EnterGradesPartials/GradebookGrid'
import ManageCategoriesDrawer from './EnterGradesPartials/ManageCategoriesDrawer'
import StudentAssessmentsScores from './EnterGradesPartials/StudentAssessmentsScores'
import StudentExamScores from './EnterGradesPartials/StudentExamScores'
import { CLASS_STANDING_WEIGHT, EXAM_WEIGHT } from './gradeCalculations'

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const CARD_TONES = {
    blue: {
        header: 'bg-blue-100 text-blue-950 dark:bg-blue-950/50 dark:text-blue-50',
        iconBackground: 'bg-blue-100 dark:bg-blue-900/60',
        accent: 'text-blue-600 dark:text-blue-300',
    },
    green: {
        header: 'bg-green-100 text-green-950 dark:bg-green-950/50 dark:text-green-50',
        iconBackground: 'bg-green-100 dark:bg-green-900/60',
        accent: 'text-green-600 dark:text-green-300',
    },
}

const VIEWS = [
    { value: 'assessment', label: 'By assessment', icon: ListChecks },
    { value: 'gradebook', label: 'Gradebook', icon: LayoutGrid },
]

// The view a teacher last used, remembered in this browser.
const VIEW_STORAGE_KEY = 'grading-entry-view:v1'

function readView() {
    try {
        return window.localStorage.getItem(VIEW_STORAGE_KEY) === 'gradebook' ? 'gradebook' : 'assessment'
    } catch {
        return 'assessment'
    }
}

const MAX_ASSESSMENT_SCORE = 1000

const sortByOrder = (a, b) => a.sort_order - b.sort_order

const sameId = (a, b) => a !== null && a !== undefined && Number(a) === Number(b)

const GradingSkeleton = () => (
    <div role="status" aria-label="Loading grading" className='space-y-4'>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {/* Class Standing */}
            <div className="overflow-hidden rounded-xl border lg:col-span-2">
                {/* Header */}
                <div className="flex items-center justify-between bg-muted/50 p-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />

                        <div className="space-y-2">
                            <Skeleton className="h-6 w-40" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </div>

                    <Skeleton className="h-9 w-16" />
                </div>

                {/* Content */}
                <div className="space-y-3 p-3">
                    {/* Categories */}
                    <div className="flex flex-wrap gap-3">
                        <Skeleton className="h-8 w-40 rounded-xl" />
                        <Skeleton className="h-8 w-40 rounded-xl" />
                        <Skeleton className="h-8 w-40 rounded-xl" />
                    </div>
                </div>
            </div>

            {/* Exam */}
            <div className="overflow-hidden rounded-xl border">
                {/* Header */}
                <div className="flex items-center justify-between bg-muted/50 p-3">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />

                        <div className="space-y-2">
                            <Skeleton className="h-6 w-36" />
                            <Skeleton className="h-4 w-36" />
                        </div>
                    </div>

                    <Skeleton className="h-9 w-16" />
                </div>

                {/* Exam button */}
                <div className="p-3">
                    <Skeleton className="h-8 w-full rounded-xl" />
                </div>
            </div>
        </div>
        <Separator />
        <div className='flex gap-2'>
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-8 w-48 rounded-full" />
        </div>
    </div>
)

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

function LoadError({ error, retrying, onRetry }) {
    return (
        <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
            <p className="font-medium text-foreground">Grading couldn’t load</p>
            <p className="text-sm text-muted-foreground">
                {error?.response?.data?.message || 'Check your connection, then try again.'}
            </p>
            <Button type="button" variant="outline" disabled={retrying} onClick={onRetry}>
                {retrying ? 'Trying again…' : 'Try again'}
            </Button>
        </div>
    )
}

function ViewToggle({ value, onChange }) {
    return (
        <div role="group" aria-label="How to enter scores" className="inline-flex rounded-lg border bg-muted/40 p-0.5">
            {VIEWS.map(({ value: option, label, icon: Icon }) => {
                const active = value === option

                return (
                    <Button
                        key={option}
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-pressed={active}
                        onClick={() => onChange(option)}
                        className={cn(
                            'h-8 gap-1.5 rounded-md px-3 text-muted-foreground',
                            active && 'bg-background text-foreground shadow-sm hover:bg-background'
                        )}
                    >
                        <Icon className="size-4" aria-hidden="true" />
                        {label}
                    </Button>
                )
            })}
        </div>
    )
}

function CategoryButton({ category, selected, onClick }) {
    return (
        <Button
            type="button"
            title={`${category.name}: ${category.weight}% of class standing`}
            variant={selected ? 'default' : 'secondary'}
            aria-pressed={selected}
            onClick={onClick}
            className="h-auto min-h-9 max-w-full justify-start gap-1.5 whitespace-normal py-1.5 text-left"
        >
            <span className="break-words">
                {category.name}
            </span>

            <span className="shrink-0 opacity-60">
                · {category.weight}%
            </span>
        </Button>
    )
}

function GradingCard({
    title,
    description,
    icon: Icon,
    percentage,
    tone = 'blue',
    titleClassName = 'text-lg',
    percentageClassName = 'text-2xl',
    className,
    children,
}) {
    const styles = CARD_TONES[tone]

    return (
        <Card className={cn('overflow-hidden pt-0', className)}>
            <CardHeader className={cn('px-2 py-2 mt-0', styles.header)}>
                <CardTitle className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                        {Icon && (
                            <div className="w-max rounded-full bg-background p-0.5">
                                <div
                                    className={cn(
                                        'w-max rounded-full p-2',
                                        styles.iconBackground
                                    )}
                                >
                                    <Icon
                                        size={25}
                                        className={styles.accent}
                                    />
                                </div>
                            </div>
                        )}

                        <div className="min-w-0">
                            <p
                                className={cn(
                                    'font-semibold',
                                    titleClassName
                                )}
                            >
                                {title}
                            </p>

                            {description && (
                                <p className="text-xs opacity-60">
                                    {description}
                                </p>
                            )}
                        </div>
                    </div>

                    {percentage !== undefined && (
                        <span
                            className={cn(
                                'shrink-0 font-bold',
                                styles.accent,
                                percentageClassName
                            )}
                        >
                            {percentage}%
                        </span>
                    )}
                </CardTitle>
            </CardHeader>

            {children && (
                <CardContent className="flex flex-wrap items-center gap-2 p-2">
                    {children}
                </CardContent>
            )}
        </Card>
    )
}

// A starting name and maximum from the category's last assessment: after
// "Lab 1" out of 50 comes "Lab 2" out of 50.
function suggestNext(assessments) {
    const last = assessments[assessments.length - 1]
    const numbered = String(last?.name ?? '').match(/^(.*?)(\d+)\s*$/)

    return {
        name: numbered ? `${numbered[1]}${Number(numbered[2]) + 1}` : '',
        placeholder: `e.g. Quiz ${assessments.length + 1}`,
        maximum: String(Number(last?.max_score) > 0 ? Number(last.max_score) : 10),
    }
}

/**
 * Adds an assessment to a category after asking for its name and maximum,
 * so a stray click never leaves an empty "1" behind.
 */
function AddAssessment({ category, classId, assessments, onAdded }) {
    const queryClient = useQueryClient()
    const nameId = useId()
    const maximumId = useId()
    const suggestion = suggestNext(assessments)
    const nameInput = useRef(null)
    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [maximum, setMaximum] = useState('10')
    const [touched, setTouched] = useState(false)

    // The suggested name starts selected, so typing replaces it.
    useEffect(() => {
        if (!open) return undefined

        const timer = window.setTimeout(() => nameInput.current?.select(), 0)
        return () => window.clearTimeout(timer)
    }, [open])

    const add = useMutation({
        mutationFn: async () => {
            const { data } = await axios.post(route('assessment.add'), {
                category_id: category.id,
                name: name.trim(),
                max_score: Number(maximum),
            })

            return data
        },
        onSuccess: async (assessment) => {
            await queryClient.invalidateQueries({ queryKey: ['class-gradings', classId] })
            void queryClient.invalidateQueries({ queryKey: ['grade-summary'] })

            setOpen(false)
            setTouched(false)
            onAdded(assessment?.id)
        },
    })

    const problem = !name.trim()
        ? 'Give the assessment a name.'
        : !/^\d+$/.test(maximum.trim()) || Number(maximum) < 1
            ? 'The maximum must be a whole number of at least 1.'
            : Number(maximum) > MAX_ASSESSMENT_SCORE
                ? 'Keep the maximum at 1,000 or less.'
                : ''

    function submit(event) {
        event.preventDefault()
        setTouched(true)

        if (problem || add.isPending) return

        add.mutate()
    }

    return (
        <Popover
            open={open}
            onOpenChange={(next) => {
                if (add.isPending) return
                setOpen(next)
                if (next) {
                    add.reset()
                    setTouched(false)
                    setName(suggestion.name)
                    setMaximum(suggestion.maximum)
                }
            }}
        >
            <PopoverTrigger asChild>
                <PillTab variant="action" aria-haspopup="dialog">
                    <Plus />
                    Add assessment
                </PillTab>
            </PopoverTrigger>

            <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))]">
                <form onSubmit={submit} className="space-y-3" aria-label={`New assessment in ${category.name}`}>
                    <div className="space-y-0.5">
                        <p className="text-sm font-semibold">New assessment</p>
                        <p className="text-xs text-muted-foreground">In {category.name}</p>
                    </div>

                    <div className="space-y-1">
                        <label htmlFor={nameId} className="text-sm font-medium">Name</label>
                        <Input
                            ref={nameInput}
                            id={nameId}
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder={suggestion.placeholder}
                            maxLength={255}
                            autoFocus
                            autoComplete="off"
                            onFocus={(event) => event.target.select()}
                        />
                    </div>

                    <div className="space-y-1">
                        <label htmlFor={maximumId} className="text-sm font-medium">Maximum score</label>
                        <Input
                            id={maximumId}
                            value={maximum}
                            onChange={(event) => setMaximum(event.target.value)}
                            inputMode="numeric"
                            autoComplete="off"
                            className="w-28"
                        />
                    </div>

                    {touched && problem && (
                        <p role="alert" className="text-sm text-destructive">{problem}</p>
                    )}

                    {add.isError && (
                        <p role="alert" className="text-sm text-destructive">
                            {Object.values(add.error?.response?.data?.errors ?? {}).flat()[0]
                                ?? add.error?.response?.data?.message
                                ?? 'The assessment couldn’t be added. Please try again.'}
                        </p>
                    )}

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" size="sm" disabled={add.isPending} onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={add.isPending} className="gap-1.5">
                            {add.isPending && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                            {add.isPending ? 'Adding…' : 'Add'}
                        </Button>
                    </div>
                </form>
            </PopoverContent>
        </Popover>
    )
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

export default function EnterGrades({ period, classId }) {
    const isMobile = useIsMobile()

    const [view, setView] = useState(readView)
    const [selectedCategoryId, setSelectedCategoryId] = useState(null)
    const [selectedAssessmentId, setSelectedAssessmentId] = useState(null)
    const [activeSection, setActiveSection] = useState('category')

    const periodLabel = period.charAt(0).toUpperCase() + period.slice(1)

    const query = useQuery({
        queryKey: ['class-gradings', classId],
        queryFn: async ({ signal }) => {
            const { data } = await axios.post(route('class-gradings'), { class_id: classId }, { signal })
            return data
        },
        retry: (count, error) => count < 1 && (!error.response?.status || error.response.status >= 500),
    })

    // Keep the original behavior:
    // changing period goes back to Class Standing.
    useEffect(() => {
        setActiveSection('category')
        setSelectedCategoryId(null)
        setSelectedAssessmentId(null)
    }, [period])

    function chooseView(next) {
        setView(next)

        try {
            window.localStorage.setItem(VIEW_STORAGE_KEY, next)
        } catch {
            // Storage blocked: the choice lasts until the page reloads.
        }
    }

    if (query.isPending) return <GradingSkeleton />

    if (query.isError && !query.data) {
        return <LoadError error={query.error} retrying={query.isFetching} onRetry={() => query.refetch()} />
    }

    const data = query.data ?? {}

    const currentExam = data.exams?.find(
        (exam) => exam.period === period
    )

    // Derived data — no need to store this in state.
    const categories = (data.classStanding ?? [])
        .filter(category => category.period === period)
        .sort(sortByOrder)

    // If the current ID belongs to another period,
    // automatically fall back to the first category.
    const selectedCategory =
        categories.find(
            category => sameId(selectedCategoryId, category.id)
        ) ?? categories[0]

    const assessments = [...(selectedCategory?.assessments ?? [])]
        .sort(sortByOrder)

    const defaultAssessment = assessments.find(
        assessment => assessment.sort_order === 1
    )

    const resolvedAssessmentId = assessments.find(
        assessment => sameId(selectedAssessmentId, assessment.id)
    )?.id ?? defaultAssessment?.id ?? assessments[0]?.id ?? null

    const handleCategorySelect = category => {
        setSelectedCategoryId(category.id)
        setSelectedAssessmentId(null)
        setActiveSection('category')
        chooseView('assessment')
    }

    // From a gradebook column to that assessment's own view.
    function openAssessment(categoryId, assessmentId) {
        setSelectedCategoryId(categoryId)
        setSelectedAssessmentId(assessmentId)
        setActiveSection('category')
        chooseView('assessment')
    }

    function openExam() {
        setActiveSection('exam')
        chooseView('assessment')
    }

    const byAssessment = view === 'assessment'

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                    {byAssessment
                        ? 'Enter scores one assessment at a time.'
                        : `Every ${periodLabel.toLowerCase()} score in one table.`}
                </p>

                <ViewToggle value={view} onChange={chooseView} />
            </div>

            {/* Term composition */}
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
                <GradingCard
                    title="Class Standing"
                    description={`${CLASS_STANDING_WEIGHT}% of ${periodLabel} grade.`}
                    icon={Notebook}
                    tone="blue"
                    percentage={CLASS_STANDING_WEIGHT}
                    className="lg:col-span-2"
                >
                    {categories.map(category => (
                        <CategoryButton
                            key={category.id}
                            category={category}
                            selected={
                                byAssessment &&
                                activeSection === 'category' &&
                                selectedCategory?.id === category.id
                            }
                            onClick={() =>
                                handleCategorySelect(category)
                            }
                        />
                    ))}

                    <ManageCategoriesDrawer
                        key={`${classId}:${period}`}
                        categories={categories}
                        classId={classId}
                        period={period}
                        periodLabel={periodLabel}
                        isMobile={isMobile}
                        examId={currentExam?.id}
                        maxScore={currentExam?.max_score ?? 0}
                    />
                </GradingCard>

                <GradingCard
                    title={`${periodLabel} Exam`}
                    description={`${EXAM_WEIGHT}% of the ${periodLabel} grade.`}
                    icon={GraduationCap}
                    tone="green"
                    percentage={EXAM_WEIGHT}
                >
                    <Button
                        type="button"
                        className="w-full"
                        aria-pressed={byAssessment && activeSection === 'exam'}
                        variant={
                            byAssessment && activeSection === 'exam'
                                ? 'default'
                                : 'secondary'
                        }
                        onClick={openExam}
                    >
                        {periodLabel} Exam
                    </Button>
                </GradingCard>
            </div>

            <Separator />

            {!byAssessment && (
                <GradebookGrid
                    key={`${classId}:${period}`}
                    classId={classId}
                    period={period}
                    periodLabel={periodLabel}
                    onOpenAssessment={openAssessment}
                    onOpenExam={openExam}
                />
            )}

            {/* Assessments */}
            {byAssessment && activeSection === 'category' && selectedCategory && (
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {assessments.map(assessment => (
                            <PillTab
                                key={assessment.id}
                                active={resolvedAssessmentId === assessment.id}
                                onClick={() => setSelectedAssessmentId(assessment.id)}
                            >
                                {assessment.name}
                            </PillTab>
                        ))}

                        <AddAssessment
                            key={selectedCategory.id}
                            category={selectedCategory}
                            classId={classId}
                            assessments={assessments}
                            onAdded={(id) => {
                                if (id) setSelectedAssessmentId(id)
                            }}
                        />
                    </div>
                    <StudentAssessmentsScores id={resolvedAssessmentId} classId={classId} />
                </div>
            )}

            {byAssessment && activeSection === 'category' && !selectedCategory && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                    No categories for the {periodLabel.toLowerCase()} yet. Use Manage to add them.
                </p>
            )}

            {byAssessment && activeSection === 'exam' && (
                currentExam ? (
                    <StudentExamScores
                        key={`${classId}:${currentExam.id}`}
                        exam={currentExam}
                        classId={classId}
                    />
                ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        No {periodLabel.toLowerCase()} exam is configured for this class.
                    </p>
                )
            )}
        </div>
    )
}
