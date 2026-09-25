import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
    Edit3Icon,
    EllipsisVertical,
    LoaderCircle,
    MoveDown,
    MoveUp,
    Plus,
    SlidersHorizontal,
} from 'lucide-react'

import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Card, CardContent } from '@/Components/ui/card'
import { Input } from '@/Components/ui/input'
import { Separator } from '@/Components/ui/separator'
import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from '@/Components/ui/drawer'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/Components/ui/popover'
import NumberInput from '@/Components/ui/NumberInput'

const CLASS_STANDING_WEIGHT = 70
const EXAM_WEIGHT = 30

const sortByOrder = (a, b) =>
    Number(a.sort_order) - Number(b.sort_order) ||
    Number(a.id) - Number(b.id)

function errorMessage(error) {
    return (
        Object.values(error.response?.data?.errors ?? {}).flat()[0] ||
        error.response?.data?.message ||
        error.message ||
        'Unable to save. Please try again.'
    )
}

// Preserve assessments and the other grading period.
function mergeSettings(current, response, period) {
    if (!current) return current

    const next = { ...current }

    if (Array.isArray(response.categories)) {
        const existing = new Map(
            (current.classStanding ?? []).map((category) => [
                String(category.id),
                category,
            ])
        )

        next.classStanding = [
            ...(current.classStanding ?? []).filter(
                (category) => category.period !== period
            ),
            ...response.categories.map((category) => ({
                ...existing.get(String(category.id)),
                ...category,
                assessments:
                    existing.get(String(category.id))?.assessments ?? [],
            })),
        ]
    }

    if (response.exam) {
        next.exams = (current.exams ?? []).map((exam) =>
            String(exam.id) === String(response.exam.id)
                ? { ...exam, ...response.exam }
                : exam
        )
    }

    return next
}

function CategoryActions({
    index,
    total,
    disabled,
    onEdit,
    onMove,
}) {
    const [open, setOpen] = useState(false)

    function choose(action) {
        setOpen(false)
        action()
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={disabled}
                    aria-label="Category actions"
                >
                    <EllipsisVertical className="size-4" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                className="flex w-40 flex-col gap-1 p-1"
            >
                <Button
                    type="button"
                    variant="ghost"
                    className="justify-between"
                    disabled={disabled}
                    onClick={() => choose(onEdit)}
                >
                    Edit
                    <Edit3Icon className="size-4" />
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    className="justify-between"
                    disabled={disabled || index === 0}
                    onClick={() => choose(() => onMove('up'))}
                >
                    Move up
                    <MoveUp className="size-4" />
                </Button>

                <Button
                    type="button"
                    variant="ghost"
                    className="justify-between"
                    disabled={disabled || index === total - 1}
                    onClick={() => choose(() => onMove('down'))}
                >
                    Move down
                    <MoveDown className="size-4" />
                </Button>
            </PopoverContent>
        </Popover>
    )
}

export default function ManageCategoriesDrawer({
    categories = [],
    classId,
    period,
    periodLabel,
    isMobile,
    examId,
    maxScore,
}) {
    const queryClient = useQueryClient()

    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const [saved, setSaved] = useState('')

    const requestRunning = useRef(false)

    const sortedCategories = [...categories].sort(sortByOrder)

    const allocatedWeight = sortedCategories.reduce(
        (total, category) => total + Number(category.weight),
        0
    )

    const remainingWeight = 100 - allocatedWeight

    const allocationText =
        `${allocatedWeight}% allocated · ` +
        `${Math.abs(remainingWeight)}% ` +
        `${remainingWeight < 0 ? 'over' : 'remaining'}`

    const actionsDisabled = busy || draft !== null

    function startEditing(value) {
        if (requestRunning.current) return

        setError('')
        setSaved('')
        setDraft(value)
    }

    function cancelEdit() {
        if (requestRunning.current) return

        setDraft(null)
        setError('')
    }

    function updateDraft(field, value) {
        setDraft((current) => ({
            ...current,
            [field]: value,
        }))
    }

    async function send(routeName, values, message) {
        if (requestRunning.current) return

        requestRunning.current = true
        setBusy(true)
        setError('')
        setSaved('')

        try {
            const { data } = await axios.post(route(routeName), {
                class_id: classId,
                period,
                ...values,
            })

            if (!Array.isArray(data?.categories) && !data?.exam) {
                throw new Error(
                    'The endpoint returned an unexpected response. ' +
                    'Refresh to check whether your change was saved.'
                )
            }

            const queryKey = ['class-gradings', classId]

            await queryClient.cancelQueries({
                queryKey,
                exact: true,
            })

            queryClient.setQueryData(queryKey, (current) =>
                mergeSettings(current, data, period)
            )

            void queryClient.invalidateQueries({ queryKey })

            setDraft(null)
            setSaved(message)
        } catch (error) {
            setError(errorMessage(error))
        } finally {
            requestRunning.current = false
            setBusy(false)
        }
    }

    function saveCategory(event) {
        event.preventDefault()

        if (!draft || requestRunning.current) return

        const name = draft.name.trim()
        const weight = Number(draft.weight)

        if (!name) {
            setError('Category name is required.')
            return
        }

        if (
            draft.weight === '' ||
            !Number.isInteger(weight) ||
            weight < 0 ||
            weight > 100
        ) {
            setError('Percentage must be a whole number from 0 to 100.')
            return
        }

        const otherWeight = sortedCategories.reduce(
            (total, category) =>
                String(category.id) === String(draft.id)
                    ? total
                    : total + Number(category.weight),
            0
        )

        if (otherWeight + weight > 100) {
            setError(
                `Only ${Math.max(0, 100 - otherWeight)}% is available. ` +
                'Reduce another category first.'
            )
            return
        }

        const adding = draft.kind === 'add'

        void send(
            adding
                ? 'manage-grading.category.create'
                : 'manage-grading.category.update',
            {
                ...(!adding ? { category_id: draft.id } : {}),
                name,
                weight,
            },
            adding ? 'Category added.' : 'Category saved.'
        )
    }

    function saveExam(event) {
        event.preventDefault()

        if (!draft || requestRunning.current) return

        const maximum = Number(draft.maximum)

        if (
            draft.maximum === '' ||
            !Number.isInteger(maximum) ||
            maximum < 1 ||
            maximum > 2147483647
        ) {
            setError('Maximum score must be a positive whole number.')
            return
        }

        void send(
            'manage-grading.exam.maximum',
            {
                exam_id: examId,
                max_score: maximum,
            },
            'Exam maximum saved.'
        )
    }

    function categoryForm() {
        return (
            <form onSubmit={saveCategory} className="space-y-3 py-3">
                <div className="flex flex-wrap items-end gap-3">
                    <label className="min-w-0 flex-1 text-xs text-muted-foreground">
                        Category name
                        <Input
                            autoFocus
                            value={draft.name}
                            required
                            maxLength={255}
                            disabled={busy}
                            onChange={(event) =>
                                updateDraft('name', event.target.value)
                            }
                            className="mt-1"
                        />
                    </label>

                    <label className="text-xs text-muted-foreground">
                        Percentage
                        <NumberInput
                            min={0}
                            max={100}
                            step={1}
                            value={draft.weight}
                            onValueChange={(value) => updateDraft('weight', String(value))}
                            required
                            disabled={busy}
                            className="mt-1 w-24"
                            aria-label="Category percentage"
                        />
                    </label>
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={cancelEdit}
                    >
                        Cancel
                    </Button>

                    <Button type="submit" size="sm" disabled={busy}>
                        {busy && (
                            <LoaderCircle className="mr-2 size-4 animate-spin" />
                        )}
                        Save
                    </Button>
                </div>
            </form>
        )
    }

    return (
        <Drawer
            open={open}
            showSwipeHandle={isMobile}
            swipeDirection={isMobile ? 'down' : 'right'}
            onOpenChange={(value) => {
                if (requestRunning.current) return

                setOpen(value)

                if (!value) {
                    setDraft(null)
                    setError('')
                    setSaved('')
                }
            }}
        >
            <DrawerTrigger
                render={
                    <Button
                        type="button"
                        variant="outline"
                        title="Manage Categories"
                        aria-label="Manage Categories"
                    >
                        <SlidersHorizontal size={15} />
                    </Button>
                }
            />

            <DrawerContent>
                <DrawerHeader className="bg-background backdrop-blur-sm">
                    <DrawerTitle>
                        Grading Settings – {periodLabel}
                    </DrawerTitle>
                    <DrawerDescription>
                        Manage categories, their order, and the exam maximum.
                    </DrawerDescription>
                </DrawerHeader>

                <div className="flex-1 space-y-6 overflow-y-auto p-4">
                    <div>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="flex items-center justify-between gap-2 rounded-lg bg-blue-100 p-3 text-black">
                                <span className="text-sm font-medium">
                                    Class Standing
                                </span>
                                <strong>{CLASS_STANDING_WEIGHT}%</strong>
                            </div>

                            <div className="flex items-center justify-between gap-2 rounded-lg bg-green-100 p-3 text-black">
                                <span className="text-sm font-medium">
                                    {periodLabel} Exam
                                </span>
                                <strong>{EXAM_WEIGHT}%</strong>
                            </div>
                        </div>

                        <p className="mt-2 text-xs text-muted-foreground">
                            Category weights total 100% within Class Standing.
                            Class Standing contributes {CLASS_STANDING_WEIGHT}%
                            of the term grade. The exam contributes the fixed{' '}
                            {EXAM_WEIGHT}%.
                        </p>
                    </div>

                    <Separator />

                    {error && (
                        <p role="alert" className="text-sm text-destructive">
                            {error}
                        </p>
                    )}

                    {saved && (
                        <p role="status" className="text-sm text-green-600">
                            {saved}
                        </p>
                    )}

                    {busy && (
                        <p
                            role="status"
                            className="flex items-center gap-2 text-sm text-muted-foreground"
                        >
                            <LoaderCircle className="size-4 animate-spin" />
                            Saving changes…
                        </p>
                    )}

                    <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">Class Standing</p>

                            <Badge
                                variant={
                                    allocatedWeight > 100
                                        ? 'destructive'
                                        : 'secondary'
                                }
                            >
                                {allocationText}
                            </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            These categories make up 100% of Class Standing.
                        </p>

                        <Card>
                            <CardContent className="px-4 py-0">
                                {sortedCategories.map((category, index) => (
                                    <div key={category.id}>
                                        {draft?.kind === 'category' &&
                                            String(draft.id) === String(category.id) ? (
                                            categoryForm()
                                        ) : (
                                            <div className="flex items-center justify-between gap-3 py-3">
                                                <div className="min-w-0">
                                                    <p className="break-words font-medium">
                                                        {category.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {category.assessments?.length ?? 0}{' '}
                                                        assessment(s)
                                                    </p>
                                                </div>

                                                <div className="flex shrink-0 items-center gap-2">
                                                    <span className="font-medium">
                                                        {category.weight}%
                                                    </span>

                                                    <CategoryActions
                                                        index={index}
                                                        total={sortedCategories.length}
                                                        disabled={actionsDisabled}
                                                        onEdit={() =>
                                                            startEditing({
                                                                kind: 'category',
                                                                id: category.id,
                                                                name: category.name,
                                                                weight: String(category.weight),
                                                            })
                                                        }
                                                        onMove={(direction) =>
                                                            void send(
                                                                'manage-grading.category.move',
                                                                {
                                                                    category_id: category.id,
                                                                    direction,
                                                                },
                                                                'Category order saved.'
                                                            )
                                                        }
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {index < sortedCategories.length - 1 && (
                                            <Separator />
                                        )}
                                    </div>
                                ))}

                                {draft?.kind === 'add' && categoryForm()}

                                {!sortedCategories.length &&
                                    draft?.kind !== 'add' && (
                                        <p className="py-4 text-sm text-muted-foreground">
                                            No categories yet.
                                        </p>
                                    )}
                            </CardContent>
                        </Card>

                        <Button
                            type="button"
                            variant="ghost"
                            className="text-primary"
                            disabled={actionsDisabled}
                            onClick={() =>
                                startEditing({
                                    kind: 'add',
                                    name: '',
                                    weight: String(Math.max(0, remainingWeight)),
                                })
                            }
                        >
                            <Plus className="size-4" />
                            Add Category
                        </Button>
                    </div>

                    <div className="space-y-3">
                        <p className="font-medium">Exam</p>

                        <Card>
                            <CardContent className="space-y-3 p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium">
                                        {periodLabel} Exam
                                    </p>

                                    {draft?.kind !== 'exam' && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            disabled={actionsDisabled || !examId}
                                            onClick={() =>
                                                startEditing({
                                                    kind: 'exam',
                                                    maximum: String(maxScore ?? 100),
                                                })
                                            }
                                        >
                                            <Edit3Icon className="mr-1 size-4" />
                                            Edit
                                        </Button>
                                    )}
                                </div>

                                {draft?.kind === 'exam' ? (
                                    <form onSubmit={saveExam} className="space-y-3">
                                        <label className="flex items-center justify-between gap-3 text-sm">
                                            Maximum Score
                                            <NumberInput
                                                autoFocus
                                                min={1}
                                                max={2147483647}
                                                step={1}
                                                value={draft.maximum}
                                                onValueChange={(value) => updateDraft('maximum', String(value))}
                                                required
                                                disabled={busy}
                                                className="w-24"
                                                aria-label="Exam maximum score"
                                            />
                                        </label>

                                        <div className="flex justify-end gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={busy}
                                                onClick={cancelEdit}
                                            >
                                                Cancel
                                            </Button>

                                            <Button
                                                type="submit"
                                                size="sm"
                                                disabled={busy}
                                            >
                                                {busy ? 'Saving…' : 'Save'}
                                            </Button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <span className="text-muted-foreground">
                                            Maximum Score
                                        </span>
                                        <span>
                                            {examId
                                                ? `${maxScore} points`
                                                : 'No exam configured for this period.'}
                                        </span>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>

                <DrawerFooter>
                    <DrawerClose
                        render={
                            <Button
                                type="button"
                                variant="outline"
                                disabled={busy}
                            >
                                Close
                            </Button>
                        }
                    />
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}