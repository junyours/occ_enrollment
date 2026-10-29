import React, { useRef, useState } from "react";
import axios from "axios";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/Components/ui/tooltip";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/Components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import SubjectDialog from "./SubjectDialog";

const number = (value) => Number(value) || 0;

const prerequisiteLabel = (value) => {
    const label = String(value ?? "").trim();
    return !label || /^(none|null|n\/a|-|—)$/i.test(label) ? "—" : label;
};

export default function CurriculumTable({ termId, data, yearlevel, getCurriculumInfo }) {
    const { toast } = useToast();
    const addSubjectRef = useRef(null);
    const openerRef = useRef(null);
    const restoreFocus = (event) => { event.preventDefault(); requestAnimationFrame(() => (openerRef.current?.isConnected ? openerRef.current : addSubjectRef.current)?.focus()); };
    const [subjectDialog, setSubjectDialog] = useState(null);
    const [removing, setRemoving] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [removeError, setRemoveError] = useState("");
    const subjects = Array.isArray(data.curriculum_term_subject) ? data.curriculum_term_subject : [];
    const semester = data.semester?.semester_name || "Semester";
    const semesterName = /sem|summer/i.test(semester) ? semester : `${semester} Semester`;
    const totals = subjects.reduce((sum, entry) => ({
        units: sum.units + number(entry.subject?.credit_units),
        lecture: sum.lecture + number(entry.subject?.lecture_hours),
        laboratory: sum.laboratory + number(entry.subject?.laboratory_hours),
    }), { units: 0, lecture: 0, laboratory: 0 });

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

    return (
        <section className="min-w-0" aria-labelledby={`semester-${termId}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                    <h3 id={`semester-${termId}`} className="text-base font-semibold">{semesterName}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="font-normal">{subjects.length} {subjects.length === 1 ? "subject" : "subjects"}</Badge>
                        <Badge variant="secondary" className="font-normal">{totals.units} units</Badge>
                        <Badge variant="secondary" className="font-normal">{totals.lecture + totals.laboratory} hrs/week</Badge>
                    </div>
                </div>
                <Button type="button" variant="outline" ref={addSubjectRef} onClick={(event) => { openerRef.current = event.currentTarget; setSubjectDialog({ entry: null }); }}>
                    <Plus aria-hidden="true" /> Add Subject
                </Button>
            </div>
            <p className="mb-2 text-xs text-muted-foreground xl:hidden">Scroll horizontally to view all subject details.</p>
            <TooltipProvider delayDuration={250}>
                <Table className="min-w-[850px] text-sm">
                    <caption className="sr-only">{yearlevel}, {semesterName}: subjects, units, contact hours, and prerequisites.</caption>
                    <TableHeader className="bg-muted/40">
                        <TableRow className="hover:bg-transparent">
                            <TableHead scope="col" className="w-32 whitespace-nowrap px-3 text-[13px]">Subject code</TableHead>
                            <TableHead scope="col" className="min-w-[220px] px-3 text-[13px]">Descriptive title</TableHead>
                            <TableHead scope="col" className="w-20 px-3 text-center text-[13px]">Units</TableHead>
                            <TableHead scope="col" className="w-20 px-3 text-center text-[13px]">Lec hrs</TableHead>
                            <TableHead scope="col" className="w-20 px-3 text-center text-[13px]">Lab hrs</TableHead>
                            <TableHead scope="col" className="w-24 whitespace-nowrap px-3 text-center text-[13px]">Hrs/week</TableHead>
                            <TableHead scope="col" className="w-36 px-3 text-[13px]">Prerequisites</TableHead>
                            <TableHead scope="col" className="w-24 px-3 text-right text-[13px]">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {subjects.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={8} className="px-3 py-10 text-center text-muted-foreground">No subjects yet. Add a subject to build this semester.</TableCell>
                            </TableRow>
                        ) : subjects.map((entry) => {
                            const subject = entry.subject;
                            const code = subject?.subject_code || "Unavailable";
                            const prerequisites = prerequisiteLabel(entry.pre_requisite_name);
                            return (
                                <TableRow key={entry.id} className="border-border/50">
                                    <TableCell className="whitespace-nowrap px-3 py-3 font-medium">{code}</TableCell>
                                    <TableCell className="px-3 py-3 leading-relaxed">{subject?.descriptive_title || "Subject details unavailable"}</TableCell>
                                    <TableCell className="px-3 py-3 text-center tabular-nums">{number(subject?.credit_units)}</TableCell>
                                    <TableCell className="px-3 py-3 text-center tabular-nums">{number(subject?.lecture_hours) || "—"}</TableCell>
                                    <TableCell className="px-3 py-3 text-center tabular-nums">{number(subject?.laboratory_hours) || "—"}</TableCell>
                                    <TableCell className="px-3 py-3 text-center tabular-nums">{number(subject?.lecture_hours) + number(subject?.laboratory_hours)}</TableCell>
                                    <TableCell className={`px-3 py-3 ${prerequisites === "—" ? "text-muted-foreground" : ""}`}>{prerequisites}</TableCell>
                                    <TableCell className="px-3 py-2">
                                        <div className="flex justify-end gap-1">
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button type="button" variant="ghost" size="icon" disabled={!subject || processing} aria-label={`Revise ${code} in this curriculum`} onClick={(event) => { openerRef.current = event.currentTarget; setSubjectDialog({ entry }); }}><Pencil className="text-primary" aria-hidden="true" /></Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Revise in this curriculum</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button type="button" variant="ghost" size="icon" disabled={processing} className="text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400" aria-label={`Remove ${code} from this curriculum`} onClick={(event) => { openerRef.current = event.currentTarget; setRemoveError(""); setRemoving(entry); }}><Trash2 aria-hidden="true" /></Button>
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
                                <TableCell colSpan={2} className="px-3 py-3">Semester total</TableCell>
                                <TableCell className="px-3 py-3 text-center tabular-nums">{totals.units}</TableCell>
                                <TableCell className="px-3 py-3 text-center tabular-nums">{totals.lecture}</TableCell>
                                <TableCell className="px-3 py-3 text-center tabular-nums">{totals.laboratory}</TableCell>
                                <TableCell className="px-3 py-3 text-center tabular-nums">{totals.lecture + totals.laboratory}</TableCell>
                                <TableCell colSpan={2} />
                            </TableRow>
                        </TableFooter>
                    )}
                </Table>
            </TooltipProvider>
            {subjectDialog && <SubjectDialog open entry={subjectDialog.entry} termId={termId} yearlevel={yearlevel} semesterName={semesterName} onOpenChange={(open) => { if (!open) setSubjectDialog(null); }} onSaved={getCurriculumInfo} onCloseAutoFocus={restoreFocus} />}
            <AlertDialog open={Boolean(removing)} onOpenChange={(open) => { if (!open && !processing) setRemoving(null); }}>
                <AlertDialogContent onCloseAutoFocus={restoreFocus} className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove from curriculum?</AlertDialogTitle>
                        <AlertDialogDescription>Remove <strong className="font-medium text-foreground">{removing?.subject?.subject_code} — {removing?.subject?.descriptive_title}</strong> from {yearlevel}, {semesterName}? Existing classes and the subject catalog will be kept.</AlertDialogDescription>
                    </AlertDialogHeader>
                    {removeError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{removeError}</p>}
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel disabled={processing}>Cancel</AlertDialogCancel>
                        <Button type="button" variant="destructive" disabled={processing} onClick={removeSubject}>{processing && <Loader2 className="animate-spin" aria-hidden="true" />}{processing ? "Removing…" : "Remove from curriculum"}</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
