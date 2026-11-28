import React, { useEffect, useState } from "react";
import axios from "axios";
import { Ban, BookOpen, CheckCircle2, Info, Loader2, Pencil, TriangleAlert } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/Components/ui/alert-dialog";
import { Button } from "@/Components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/Lib/Utils";

/*
 * Checks while enrolling a student (App\Services\EnrollmentCheck): prerequisites from the
 * student's own curriculum, subjects already passed, and the same subject twice in a term.
 * Used by the Enroll Student and Student Subjects pages.
 */

const SEVERITY = {
    block: { icon: Ban, className: "text-red-700 dark:text-red-400", label: "Not allowed" },
    warn: { icon: TriangleAlert, className: "text-amber-700 dark:text-amber-400", label: "Warning" },
    note: { icon: Info, className: "text-muted-foreground", label: "Note" },
};
const ORDER = { block: 0, warn: 1, note: 2 };

const SOURCE = {
    set: (by) => (by ? `set by ${by}` : "set by staff"),
    first_term: () => "matched to the student's first term",
    active: () => "the curriculum of this section's classes",
    start_year: () => "best guess from the school year",
};

/**
 * Checks a student's list of classes for the term, a moment after it stops changing.
 * Pass every class the student will have (classIds) and, when only some are being added,
 * those (newClassIds). `ready` is true once the result matches the current list.
 */
export function useEnrollmentCheck({ studentIdNo, yearSectionId = null, schoolYearId = null, classIds, newClassIds = null, enabled = true }) {
    const [state, setState] = useState({ key: null, result: null, error: "" });
    const [loading, setLoading] = useState(false);
    const [version, setVersion] = useState(0);
    const key = enabled && studentIdNo ? JSON.stringify([studentIdNo, yearSectionId, schoolYearId, classIds, newClassIds, version]) : null;

    useEffect(() => {
        if (key === null) {
            setState({ key: null, result: null, error: "" });
            setLoading(false);
            return undefined;
        }

        const controller = new AbortController();
        setLoading(true);
        const timer = setTimeout(() => {
            axios.post(route("enrollment.check"), {
                student_id_no: studentIdNo,
                year_section_id: yearSectionId,
                school_year_id: schoolYearId,
                class_ids: classIds,
                new_class_ids: newClassIds,
            }, { signal: controller.signal })
                .then((response) => setState({ key, result: response.data, error: "" }))
                .catch((error) => {
                    if (!controller.signal.aborted) setState({ key, result: null, error: error.response?.data?.message || "Couldn't check these subjects." });
                })
                .finally(() => {
                    if (!controller.signal.aborted) setLoading(false);
                });
        }, 350);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
    }, [key]);

    const items = state.result?.classes ?? [];
    const issuesByClass = new Map(items.map((item) => [item.class_id, item.issues]));
    const withSeverity = (severity) => items.filter((item) => item.issues.some((issue) => issue.severity === severity));

    return {
        active: key !== null,
        result: state.result,
        error: state.key === key ? state.error : "",
        loading,
        ready: key !== null && state.key === key && !loading,
        issuesOf: (classId) => issuesByClass.get(classId) ?? [],
        blocked: withSeverity("block"),
        warned: withSeverity("warn"),
        refresh: () => setVersion((v) => v + 1),
    };
}

/** The first "can't be added" message, for a toast. */
export const firstBlock = (check) => check.blocked[0]?.issues.find((issue) => issue.severity === "block")?.message ?? "";

/** The issues for one class, most serious first. */
export function ClassIssues({ issues, className = "" }) {
    if (!issues || issues.length === 0) return null;
    const sorted = [...issues].sort((a, b) => (ORDER[a.severity] ?? 3) - (ORDER[b.severity] ?? 3));

    return (
        <ul className={cn("space-y-0.5", className)}>
            {sorted.map((issue, index) => {
                const style = SEVERITY[issue.severity] ?? SEVERITY.note;
                const Icon = style.icon;
                return (
                    <li key={index} className={cn("flex items-start gap-1.5 text-xs leading-snug", style.className)}>
                        <Icon className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        <span><span className="sr-only">{style.label}: </span>{issue.message}</span>
                    </li>
                );
            })}
        </ul>
    );
}

/** "2 subjects have warnings", or that everything passed. */
export function ChecksSummary({ check, className = "" }) {
    if (!check.active) return null;

    if (check.error) {
        return (
            <p className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />{check.error}
            </p>
        );
    }
    if (!check.result) {
        return (
            <p className={cn("flex items-center gap-1.5 text-sm text-muted-foreground", className)}>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Checking prerequisites…
            </p>
        );
    }

    const blocked = check.blocked.length;
    const warned = check.warned.length;
    return (
        <p role="status" className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-sm", className)}>
            {blocked === 0 && warned === 0 ? (
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />No prerequisite problems or repeated subjects found.
                </span>
            ) : (
                <>
                    {blocked > 0 && (
                        <span className="flex items-center gap-1.5 font-medium text-red-700 dark:text-red-400">
                            <Ban className="h-4 w-4 shrink-0" aria-hidden="true" />{blocked} {blocked === 1 ? "subject can't" : "subjects can't"} be added
                        </span>
                    )}
                    {warned > 0 && (
                        <span className="flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-400">
                            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />{warned} {warned === 1 ? "subject has" : "subjects have"} warnings
                        </span>
                    )}
                    <span className="text-muted-foreground">Details are under each subject.</span>
                </>
            )}
            {check.loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Checking again" />}
        </p>
    );
}

/** The curriculum the student follows, with how it was decided, and a way to change it. */
export function StudentCurriculumLine({ check, studentIdNo, className = "" }) {
    const { toast } = useToast();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const result = check.result;
    if (!result) return null;

    const curriculum = result.curriculum;
    const source = curriculum ? SOURCE[curriculum.source]?.(curriculum.set_by) : null;

    const save = async (value) => {
        setSaving(true);
        try {
            await axios.post(route("enrollment.student-curriculum"), {
                student_id_no: studentIdNo,
                course_id: result.program.id,
                curriculum_id: value === "auto" ? null : Number(value),
            });
            toast({ description: value === "auto" ? "The curriculum will be worked out automatically again." : "Curriculum saved for this student.", variant: "success" });
            setEditing(false);
            check.refresh();
        } catch (error) {
            toast({ description: error.response?.data?.message || "Couldn't save the curriculum.", variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-sm", className)}>
            <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Curriculum:</span>
            {editing ? (
                <>
                    <Select onValueChange={save} disabled={saving}>
                        <SelectTrigger className="h-8 w-56" aria-label="Curriculum this student follows">
                            <SelectValue placeholder={curriculum?.label ?? "Choose a curriculum"} />
                        </SelectTrigger>
                        <SelectContent>
                            {result.curricula.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>)}
                            {curriculum?.source === "set" && <SelectItem value="auto">Work it out automatically</SelectItem>}
                        </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                </>
            ) : (
                <>
                    <span className="font-medium">{curriculum?.label ?? "none found for this program"}</span>
                    {source && <span className="text-xs text-muted-foreground">({source})</span>}
                    {result.can_change_curriculum && result.curricula.length > 0 && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}>
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />Change
                        </Button>
                    )}
                </>
            )}
        </div>
    );
}

/** Lists the warnings before saving, so the user can go ahead or go back. */
export function ConfirmIssuesDialog({ open, onOpenChange, items, title, description, confirmLabel, onConfirm }) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="max-h-[85dvh] overflow-y-auto">
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <ul className="space-y-2">
                    {items.map((item) => (
                        <li key={item.class_id} className="rounded-md border p-3">
                            <p className="text-sm font-medium">{item.code} {item.title}</p>
                            <ClassIssues issues={item.issues.filter((issue) => issue.severity === "warn")} className="mt-1" />
                        </li>
                    ))}
                </ul>
                <AlertDialogFooter>
                    <AlertDialogCancel>Go back</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
