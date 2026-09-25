import { useEffect, useState } from 'react'
import {
    Edit3Icon,
    EllipsisVertical,
    GraduationCap,
    MoveDown,
    MoveUp,
    Notebook,
    Plus,
    Trash,
} from 'lucide-react'

import { Button } from '@/Components/ui/button'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card'
import { PillTab } from '@/Components/ui/PillTab'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/Components/ui/popover'
import { Separator } from '@/Components/ui/separator'

import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/Lib/Utils'
import { Input } from '@/Components/ui/input'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Skeleton } from '@/Components/ui/skeleton'
import StudentAssessmentsScores from './EnterGradesPartials/StudentAssessmentsScores'
import NumberInput from '@/Components/ui/NumberInput'
import ManageCategoriesDrawer from './EnterGradesPartials/ManageCategoriesDrawer'
import StudentExamScores from './EnterGradesPartials/StudentExamScores'

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const CLASS_STANDING_WEIGHT = 70
const EXAM_WEIGHT = 30

const CARD_TONES = {
    blue: {
        header: 'bg-blue-100 text-black',
        iconBackground: 'bg-blue-100',
        accent: 'text-blue-500',
    },
    green: {
        header: 'bg-green-100 text-black',
        iconBackground: 'bg-green-100',
        accent: 'text-green-500',
    },
}

const sortByOrder = (a, b) => a.sort_order - b.sort_order

const GradingSkeleton = () => (
    <div className='space-y-4'>
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

function CategoryButton({ category, selected, onClick }) {
    return (
        <Button
            title={category.name}
            variant={selected ? 'default' : 'secondary'}
            onClick={onClick}
            className="w-40"
        >
            <span className="truncate">
                {category.name}
            </span>

            <span className="opacity-40">
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
                                <p className="text-xs opacity-50">
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


function CategoryActions({ index, total }) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Category actions"
                >
                    <EllipsisVertical className="size-4" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="flex w-36 flex-col gap-1 p-1"
            >
                <Button
                    variant="ghost"
                    className="h-max justify-between px-2 py-1.5"
                >
                    Edit
                    <Edit3Icon className="size-4" />
                </Button>

                <Button
                    variant="ghost"
                    disabled={index === 0}
                    className="h-max justify-between px-2 py-1.5"
                >
                    Move up
                    <MoveUp className="size-4" />
                </Button>

                <Button
                    variant="ghost"
                    disabled={index === total - 1}
                    className="h-max justify-between px-2 py-1.5"
                >
                    Move down
                    <MoveDown className="size-4" />
                </Button>

                <Button
                    variant="ghost"
                    className="h-max justify-between px-2 py-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                    Delete
                    <Trash className="size-4" />
                </Button>
            </PopoverContent>
        </Popover>
    )
}


function CategoryRow({ category, index, total }) {
    const assessmentCount = category.assessments.length

    return (
        <>
            <div className="flex items-center justify-between py-3">
                <div>
                    <p className="font-medium">
                        {category.name}
                    </p>
                    <Input
                        value={category.name}
                        placeholder="Category name"
                        maxLength={255}
                        aria-label="Category name"
                        className="h-8 min-w-0 flex-1 rounded-none border-x-0 border-t-0 p-0 font-medium focus:outline-none focus-visible:ring-0"
                    />

                    <p className="text-sm text-muted-foreground">
                        {assessmentCount}{' '}
                        {assessmentCount === 1
                            ? 'assessment'
                            : 'assessments'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <NumberInput
                        value={category.weight}
                        min={1}
                        className="w-24 shrink-0"
                        aria-label="Maximum score"
                    />

                    <p className="font-medium">
                        {category.weight}%
                    </p>

                    <CategoryActions
                        index={index}
                        total={total}
                    />
                </div>
            </div>

            {index < total - 1 && <Separator />}
        </>
    )
}

// -----------------------------------------------------------------------------
// Main component
// -----------------------------------------------------------------------------

export default function EnterGrades({ period, classId }) {
    const queryClient = useQueryClient()

    const isMobile = useIsMobile()

    const [selectedCategoryId, setSelectedCategoryId] = useState(null)
    const [selectedAssessmentId, setSelectedAssessmentId] = useState(null)
    const [activeSection, setActiveSection] = useState('category')

    const periodLabel = period.charAt(0).toUpperCase() + period.slice(1)

    const getClassGradings = async () => {
        try {
            const response = await axios.post(route('class-gradings'), { class_id: classId })
            return response.data;
        } catch (error) {
            console.log(error);
        }
    }

    const { data, isLoading, isFetching, refetch, error } = useQuery({
        queryKey: ['class-gradings', classId],
        queryFn: getClassGradings
    })

    // Keep the original behavior:
    // changing period goes back to Class Standing.
    useEffect(() => {
        setActiveSection('category')
        setSelectedCategoryId(null)
        setSelectedAssessmentId(null)
    }, [period])

    const addAssessment = useMutation({
        mutationFn: async ({ categoryId }) => {
            const response = await axios.post(route('assessment.add'), {
                category_id: categoryId,
            })

            return response.data
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: ['class-gradings', classId],
            })
        },
    })

    if (isLoading) return <GradingSkeleton />

    const currentExam = data?.exams?.find(
        (exam) => exam.period === period
    )

    // Derived data — no need to store this in state.
    const categories = data.classStanding
        .filter(category => category.period === period)
        .sort(sortByOrder)

    // If the current ID belongs to another period,
    // automatically fall back to the first category.
    const selectedCategory =
        categories.find(
            category => category.id === selectedCategoryId
        ) ?? categories[0]

    const assessments = [...(selectedCategory?.assessments ?? [])]
        .sort(sortByOrder)

    const defaultAssessment = assessments.find(
        assessment => assessment.sort_order === 1
    )

    const resolvedAssessmentId = assessments.some(
        assessment => assessment.id === selectedAssessmentId
    )
        ? selectedAssessmentId
        : defaultAssessment?.id ?? assessments[0]?.id ?? null

    const handleCategorySelect = category => {
        setSelectedCategoryId(category.id)
        setSelectedAssessmentId(null)
        setActiveSection('category')
    }


    return (
        <div className="space-y-4">

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
                        className="w-full"
                        variant={
                            activeSection === 'exam'
                                ? 'default'
                                : 'secondary'
                        }
                        onClick={() => setActiveSection('exam')}
                    >
                        {periodLabel} Exam
                    </Button>
                </GradingCard>
            </div>

            <Separator />

            {/* Assessments */}
            {activeSection === 'category' && selectedCategory && (
                <div className="space-y-4">
                    {/* <p className="font-bold">
                        {selectedCategory.name}
                    </p> */}

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

                        <PillTab
                            variant="action"
                            disabled={addAssessment.isPending}
                            onClick={() => {
                                if (addAssessment.isPending) return

                                addAssessment.mutate({
                                    categoryId: selectedCategory.id,
                                })
                            }}
                        >
                            <Plus />
                            {addAssessment.isPending ? 'Adding...' : 'Add assessment'}
                        </PillTab>
                        {addAssessment.isError && (
                            <p role="alert" className="text-sm text-destructive">
                                {addAssessment.error?.response?.data?.message ??
                                    'Unable to add assessment. Please try again.'}
                            </p>
                        )}
                    </div>
                    <StudentAssessmentsScores id={resolvedAssessmentId} classId={classId} />
                </div>
            )}

            {activeSection === 'exam' && (
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