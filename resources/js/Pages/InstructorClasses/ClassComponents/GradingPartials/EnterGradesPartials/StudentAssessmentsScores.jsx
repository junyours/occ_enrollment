import React, { useEffect, useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import {
    Check,
    Clock3,
    LoaderCircle,
    RotateCcw,
    Search,
    Trash,
} from "lucide-react"

import Checkbox from "@/Components/Checkbox"
import { Button } from "@/Components/ui/button"
import { Card, CardContent } from "@/Components/ui/card"
import IconInput from "@/Components/ui/IconInput"
import { Input } from "@/Components/ui/input"
import NumberInput from "@/Components/ui/NumberInput"
import { Progress } from "@/Components/ui/progress"
import { Skeleton } from "@/Components/ui/skeleton"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/ui/table"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/Components/ui/alert-dialog"

import { formatName } from "@/Lib/InfoUtils"
import {
    MAXIMUM_KEY,
    NAME_KEY,
    scoreKey,
    useScoreAutosave,
} from "./useScoreAutosave"
import { FeedbackModal } from "@/Components/FeedbackModalProvider"

const EMPTY_LIST = []
const STUDENTS_STALE_TIME = 10 * 60 * 1000
const DELETE_UNDO_DELAY_MS = 10000

const hasScore = (score) =>
    score !== null && score !== undefined && score !== ""

const getStudentKey = (studentId) => Number(studentId)

async function fetchRouteData(routeName, id, signal) {
    const { data } = await axios.post(
        route(routeName, { id }),
        undefined,
        { signal }
    )

    return data
}

function AssessmentInfoSkeleton() {
    return (
        <div className="space-y-4">
            <Card>
                <CardContent className="p-2">
                    <div className="grid grid-cols-2 items-center gap-4 md:grid-cols-12">
                        <div className="min-w-0 md:col-span-5">
                            <Skeleton className="mb-2 h-4 w-36 max-w-full" />
                            <Skeleton className="h-3 w-52 max-w-full" />
                        </div>

                        <div className="md:col-span-3">
                            <Skeleton className="mb-2 h-4 w-24" />
                            <Skeleton className="h-1.5 w-full" />
                        </div>

                        <Skeleton className="h-9 w-full md:col-span-3" />
                        <Skeleton className="size-9 justify-self-end" />
                    </div>
                </CardContent>
            </Card>

            <Skeleton className="h-9 w-full sm:w-96" />

            <Card>
                <CardContent className="space-y-4 p-4">
                    {Array.from({ length: 6 }, (_, index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between gap-4"
                        >
                            <Skeleton className="h-4 w-52 max-w-[60%]" />
                            <Skeleton className="h-6 w-20" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    )
}

function SaveStatus({ status = "idle", error, onRetry }) {
    return (
        <span
            className="inline-flex w-24 shrink-0 items-center gap-1 text-xs"
            aria-live="polite"
        >
            {status === "unsaved" && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                    Unsaved
                </span>
            )}

            {status === "saving" && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <LoaderCircle
                        className="h-3.5 w-3.5 animate-spin"
                        aria-hidden="true"
                    />
                    Saving…
                </span>
            )}

            {status === "saved" && (
                <span className="inline-flex items-center gap-1 text-green-600">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />
                    Saved
                </span>
            )}

            {status === "error" && (
                <button
                    type="button"
                    onClick={onRetry}
                    title={error}
                    aria-label={`Retry saving: ${error || "Save failed"}`}
                    className="inline-flex items-center gap-1 text-destructive underline underline-offset-2"
                >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    Retry
                </button>
            )}
        </span>
    )
}

function AssessmentHeader({
    assessment,
    assessmentName,
    onNameChange,
    onNameBlur,
    nameSave,
    onRetryName,
    maximumScore,
    onMaximumScoreChange,
    onMaximumScoreBlur,
    maximumSave,
    onRetryMaximum,
    gradedCount,
    studentCount,
    onDelete,
    deleteTriggerRef,
    isDeleting,
    deleteOpen,
    onDeleteOpenChange,
    deleteError,
    hasPendingChanges,
}) {
    const progressPercentage = studentCount
        ? Math.round((gradedCount / studentCount) * 100)
        : 0

    return (
        <Card className="bg-secondary/30">
            <CardContent className="p-2">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-4 md:grid-cols-12 xl:items-center">
                    {/* Assessment name */}
                    <div className="col-start-1 row-start-1 min-w-0 md:col-span-11 xl:col-span-5">
                        <div className="mb-1 flex min-w-0 items-center gap-2">
                            <Input
                                value={assessmentName}
                                onChange={(event) =>
                                    onNameChange(event.target.value)
                                }
                                onBlur={onNameBlur}
                                onKeyDown={(event) => {
                                    if (
                                        event.key === "Enter" &&
                                        !event.nativeEvent.isComposing
                                    ) {
                                        event.preventDefault()
                                        onNameBlur()
                                        event.currentTarget.blur()
                                    }
                                }}
                                placeholder="Assessment name"
                                maxLength={255}
                                aria-label="Assessment name"
                                aria-invalid={nameSave?.status === "error"}
                                className="h-8 min-w-0 flex-1 rounded-none border-x-0 border-t-0 p-0 font-medium focus:outline-none focus-visible:ring-0"
                            />

                            <SaveStatus
                                status={nameSave?.status}
                                error={nameSave?.error}
                                onRetry={onRetryName}
                            />
                        </div>

                        {nameSave?.error && (
                            <p
                                className="mb-1 text-xs text-destructive"
                                role="alert"
                            >
                                {nameSave.error}
                            </p>
                        )}

                        <p className="text-xs text-muted-foreground">
                            {assessment.grading_category?.name}
                            {" • "}
                            Maximum score: {maximumScore} points
                        </p>
                    </div>

                    {/* Grading progress */}
                    <div className="col-span-2 min-w-0 md:col-span-6 md:col-start-1 md:row-start-2 xl:col-span-3 xl:col-start-6 xl:row-start-1">
                        <p className="mb-1 text-sm text-muted-foreground">
                            {gradedCount}/{studentCount} graded
                        </p>

                        <div className="flex w-full items-center gap-2">
                            <Progress
                                value={progressPercentage}
                                className="min-w-0 flex-1"
                                aria-label="Grading progress"
                            />

                            <p className="shrink-0 text-xs tabular-nums">
                                {progressPercentage}%
                            </p>
                        </div>
                    </div>

                    {/* Maximum score */}
                    <div className="col-span-2 flex flex-wrap items-center gap-x-2 gap-y-1 md:col-span-6 md:col-start-7 md:row-start-2 md:justify-end xl:col-span-3 xl:col-start-9 xl:row-start-1">
                        <p className="whitespace-nowrap text-sm">
                            Maximum score
                        </p>

                        <NumberInput
                            value={maximumScore}
                            min={1}
                            onValueChange={onMaximumScoreChange}
                            onBlur={onMaximumScoreBlur}
                            className="w-24 shrink-0"
                            aria-label="Maximum score"
                        />

                        <SaveStatus
                            status={maximumSave?.status}
                            error={maximumSave?.error}
                            onRetry={onRetryMaximum}
                        />
                    </div>

                    {/* Delete assessment */}
                    <div className="col-start-2 row-start-1 flex justify-end md:col-start-12 xl:col-start-12 xl:items-center">
                        <AlertDialog
                            open={deleteOpen}
                            onOpenChange={onDeleteOpenChange}
                        >
                            <AlertDialogTrigger asChild>
                                <Button
                                    ref={deleteTriggerRef}
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    disabled={isDeleting}
                                    aria-label="Delete assessment"
                                    title="Delete assessment"
                                    className="bg-destructive/20 hover:bg-destructive/30"
                                >
                                    <Trash
                                        className="text-destructive"
                                        aria-hidden="true"
                                    />
                                </Button>
                            </AlertDialogTrigger>

                            <AlertDialogContent
                                aria-busy={isDeleting}
                                onEscapeKeyDown={(event) => {
                                    if (isDeleting) event.preventDefault()
                                }}
                                onCloseAutoFocus={(event) => {
                                    if (isDeleting) event.preventDefault()
                                }}
                            >
                                <AlertDialogHeader>
                                    <AlertDialogTitle>
                                        Delete assessment?
                                    </AlertDialogTitle>

                                    <AlertDialogDescription>
                                        Delete “{assessmentName}” from the
                                        active assessment list? You will have{' '}
                                        {DELETE_UNDO_DELAY_MS / 1000} seconds to undo
                                        before the delete request is sent.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>

                                {hasPendingChanges && (
                                    <p
                                        className="text-sm text-muted-foreground"
                                        role="status"
                                    >
                                        Wait for your changes to finish saving.
                                        If a save failed, cancel this dialog and
                                        retry that save first.
                                    </p>
                                )}

                                {deleteError && (
                                    <p
                                        className="text-sm text-destructive"
                                        role="alert"
                                    >
                                        {deleteError}
                                    </p>
                                )}

                                <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeleting}>
                                        Cancel
                                    </AlertDialogCancel>

                                    <AlertDialogAction
                                        type="button"
                                        disabled={isDeleting || hasPendingChanges}
                                        onClick={(event) => {
                                            event.preventDefault()
                                            if (isDeleting || hasPendingChanges) return
                                            void onDelete()
                                        }}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                        Delete assessment
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

function StudentScoresTable({
    students,
    maximumScore,
    scoreTexts,
    onScoreChange,
    onScoreFocus,
    onScoreBlur,
    onFlushScore,
    onRetryScore,
}) {
    const inputRefs = useRef(new Map())

    function handleKeyDown(event, index) {
        if (event.nativeEvent.isComposing) return

        const direction = {
            ArrowUp: -1,
            ArrowDown: 1,
            Enter: 1,
        }[event.key]

        if (direction === undefined) return

        event.preventDefault()
        onFlushScore(students[index].id)

        const nextStudent = students[index + direction]
        const nextInput =
            nextStudent && inputRefs.current.get(nextStudent.id)

        nextInput?.focus()
        nextInput?.select()
    }

    return (
        <Card className="overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead className="w-96">Student</TableHead>
                        <TableHead>Score</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {students.map((student, index) => (
                        <TableRow key={student.id}>
                            <TableCell>{index + 1}.</TableCell>
                            <TableCell>{student.displayName}</TableCell>

                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Input
                                        ref={(element) => {
                                            if (element) {
                                                inputRefs.current.set(
                                                    student.id,
                                                    element
                                                )
                                            } else {
                                                inputRefs.current.delete(
                                                    student.id
                                                )
                                            }
                                        }}
                                        inputMode="decimal"
                                        value={
                                            scoreTexts.get(student.id) ??
                                            student.score ??
                                            ""
                                        }
                                        onFocus={() =>
                                            onScoreFocus(student.id)
                                        }
                                        onBlur={() =>
                                            onScoreBlur(student.id)
                                        }
                                        onKeyDown={(event) =>
                                            handleKeyDown(event, index)
                                        }
                                        onChange={(event) =>
                                            onScoreChange(
                                                student.id,
                                                event.target.value
                                            )
                                        }
                                        aria-label={`Score for ${student.displayName}`}
                                        className="h-6 w-16 rounded-none border-x-0 border-t-0 border-b border-gray-400 py-0 text-center shadow-none transition-colors duration-200 focus:border-b-2 focus:outline-none focus-visible:ring-0"
                                    />

                                    <span className="text-sm text-muted-foreground">
                                        /{maximumScore}
                                    </span>

                                    <SaveStatus
                                        status={student.saveStatus}
                                        error={student.saveError}
                                        onRetry={() =>
                                            onRetryScore(student.id)
                                        }
                                    />
                                </div>

                                {student.saveError && (
                                    <p
                                        className="mt-1 text-xs text-destructive"
                                        role="alert"
                                    >
                                        {student.saveError}
                                    </p>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}

                    {students.length === 0 && (
                        <TableRow>
                            <TableCell
                                colSpan={3}
                                className="h-24 text-center text-muted-foreground"
                            >
                                No students found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>
    )
}

export default function StudentAssessmentsScores({
    id,
    classId,
    onDeleted,
}) {
    if (!id || !classId) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                    Select a class and assessment to view student scores.
                </CardContent>
            </Card>
        )
    }

    return (
        <StudentScoresContent
            key={`${classId}:${id}`}
            assessmentId={id}
            classId={classId}
            onDeleted={onDeleted}
        />
    )
}

function StudentScoresContent({
    assessmentId,
    classId,
    onDeleted,
}) {
    const queryClient = useQueryClient()

    const [deleted, setDeleted] = useState(false)
    const [deletePhase, setDeletePhase] = useState("idle")
    const isDeleting = deletePhase !== "idle"
    const [deleteOpen, setDeleteOpen] = useState(false)
    const [deleteError, setDeleteError] = useState("")

    const [search, setSearch] = useState("")
    const [showOnlyUngraded, setShowOnlyUngraded] = useState(false)
    const [scoreTexts, setScoreTexts] = useState(() => new Map())
    const [focusedStudentId, setFocusedStudentId] = useState(null)

    const deletingRef = useRef(false)
    const deleteTriggerRef = useRef(null)
    const deleteWaitRef = useRef(null)
    const mountedRef = useRef(false)
    const autosave = useScoreAutosave(assessmentId, classId)

    useEffect(() => {
        mountedRef.current = true

        return () => {
            mountedRef.current = false
            // Switching assessments or leaving the page cancels the countdown.
            // A DELETE that was already sent must still finish normally.
            deleteWaitRef.current?.abort()
        }
    }, [])

    const hasPendingChanges =
        autosave.pendingCount > 0 ||
        [...autosave.entries.values()].some((entry) => entry.dirty || entry.inFlight)

    const pendingChangesRef = useRef(hasPendingChanges)
    pendingChangesRef.current = hasPendingChanges

    function handleDeleteOpenChange(open) {
        if (deletingRef.current) return

        setDeleteOpen(open)
        setDeleteError("")
    }

    async function handleDelete() {
        if (deletingRef.current || deleted) return

        // Complete autosaves before sending DELETE.
        if (pendingChangesRef.current) {
            setDeleteError(
                "Finish saving your changes before deleting this assessment."
            )
            return
        }

        deletingRef.current = true
        setDeletePhase("waiting")
        setDeleteError("")
        setDeleteOpen(false)

        const controller = new AbortController()
        deleteWaitRef.current = controller

        let serverDeleted = false

        try {
            const proceed = await FeedbackModal.Undoable(
                `“${assessmentName}” will be deleted after the countdown.`,
                {
                    delayMs: DELETE_UNDO_DELAY_MS,
                    title: "Deletion scheduled",
                    undoLabel: "Undo — keep assessment",
                    loadingTitle: "Deleting assessment",
                    loadingMessage: "Deleting assessment…",
                    returnFocusElement: deleteTriggerRef.current,
                    signal: controller.signal,
                }
            )

            if (!proceed) return
            if (!mountedRef.current) {
                FeedbackModal.Close()
                return
            }

            // Read the latest autosave state again before committing.
            if (pendingChangesRef.current) {
                const message = "Deletion cancelled. Finish saving your changes before deleting this assessment."
                setDeleteError(message)
                FeedbackModal.Warning(message, { title: "Changes still saving" })
                return
            }

            // Undo only cancels the waiting period, never an in-flight request.
            deleteWaitRef.current = null
            setDeletePhase("deleting")
            await axios.delete(
                route("assessments.destroy", { id: assessmentId })
            )

            serverDeleted = true
            if (mountedRef.current) setDeleted(true)
            FeedbackModal.Success("Assessment deleted successfully!")

            const infoKey = ["assessment-info", assessmentId]
            const scoresKey = ["assessment-scores", assessmentId]
            const listKey = ["class-gradings", classId]

            await Promise.all(
                [infoKey, scoresKey, listKey].map((queryKey) =>
                    queryClient.cancelQueries({
                        queryKey,
                        exact: true,
                    })
                )
            )

            // Remove the deleted assessment from the cached list.
            queryClient.setQueryData(listKey, (data) => {
                const removeAssessment = (categories) => categories.map((category) => ({
                    ...category,
                    assessments: category.assessments?.filter(
                        (item) =>
                            String(item.id) !== String(assessmentId)
                    ),
                }))

                if (Array.isArray(data)) return removeAssessment(data)
                if (Array.isArray(data?.classStanding)) {
                    return {
                        ...data,
                        classStanding: removeAssessment(data.classStanding),
                    }
                }
                return data
            })

            queryClient.removeQueries({
                queryKey: infoKey,
                exact: true,
            })

            queryClient.removeQueries({
                queryKey: scoresKey,
                exact: true,
            })

            void Promise.all([
                queryClient.invalidateQueries({ queryKey: listKey }),
                queryClient.invalidateQueries({ queryKey: ["grade-summary"] }),
            ]).catch((error) => {
                console.error("Unable to refresh grading data:", error)
            })

            if (mountedRef.current) onDeleted?.(assessmentId)
        } catch (error) {
            if (serverDeleted) {
                console.error(
                    "Assessment deleted, but refreshing the view failed:",
                    error
                )
                FeedbackModal.Warning(
                    "The assessment was deleted, but the view could not refresh. Please refresh the page.",
                    { title: "Assessment deleted" }
                )
                return
            }

            console.error("Unable to delete assessment:", error)

            const message = error.response?.data?.message || error.message ||
                "Unable to delete the assessment. Please try again."
            if (mountedRef.current) setDeleteError(message)
            FeedbackModal.Error(message, {
                title: "Unable to delete assessment",
                autoClose: false,
            })
        } finally {
            if (deleteWaitRef.current === controller) deleteWaitRef.current = null
            deletingRef.current = false
            if (mountedRef.current) setDeletePhase("idle")
        }
    }

    const studentsQuery = useQuery({
        queryKey: ["class.students", classId],
        queryFn: ({ signal }) =>
            fetchRouteData("class.students", classId, signal),
        staleTime: STUDENTS_STALE_TIME,
    })

    const assessmentQuery = useQuery({
        queryKey: ["assessment-info", assessmentId],
        enabled: !deleted && !isDeleting,
        queryFn: ({ signal }) =>
            fetchRouteData("assessment-info", assessmentId, signal),
    })

    const scoresQuery = useQuery({
        queryKey: ["assessment-scores", assessmentId],
        enabled: !deleted && !isDeleting,
        queryFn: ({ signal }) =>
            fetchRouteData("assessment-scores", assessmentId, signal),
    })

    const students = studentsQuery.data ?? EMPTY_LIST
    const assessment = assessmentQuery.data
    const savedScores = scoresQuery.data ?? EMPTY_LIST

    const nameSave = autosave.entries.get(NAME_KEY)
    const maximumSave = autosave.entries.get(MAXIMUM_KEY)

    const assessmentName = nameSave?.dirty
        ? nameSave.value
        : (assessment?.name ?? "")

    const maximumScore = maximumSave?.dirty
        ? maximumSave.value
        : Number(assessment?.max_score ?? 0)

    const savedScoresByStudentId = useMemo(
        () =>
            new Map(
                savedScores.map(({ student_id, score }) => [
                    getStudentKey(student_id),
                    score,
                ])
            ),
        [savedScores]
    )

    // Unsaved local edits take precedence over server values.
    const scoresByStudentId = useMemo(() => {
        const scores = new Map(savedScoresByStudentId)

        autosave.entries.forEach((entry) => {
            if (entry.kind === "score" && entry.dirty) {
                scores.set(
                    getStudentKey(entry.studentId),
                    entry.value
                )
            }
        })

        return scores
    }, [savedScoresByStudentId, autosave.entries])

    const searchableStudents = useMemo(
        () =>
            students.map((student) => {
                const displayName = formatName(student, {
                    format: "LFM",
                })

                const studentNumber = String(
                    student.student_id_number ??
                    student.student_number ??
                    ""
                ).toLowerCase()

                return {
                    id: student.id,
                    displayName,
                    searchName: displayName.toLowerCase(),
                    studentNumber,
                }
            }),
        [students]
    )

    const studentRows = useMemo(
        () =>
            searchableStudents.map((student) => {
                const score = scoresByStudentId.get(
                    getStudentKey(student.id)
                )

                const save = autosave.entries.get(
                    scoreKey(student.id)
                )

                return {
                    ...student,
                    score,
                    isGraded: hasScore(score),
                    isDirty: save?.dirty ?? false,
                    saveStatus:
                        save?.status ??
                        (hasScore(score) ? "saved" : "idle"),
                    saveError: save?.error,
                }
            }),
        [searchableStudents, scoresByStudentId, autosave.entries]
    )

    const gradedCount = useMemo(
        () =>
            studentRows.reduce(
                (count, student) =>
                    count + Number(student.isGraded),
                0
            ),
        [studentRows]
    )

    const filteredStudents = useMemo(() => {
        const query = search.trim().toLowerCase()

        return studentRows.filter((student) => {
            const matchesSearch =
                student.searchName.includes(query) ||
                student.studentNumber.includes(query)

            const matchesGradingFilter =
                !showOnlyUngraded ||
                !student.isGraded ||
                student.id === focusedStudentId ||
                student.isDirty

            return matchesSearch && matchesGradingFilter
        })
    }, [studentRows, search, showOnlyUngraded, focusedStudentId])

    function handleScoreChange(studentId, text) {
        if (deletingRef.current || deleted) return

        // Allow intermediate decimal text while typing.
        if (!/^(?:\d+(?:\.\d*)?|\.\d+)?$/.test(text)) return

        const value = text === "" ? null : Number(text)

        if (value !== null && !Number.isFinite(value)) return

        const nextScore =
            value === null ? null : Math.min(value, maximumScore)

        const displayText =
            value !== nextScore ? String(nextScore) : text

        setScoreTexts((current) =>
            new Map(current).set(studentId, displayText)
        )

        const savedScore = savedScoresByStudentId.get(
            getStudentKey(studentId)
        )

        autosave.editScore(studentId, nextScore, savedScore)
    }

    function handleScoreBlur(studentId) {
        if (deletingRef.current || deleted) return

        autosave.flushScore(studentId)
        setFocusedStudentId(null)

        setScoreTexts((current) => {
            const next = new Map(current)
            next.delete(studentId)
            return next
        })
    }

    function handleMaximumScoreChange(value) {
        if (deletingRef.current || deleted) return

        const nextMaximum = Number(value)

        if (!Number.isFinite(nextMaximum) || nextMaximum < 1) return

        autosave.editMaximum(nextMaximum, assessment.max_score)
    }

    const queries = [
        studentsQuery,
        assessmentQuery,
        scoresQuery,
    ]

    if (deleted) {
        return (
            <Card>
                <CardContent
                    className="p-6 text-center text-sm text-muted-foreground"
                    role="status"
                >
                    Assessment deleted. Select another assessment to continue.
                </CardContent>
            </Card>
        )
    }

    if (queries.some((query) => query.isLoading)) {
        return <AssessmentInfoSkeleton />
    }

    if (
        queries.some(
            (query) => query.isError && query.data === undefined
        ) ||
        !assessment
    ) {
        return (
            <Card>
                <CardContent className="p-6 text-center text-sm text-destructive">
                    Unable to load the assessment information.
                </CardContent>
            </Card>
        )
    }

    return (
        <fieldset
            disabled={isDeleting}
            aria-busy={isDeleting}
            className="m-0 min-w-0 space-y-4 border-0 p-0"
        >
            <AssessmentHeader
                assessment={assessment}
                assessmentName={assessmentName}
                onNameChange={(value) => {
                    if (!deletingRef.current && !deleted) {
                        autosave.editName(value, assessment.name)
                    }
                }}
                onNameBlur={autosave.flushName}
                nameSave={nameSave}
                onRetryName={autosave.retryName}
                maximumScore={maximumScore}
                onMaximumScoreChange={handleMaximumScoreChange}
                onMaximumScoreBlur={autosave.flushMaximum}
                maximumSave={maximumSave}
                onRetryMaximum={autosave.retryMaximum}
                gradedCount={gradedCount}
                studentCount={students.length}
                onDelete={handleDelete}
                deleteTriggerRef={deleteTriggerRef}
                isDeleting={isDeleting}
                deleteOpen={deleteOpen}
                onDeleteOpenChange={handleDeleteOpenChange}
                deleteError={deleteError}
                hasPendingChanges={hasPendingChanges}
            />

            {isDeleting && (
                <p
                    className="text-sm text-muted-foreground"
                    role="status"
                >
                    {deletePhase === "waiting"
                        ? "Deletion scheduled. Choose Undo in the dialog to keep this assessment."
                        : "Deleting assessment…"}
                </p>
            )}

            {maximumSave?.error && (
                <p className="text-sm text-destructive" role="alert">
                    {maximumSave.error} Score saves will wait until the
                    maximum is saved or reverted.
                </p>
            )}

            <div className="space-y-2">
                <div
                    className="flex items-center justify-between gap-4 text-xs text-muted-foreground"
                    aria-live="polite"
                >
                    <span>
                        {autosave.pendingCount > 0
                            ? `${autosave.pendingCount} change(s) not yet saved`
                            : "All changes saved"}
                    </span>

                    {autosave.errorCount > 0 && (
                        <button
                            type="button"
                            onClick={autosave.retryAll}
                            className="text-destructive underline"
                        >
                            Retry {autosave.errorCount} failed save(s)
                        </button>
                    )}
                </div>

                {autosave.navigationMessage && (
                    <p className="text-sm text-muted-foreground">
                        {autosave.navigationMessage}
                    </p>
                )}

                <Card>
                    <CardContent className="space-y-4 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <IconInput
                                icon={Search}
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search students..."
                                className="max-w-full lg:w-96"
                                aria-label="Search students"
                            />

                            <label className="flex cursor-pointer items-center gap-2">
                                <Checkbox
                                    checked={showOnlyUngraded}
                                    onChange={(event) =>
                                        setShowOnlyUngraded(
                                            event.target.checked
                                        )
                                    }
                                />
                                <span className="text-sm">
                                    Show only ungraded
                                </span>
                            </label>
                        </div>

                        <StudentScoresTable
                            students={filteredStudents}
                            maximumScore={maximumScore}
                            scoreTexts={scoreTexts}
                            onScoreChange={handleScoreChange}
                            onScoreFocus={setFocusedStudentId}
                            onScoreBlur={handleScoreBlur}
                            onFlushScore={autosave.flushScore}
                            onRetryScore={autosave.retryScore}
                        />
                    </CardContent>
                </Card>
            </div>
        </fieldset>
    )
}
