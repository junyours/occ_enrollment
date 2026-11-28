import React, { useRef, useState } from "react";
import axios from "axios";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { badgeVariants } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/Components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import SubjectDialog from "./SubjectDialog";
import PrerequisiteDialog from "./PrerequisiteDialog";
import { hasPrerequisites, linkedPrerequisites, yearStandingLabel } from "./prerequisites";
import { SemesterMark, semesterStyle } from "./semesters";

const number = (value) => Number(value) || 0;

// Older free-text prerequisite, shown only when no linked prerequisites exist.
const legacyPrerequisite = (value) => {
    const label = String(value ?? "").trim();
    return !label || /^(none|null|n\/a|-|—)$/i.test(label) ? "" : label;
};

// The cell itself is the edit control: "+ Add" when empty, the badges when set.
function PrerequisiteCell({ entry, code, canHavePrerequisites, disabled, onOpen }) {
    if (!canHavePrerequisites) {
        return <span className="text-muted-foreground" title="Subjects in the first semester can't have prerequisites.">—</span>;
    }

    const linked = linkedPrerequisites(entry);
    const standing = yearStandingLabel(Number(entry.required_year_level_id) || 0);
    const legacy = legacyPrerequisite(entry.pre_requisite_name);
    const empty = linked.length === 0 && !standing;
    const summary = [...linked.map((p) => p.required_entry.subject.subject_code), standing].filter(Boolean).join(", ");

    const button = (
        <button
            type="button"
            disabled={disabled}
            onClick={onOpen}
            aria-label={empty ? `Add prerequisites for ${code}` : `Edit prerequisites for ${code}: ${summary}`}
            className="group -mx-1.5 flex min-h-7 w-[calc(100%+0.75rem)] flex-wrap items-center gap-1 rounded-md px-1.5 py-0.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
            {empty ? (
                legacy ? <span>{legacy}</span> : (
                    <span className="inline-flex items-center gap-1 text-[13px] text-muted-foreground group-hover:text-primary">
                        <Plus className="h-3.5 w-3.5" aria-hidden="true" /> Add
                    </span>
                )
            ) : (
                <>
                    {linked.map((p) => (
                        <span key={p.id} className={badgeVariants({ variant: "outline", className: `font-medium ${compactBadge}` })}>{p.required_entry.subject.subject_code}</span>
                    ))}
                    {standing && <span className={badgeVariants({ variant: "secondary", className: `font-normal ${compactBadge}` })}>{standing}</span>}
                    <Pencil className="ml-auto h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true" />
                </>
            )}
        </button>
    );

    if (linked.length === 0) return button;

    return (
        <Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent className="max-w-xs">
                <ul className="space-y-0.5">
                    {linked.map((p) => (
                        <li key={p.id}><span className="font-semibold">{p.required_entry.subject.subject_code}</span> — {p.required_entry.subject.descriptive_title}</li>
                    ))}
                </ul>
            </TooltipContent>
        </Tooltip>
    );
}

// Row look for the links of the selected (clicked) or hovered subject.
// Hover only colours the related rows; selecting also marks the subject and dims the rest.
// Colour is never the only cue: related rows also get a text tag.
const FOCUS_ROW = {
    focused: "bg-primary/10 hover:bg-primary/15",
    prerequisite: "bg-amber-100/80 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/20",
    dependent: "bg-sky-100/80 hover:bg-sky-100 dark:bg-sky-500/15 dark:hover:bg-sky-500/20",
    other: "opacity-40 hover:opacity-70",
};
const FOCUS_EDGE = {
    focused: "shadow-[inset_3px_0_0_0_hsl(var(--primary))]",
    prerequisite: "shadow-[inset_3px_0_0_0_rgb(245,158,11)]",
    dependent: "shadow-[inset_3px_0_0_0_rgb(14,165,233)]",
};
const FOCUS_TAG = {
    prerequisite: { label: "Prerequisite", className: "bg-amber-500/20 text-amber-900 dark:text-amber-200" },
    dependent: { label: "Requires it", className: "bg-sky-500/20 text-sky-900 dark:text-sky-200" },
};
const compactBadge = "px-1.5 py-0 text-[11px] leading-5";

export default function CurriculumTable({ termId, data, yearlevel, allTerms = [], dependentsById = {}, canHavePrerequisites = true, onlyMissing = false, focus = null, onFocusEntry = () => {}, onHoverEntry = () => {}, getCurriculumInfo }) {
    const { toast } = useToast();
    const addSubjectRef = useRef(null);
    const openerRef = useRef(null);
    const restoreFocus = (event) => { event.preventDefault(); requestAnimationFrame(() => (openerRef.current?.isConnected ? openerRef.current : addSubjectRef.current)?.focus()); };
    const [subjectDialog, setSubjectDialog] = useState(null);
    const [prerequisiteEntry, setPrerequisiteEntry] = useState(null);
    const [removing, setRemoving] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [removeError, setRemoveError] = useState("");
    const subjects = Array.isArray(data.curriculum_term_subject) ? data.curriculum_term_subject : [];
    const semester = data.semester?.semester_name || "Semester";
    const semesterName = /sem|summer/i.test(semester) ? semester : `${semester} Semester`;
    const semStyle = semesterStyle(data.semester_id);
    const totals = subjects.reduce((sum, entry) => ({
        units: sum.units + number(entry.subject?.credit_units),
        lecture: sum.lecture + number(entry.subject?.lecture_hours),
        laboratory: sum.laboratory + number(entry.subject?.laboratory_hours),
    }), { units: 0, lecture: 0, laboratory: 0 });

    // "Only subjects without prerequisites" filter: rows only; totals stay for the whole semester.
    const visibleSubjects = onlyMissing ? subjects.filter((entry) => !hasPrerequisites(entry)) : subjects;

    // Later subjects that would lose this subject as a prerequisite if it's removed.
    const dependents = removing ? (dependentsById[Number(removing.id)] ?? []) : [];

    const removeSubject = async () => {
        if (!removing || processing) return;
        setProcessing(true);
        setRemoveError("");
        try {
            await axios.post(route("delete.curr.subject", { id: removing.id }));
            setRemoving(null);
            toast({ description: "Subject removed from this curriculum.", variant: "success" });
            await getCurriculumInfo();
        } catch (error) {
            setRemoveError(error.response?.data?.message || "Could not remove the subject. Please try again.");
        } finally {
            setProcessing(false);
        }
    };

    // While filtering, hide semesters with nothing left to fill in (incl. the first semester).
    if (onlyMissing && (!canHavePrerequisites || visibleSubjects.length === 0)) return null;

    return (
        <section className={`min-w-0 border-l-2 ${semStyle.edge}`} aria-labelledby={`semester-${termId}`}>
            {/* Coloured strip per semester; it stays under the app header while you scroll through this semester. */}
            <div className={`sticky top-14 z-20 flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 ${semStyle.strip}`}>
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
                    <h3 id={`semester-${termId}`} className={`flex items-center gap-1.5 text-sm font-semibold ${semStyle.text}`}>
                        <SemesterMark semesterId={data.semester_id} />
                        {semStyle.label}
                        <span className="sr-only">, {yearlevel}</span>
                    </h3>
                    <span className={`text-xs ${semStyle.subtext}`}>
                        {subjects.length} {subjects.length === 1 ? "subject" : "subjects"} · {totals.units} units · {totals.lecture + totals.laboratory} hrs/week
                    </span>
                </div>
                <Button type="button" variant="outline" size="sm" className="h-7 bg-background/80" ref={addSubjectRef} onClick={(event) => { openerRef.current = event.currentTarget; setSubjectDialog({ entry: null }); }}>
                    <Plus aria-hidden="true" /> Add Subject
                </Button>
            </div>
            <p className="mb-1 mt-1.5 px-3 text-xs text-muted-foreground xl:hidden">Scroll horizontally to view all subject details.</p>
            <TooltipProvider delayDuration={250}>
                <Table className="min-w-[880px] text-sm">
                    <caption className="sr-only">{yearlevel}, {semesterName}: subjects, units, contact hours, and prerequisites.</caption>
                    <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent">
                            <TableHead scope="col" className="h-8 w-32 whitespace-nowrap px-3 text-xs">Subject code</TableHead>
                            <TableHead scope="col" className="h-8 min-w-[220px] px-3 text-xs">Descriptive title</TableHead>
                            <TableHead scope="col" className="h-8 w-16 px-2 text-center text-xs">Units</TableHead>
                            <TableHead scope="col" className="h-8 w-16 px-2 text-center text-xs">Lec</TableHead>
                            <TableHead scope="col" className="h-8 w-16 px-2 text-center text-xs">Lab</TableHead>
                            <TableHead scope="col" className="h-8 w-20 whitespace-nowrap px-2 text-center text-xs">Hrs/week</TableHead>
                            <TableHead scope="col" className="h-8 w-48 px-3 text-xs">Prerequisites</TableHead>
                            <TableHead scope="col" className="h-8 w-20 px-3 text-right text-xs">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {subjects.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No subjects yet. Add a subject to build this semester.</TableCell>
                            </TableRow>
                        ) : visibleSubjects.map((entry) => {
                            const subject = entry.subject;
                            const code = subject?.subject_code || "Unavailable";
                            const id = Number(entry.id);
                            const selecting = focus?.mode === "select";
                            const role = !focus ? null
                                : id === focus.id ? (selecting ? "focused" : null)
                                : focus.prerequisiteIds.has(id) ? "prerequisite"
                                : focus.dependentIds.has(id) ? "dependent"
                                : selecting ? "other" : null;
                            const requiredFor = (dependentsById[id] ?? []).map((s) => s.subject?.subject_code).filter(Boolean);
                            return (
                                <TableRow
                                    key={entry.id}
                                    id={`curriculum-entry-${entry.id}`}
                                    // Hover previews this subject's links; click (anywhere except its buttons) selects it.
                                    onMouseEnter={() => onHoverEntry(id)}
                                    onMouseLeave={() => onHoverEntry(null)}
                                    onClick={(event) => { if (!event.target.closest("button, a, input, [role=dialog]")) onFocusEntry(id); }}
                                    className={`cursor-pointer border-border/50 transition-[background-color,opacity] ${role ? FOCUS_ROW[role] : ""}`}
                                >
                                    <TableCell className={`whitespace-nowrap px-3 py-1 ${role ? FOCUS_EDGE[role] ?? "" : ""}`}>
                                        <button
                                            type="button"
                                            onClick={() => onFocusEntry(id)}
                                            aria-pressed={role === "focused"}
                                            aria-label={`${code}: ${role === "focused" ? "stop highlighting" : "highlight its prerequisites and the subjects that require it"}`}
                                            className="-mx-1 rounded px-1 font-medium underline-offset-2 hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            {code}
                                        </button>
                                    </TableCell>
                                    <TableCell className="px-3 py-1 leading-snug">
                                        {FOCUS_TAG[role] && (
                                            <span className={`mr-1.5 inline-block rounded px-1.5 align-[1px] text-[10px] font-semibold uppercase tracking-wide ${FOCUS_TAG[role].className}`}>{FOCUS_TAG[role].label}</span>
                                        )}
                                        {subject?.descriptive_title || "Subject details unavailable"}
                                        {requiredFor.length > 0 && (
                                            <span className="ml-1.5 whitespace-nowrap text-[11px] text-muted-foreground">· required for {requiredFor.join(", ")}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="px-2 py-1 text-center tabular-nums">{number(subject?.credit_units)}</TableCell>
                                    <TableCell className="px-2 py-1 text-center tabular-nums">{number(subject?.lecture_hours) || "—"}</TableCell>
                                    <TableCell className="px-2 py-1 text-center tabular-nums">{number(subject?.laboratory_hours) || "—"}</TableCell>
                                    <TableCell className="px-2 py-1 text-center tabular-nums">{number(subject?.lecture_hours) + number(subject?.laboratory_hours)}</TableCell>
                                    <TableCell className="px-3 py-0.5">
                                        <PrerequisiteCell
                                            entry={entry}
                                            code={code}
                                            canHavePrerequisites={canHavePrerequisites}
                                            disabled={!subject || processing}
                                            onOpen={(event) => { openerRef.current = event.currentTarget; setPrerequisiteEntry(entry); }}
                                        />
                                    </TableCell>
                                    <TableCell className="px-3 py-0.5">
                                        <div className="flex justify-end gap-0.5">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={!subject || processing} aria-label={`Revise ${code} in this curriculum`} onClick={(event) => { openerRef.current = event.currentTarget; setSubjectDialog({ entry }); }}><Pencil className="text-primary" aria-hidden="true" /></Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Revise in this curriculum</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button type="button" variant="ghost" size="icon" disabled={processing} className="h-7 w-7 text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400" aria-label={`Remove ${code} from this curriculum`} onClick={(event) => { openerRef.current = event.currentTarget; setRemoveError(""); setRemoving(entry); }}><Trash2 aria-hidden="true" /></Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Remove from curriculum</TooltipContent>
                                            </Tooltip>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                    {subjects.length > 0 && (
                        <TableFooter className="bg-muted/30">
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={2} className="px-3 py-1.5 text-xs">Semester total</TableCell>
                                <TableCell className="px-2 py-1.5 text-center tabular-nums">{totals.units}</TableCell>
                                <TableCell className="px-2 py-1.5 text-center tabular-nums">{totals.lecture}</TableCell>
                                <TableCell className="px-2 py-1.5 text-center tabular-nums">{totals.laboratory}</TableCell>
                                <TableCell className="px-2 py-1.5 text-center tabular-nums">{totals.lecture + totals.laboratory}</TableCell>
                                <TableCell colSpan={2} />
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </TooltipProvider>
            {subjectDialog && <SubjectDialog open entry={subjectDialog.entry} termId={termId} yearlevel={yearlevel} semesterName={semesterName} onOpenChange={(open) => { if (!open) setSubjectDialog(null); }} onSaved={getCurriculumInfo} onCloseAutoFocus={restoreFocus} />}
            {prerequisiteEntry && <PrerequisiteDialog open entry={prerequisiteEntry} term={data} allTerms={allTerms} yearlevel={yearlevel} semesterName={semesterName} onOpenChange={(open) => { if (!open) setPrerequisiteEntry(null); }} onSaved={getCurriculumInfo} onCloseAutoFocus={restoreFocus} />}
            <AlertDialog open={Boolean(removing)} onOpenChange={(open) => { if (!open && !processing) setRemoving(null); }}>
                <AlertDialogContent onCloseAutoFocus={restoreFocus} className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove from curriculum?</AlertDialogTitle>
                        <AlertDialogDescription>Remove <strong className="font-medium text-foreground">{removing?.subject?.subject_code} — {removing?.subject?.descriptive_title}</strong> from {yearlevel}, {semesterName}? Existing classes and the subject catalog will be kept.</AlertDialogDescription>
                    </AlertDialogHeader>
                    {dependents.length > 0 && (
                        <p role="note" className="rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
                            It is a prerequisite of <strong>{dependents.map((s) => s.subject?.subject_code).filter(Boolean).join(", ")}</strong>. Removing it also removes it from {dependents.length === 1 ? "that subject’s" : "those subjects’"} prerequisites.
                        </p>
                    )}
                    {removeError &&<p role="alert" className="text-sm text-red-600 dark:text-red-400">{removeError}</p>}
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
                        <Button type="button" variant="destructive" disabled={processing} onClick={removeSubject}>{processing && <Loader2 className="animate-spin" aria-hidden="true" />}{processing ? "Removing…" : "Remove from curriculum"}</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
