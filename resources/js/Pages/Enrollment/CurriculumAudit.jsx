import React, { useEffect, useState } from "react";
import axios from "axios";
import { AlertCircle, BookOpen, Check, Clock, Loader2, MinusCircle, Pencil, Plus, RefreshCw, TriangleAlert, Undo2, X } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Badge } from "@/Components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Label } from "@/Components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/Components/ui/radio-group";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Skeleton } from "@/Components/ui/skeleton";
import { Textarea } from "@/Components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { SemesterLabel, semesterStyle } from "../Curriculum/semesters";

/*
 * Student Grades, by curriculum (App\Http\Controllers\Enrollment\StudentAuditController):
 * the student's grades laid over their curriculum, what's still lacking, and grades matched to
 * subjects by hand. A program head's match counts at once; others wait for their approval.
 */

const YEAR_NAMES = { 1: "First Year", 2: "Second Year", 3: "Third Year", 4: "Fourth Year", 5: "Fifth Year" };
const STATUS = {
    passed: { label: "Passed", className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200" },
    in_progress: { label: "In progress", className: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200" },
    failed: { label: "Failed", className: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200" },
    dropped: { label: "Dropped", className: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200" },
    not_taken: { label: "Not taken", className: "bg-muted text-muted-foreground" },
};
const RECORD_STATUS = { passed: "passed", failed: "failed", dropped: "dropped", pending: "no grade yet" };
const SOURCE = {
    set: (by) => (by ? `set by ${by}` : "set by staff"),
    first_term: () => "matched to the student's first term",
    active: () => "the curriculum of their section's classes",
    start_year: () => "best guess from the school year",
};
const LACKING = ["not_taken", "failed", "dropped"];
const FILTERS = [
    { key: "all", label: "All subjects", match: () => true },
    { key: "lacking", label: "Lacking", match: (s) => LACKING.includes(s.status) },
    { key: "check", label: "To check", match: (s) => (s.how === "check" && s.status === "passed") || s.pending.length > 0 },
];

const looseCode = (code) => String(code ?? "").toUpperCase().replace(/[^A-Z0-9]+/g, "").replace(/([A-Z])0+(?=\d)/g, "$1");
const errorText = (error, fallback) => {
    const errors = error.response?.data?.errors;
    return (errors && Object.values(errors).flat()[0]) || error.response?.data?.message || fallback;
};
const gradeText = (record) => (record.grade === "passed" || record.grade === "" ? RECORD_STATUS[record.status] : `${record.grade}${record.status !== "passed" ? `, ${RECORD_STATUS[record.status]}` : ""}`);

function StatusChip({ status }) {
    const style = STATUS[status] ?? STATUS.not_taken;
    return <span className={`inline-block whitespace-nowrap rounded px-1.5 text-[11px] font-semibold leading-5 ${style.className}`}>{style.label}</span>;
}

function Summary({ summary }) {
    const percent = summary.units_total ? Math.round((summary.units_earned / summary.units_total) * 100) : 0;
    const lacking = summary.not_taken + summary.failed;
    const tiles = [
        { label: "Subjects passed", value: `${summary.passed} of ${summary.subjects}` },
        { label: "In progress", value: summary.in_progress },
        { label: "Lacking", value: lacking },
        { label: "To check", value: summary.check + summary.pending },
    ];

    return (
        <div className="space-y-3">
            <div>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{summary.units_earned} of {summary.units_total} units earned</span>
                    <span className="tabular-nums text-muted-foreground">{percent}%</span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Units earned" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${percent}%` }} />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {tiles.map((tile) => (
                    <div key={tile.label} className="rounded-lg bg-muted/50 px-3 py-2">
                        <p className="text-lg font-semibold tabular-nums">{tile.value}</p>
                        <p className="text-xs text-muted-foreground">{tile.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CurriculumPicker({ data, onChanged }) {
    const { toast } = useToast();
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const curriculum = data.curriculum;

    const save = async (value) => {
        setSaving(true);
        try {
            await axios.post(route("enrollment.student-curriculum"), {
                student_id_no: data.student.id_no,
                course_id: data.program.id,
                curriculum_id: value === "auto" ? null : Number(value),
            });
            setEditing(false);
            await onChanged();
            toast({ description: "Curriculum saved for this student.", variant: "success" });
        } catch (error) {
            toast({ description: errorText(error, "Couldn't save the curriculum."), variant: "destructive" });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <BookOpen className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="text-muted-foreground">Curriculum:</span>
            {editing ? (
                <>
                    <Select onValueChange={save} disabled={saving}>
                        <SelectTrigger className="h-8 w-56" aria-label="Curriculum this student follows"><SelectValue placeholder={curriculum?.label ?? "Choose a curriculum"} /></SelectTrigger>
                        <SelectContent>
                            {data.curricula.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.label}</SelectItem>)}
                            {curriculum?.source === "set" && <SelectItem value="auto">Work it out automatically</SelectItem>}
                        </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                </>
            ) : (
                <>
                    <span className="font-medium">{curriculum?.label ?? "none"}</span>
                    {curriculum && <span className="text-xs text-muted-foreground">({SOURCE[curriculum.source]?.(curriculum.set_by)})</span>}
                    {data.permissions?.change_curriculum && data.curricula?.length > 0 && (
                        <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setEditing(true)}><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Change</Button>
                    )}
                </>
            )}
        </div>
    );
}

/** A grade matched by hand that waits for approval, with the buttons the viewer may use. */
function PendingLine({ record, permissions, busy, onApprove, onReject, onUndo, showTarget = false }) {
    const match = record.match;
    return (
        <div className="mt-1 rounded-md bg-amber-500/10 px-2 py-1.5 text-xs leading-snug text-amber-900 dark:text-amber-200">
            <p className="flex items-start gap-1.5">
                <Clock className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                    Waiting for approval{showTarget ? `: counts for ${match.target ?? "nothing (doesn't count)"}` : `: ${record.code} ${record.title} (${gradeText(record)}, ${record.term})`}
                    {match.requested_by && ` · asked by ${match.requested_by}`}
                    {match.note && ` · “${match.note}”`}
                </span>
            </p>
            <div className="mt-1 flex flex-wrap gap-1.5 pl-5">
                {permissions.approve && (
                    <>
                        <Button type="button" size="sm" className="h-7 px-2 text-xs" disabled={busy} onClick={() => onApprove(match)}><Check className="h-3.5 w-3.5" aria-hidden="true" />Approve</Button>
                        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={busy} onClick={() => onReject(match)}><X className="h-3.5 w-3.5" aria-hidden="true" />Reject</Button>
                    </>
                )}
                {!permissions.approve && match.mine && (
                    <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={busy} onClick={() => onUndo(match, "Request cancelled.")}><Undo2 className="h-3.5 w-3.5" aria-hidden="true" />Cancel request</Button>
                )}
            </div>
        </div>
    );
}

function SubjectRow({ subject, data, busy, onMatch, onConfirm, onApprove, onReject, onUndo }) {
    const record = subject.record;
    const { permissions } = data;
    const otherCode = record && looseCode(record.code) !== looseCode(subject.code);

    return (
        <tr className="border-b border-border/50 align-top last:border-b-0">
            <td className="w-28 whitespace-nowrap px-3 py-2 font-medium">{subject.code}</td>
            <td className="min-w-[220px] px-3 py-2 leading-snug">
                {subject.title}
                {record && subject.how === "check" && subject.status === "passed" && (
                    <div className="mt-1 rounded-md bg-amber-500/10 px-2 py-1.5 text-xs leading-snug text-amber-900 dark:text-amber-200">
                        <p className="flex items-start gap-1.5">
                            <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                            <span>Check: counted from {record.code} {record.title}, matched only by code or a similar title.</span>
                        </p>
                        {permissions.match && (
                            <div className="mt-1 flex flex-wrap gap-1.5 pl-5">
                                <Button type="button" size="sm" className="h-7 px-2 text-xs" disabled={busy} onClick={() => onConfirm(record, subject)}>
                                    <Check className="h-3.5 w-3.5" aria-hidden="true" />{permissions.approve ? "It's right" : "It's right (ask approval)"}
                                </Button>
                                <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={busy} onClick={() => onMatch(record, subject.subject_id)}>Not this subject</Button>
                            </div>
                        )}
                    </div>
                )}
                {subject.pending.map((pending) => (
                    <PendingLine key={pending.ref} record={pending} permissions={permissions} busy={busy} onApprove={onApprove} onReject={onReject} onUndo={onUndo} />
                ))}
            </td>
            <td className="w-14 px-2 py-2 text-center tabular-nums">{subject.units}</td>
            <td className="w-28 px-3 py-2"><StatusChip status={subject.status} /></td>
            <td className="w-60 px-3 py-2 text-[13px] leading-snug">
                {record ? (
                    <>
                        <span className="font-medium tabular-nums">{gradeText(record)}</span>
                        <span className="text-muted-foreground"> · {record.term}</span>
                        {otherCode && <span className="block text-xs text-muted-foreground" title={`${record.code} ${record.title}`}>as {record.code}</span>}
                        {subject.how === "manual" && (
                            <span className="block text-xs text-muted-foreground">
                                Matched by hand{record.match?.decided_by ? `, approved by ${record.match.decided_by}` : ""}
                            </span>
                        )}
                        {subject.attempts > 1 && <span className="block text-xs text-muted-foreground">{subject.attempts} grades on record</span>}
                    </>
                ) : <span className="text-muted-foreground">—</span>}
            </td>
            <td className="w-20 px-2 py-2 text-right">
                {record && permissions.match && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={busy} aria-label={`Change how ${record.code} counts`} title="Count this grade for another subject, or not at all" onClick={() => onMatch(record, subject.subject_id)}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                )}
                {subject.how === "manual" && record?.match && permissions.approve && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={busy} aria-label={`Undo the match of ${record.code}`} title="Undo this match" onClick={() => onUndo(record.match, "Match undone.")}>
                        <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                )}
            </td>
        </tr>
    );
}

function MatchDialog({ request, data, busy, onClose, onSave }) {
    const record = request?.record;
    const subjects = data.terms.flatMap((t) => t.subjects);
    const suggested = (record?.suggestions ?? []).map((entryId) => subjects.find((s) => s.entry_id === entryId)).filter(Boolean);
    const open = subjects.filter((s) => s.status !== "passed" && s.subject_id !== request?.currentSubjectId && !suggested.includes(s));
    const [target, setTarget] = useState("");
    const [scope, setScope] = useState("student");
    const [note, setNote] = useState("");

    useEffect(() => {
        setTarget(suggested[0] ? String(suggested[0].subject_id) : "");
        setScope("student");
        setNote("");
    }, [record?.ref]);

    if (!record) return null;
    const everyoneAllowed = data.permissions.approve && record.source_type === "class" && target !== "" && target !== "none";

    return (
        <Dialog open onOpenChange={(value) => { if (!value && !busy) onClose(); }}>
            <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Count this grade for…</DialogTitle>
                    <DialogDescription>{record.code} {record.title} · {gradeText(record)} · {record.term}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label htmlFor="match-target">Curriculum subject</Label>
                        <Select value={target} onValueChange={setTarget}>
                            <SelectTrigger id="match-target"><SelectValue placeholder="Choose a subject" /></SelectTrigger>
                            <SelectContent>
                                {suggested.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>Suggested</SelectLabel>
                                        {suggested.map((s) => <SelectItem key={s.entry_id} value={String(s.subject_id)}>{s.code} {s.title}</SelectItem>)}
                                    </SelectGroup>
                                )}
                                {open.length > 0 && (
                                    <SelectGroup>
                                        <SelectLabel>Not passed yet</SelectLabel>
                                        {open.map((s) => <SelectItem key={s.entry_id} value={String(s.subject_id)}>{s.code} {s.title}</SelectItem>)}
                                    </SelectGroup>
                                )}
                                <SelectGroup>
                                    <SelectLabel>Other</SelectLabel>
                                    <SelectItem value="none">Doesn't count toward the curriculum</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                    {everyoneAllowed && (
                        <RadioGroup value={scope} onValueChange={setScope} aria-label="Who this applies to" className="space-y-2">
                            <div className="flex items-start gap-2">
                                <RadioGroupItem value="student" id="match-student" className="mt-0.5" />
                                <Label htmlFor="match-student" className="font-normal leading-snug">This student only <span className="block text-xs text-muted-foreground">A credit or a substitute for this student.</span></Label>
                            </div>
                            <div className="flex items-start gap-2">
                                <RadioGroupItem value="everyone" id="match-everyone" className="mt-0.5" />
                                <Label htmlFor="match-everyone" className="font-normal leading-snug">Everyone: they're the same subject <span className="block text-xs text-muted-foreground">Puts both codes in one group on the Same subjects page.</span></Label>
                            </div>
                        </RadioGroup>
                    )}
                    <div className="space-y-1.5">
                        <Label htmlFor="match-note">Note <span className="font-normal text-muted-foreground">(optional)</span></Label>
                        <Textarea id="match-note" rows={2} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} placeholder="For example: credited per the evaluation form" />
                    </div>
                    {!data.permissions.approve && (
                        <p className="text-[13px] text-muted-foreground">A program head of {data.program.abbreviation} has to approve this before it counts.</p>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
                    <Button type="button" disabled={!target || busy} onClick={() => onSave({ record, target, scope: everyoneAllowed ? scope : "student", note })}>
                        {busy && <Loader2 className="animate-spin" aria-hidden="true" />}{data.permissions.approve ? "Save" : "Ask for approval"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function RejectDialog({ match, busy, onClose, onReject }) {
    const [reason, setReason] = useState("");
    useEffect(() => setReason(""), [match?.id]);
    if (!match) return null;

    return (
        <Dialog open onOpenChange={(value) => { if (!value && !busy) onClose(); }}>
            <DialogContent className="w-[calc(100%-2rem)] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Reject this match?</DialogTitle>
                    <DialogDescription>Say why, so the person who asked can fix it. The grade goes back to Other grades.</DialogDescription>
                </DialogHeader>
                <div className="space-y-1.5">
                    <Label htmlFor="reject-reason">Reason</Label>
                    <Textarea id="reject-reason" rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="For example: College Algebra doesn't cover Mathematics in the Modern World" />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancel</Button>
                    <Button type="button" variant="destructive" disabled={!reason.trim() || busy} onClick={() => onReject(match, reason.trim())}>
                        {busy && <Loader2 className="animate-spin" aria-hidden="true" />}Reject
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AuditSkeleton() {
    return (
        <div className="space-y-4" role="status" aria-busy="true" aria-label="Loading the curriculum view">
            <div className="space-y-3 rounded-xl border p-4">
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-2 w-full" />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-14" />)}</div>
            </div>
            {[0, 1].map((i) => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
    );
}

export default function CurriculumAudit({ idNo, onChanged }) {
    const { toast } = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [filter, setFilter] = useState("all");
    const [busy, setBusy] = useState(false);
    const [matchRequest, setMatchRequest] = useState(null); // { record, currentSubjectId }
    const [rejecting, setRejecting] = useState(null);       // match
    const [showHidden, setShowHidden] = useState(false);

    const fetchAudit = () => axios.post(route("student-grades.curriculum"), { id_no: idNo }).then((response) => setData(response.data));
    const load = () => {
        setLoading(true);
        setError("");
        fetchAudit()
            .catch((e) => setError(errorText(e, "We couldn't load this student's curriculum.")))
            .finally(() => setLoading(false));
    };
    useEffect(() => { setData(null); load(); }, [idNo]);

    // Runs a change, refreshes the view, and tells the user how it went.
    const act = async (send, success) => {
        setBusy(true);
        try {
            const response = await send();
            if (response?.data?.summary) setData(response.data); else await fetchAudit();
            toast({ description: success, variant: "success" });
            onChanged?.();
            return true;
        } catch (e) {
            toast({ description: errorText(e, "That didn't work. Please try again."), variant: "destructive" });
            return false;
        } finally {
            setBusy(false);
        }
    };

    const sendMatch = ({ record, target, scope, note }) => act(
        () => axios.post(route("student-grades.match"), {
            id_no: data.student.id_no,
            course_id: data.program.id,
            source_type: record.source_type,
            source_id: record.source_id,
            subject_id: target === "none" ? null : Number(target),
            scope,
            note: note.trim() || null,
        }),
        scope === "everyone"
            ? "Saved as the same subject for everyone."
            : data.permissions.approve ? "Saved." : "Sent to the program head for approval.",
    ).then((ok) => { if (ok) setMatchRequest(null); });
    const confirm = (record, subject) => sendMatch({ record, target: String(subject.subject_id), scope: "student", note: "" });
    const approve = (match) => act(() => axios.post(route("student-grades.match.approve", match.id)), "Approved.");
    const reject = (match, reason) => act(() => axios.post(route("student-grades.match.reject", match.id), { reason }), "Rejected.").then((ok) => { if (ok) setRejecting(null); });
    const undo = (match, message) => act(() => axios.post(route("student-grades.match.undo", match.id)), message);

    if (loading && !data) return <AuditSkeleton />;
    if (error && !data) {
        return (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                <p className="flex items-start gap-2 text-sm"><AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />{error}</p>
                <Button type="button" variant="outline" size="sm" onClick={load}><RefreshCw aria-hidden="true" />Try again</Button>
            </div>
        );
    }
    if (!data) return null;
    if (!data.summary) {
        return (
            <div className="space-y-3 rounded-xl border bg-card p-5">
                {data.program && <CurriculumPicker data={data} onChanged={fetchAudit} />}
                <p className="text-sm text-muted-foreground">{data.message}</p>
            </div>
        );
    }

    const handlers = { busy, onMatch: (record, currentSubjectId) => setMatchRequest({ record, currentSubjectId }), onConfirm: confirm, onApprove: approve, onReject: setRejecting, onUndo: undo };
    const match = FILTERS.find((f) => f.key === filter)?.match ?? (() => true);
    const terms = data.terms.map((term) => ({ ...term, subjects: term.subjects.filter(match) })).filter((term) => term.subjects.length > 0);
    const countFor = (f) => data.terms.reduce((n, term) => n + term.subjects.filter(f.match).length, 0);

    return (
        <div className="space-y-4">
            <div className="space-y-3 rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">{data.student.name} · {data.program.name}</p>
                        <CurriculumPicker data={data} onChanged={fetchAudit} />
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="text-[13px]" disabled={busy} onClick={() => fetchAudit().catch(() => {})}><RefreshCw aria-hidden="true" />Refresh</Button>
                </div>
                <Summary summary={data.summary} />
                <p className="text-xs text-muted-foreground">
                    Grades are matched to this curriculum automatically, also when a subject's code changed. Anything uncertain is marked “Check”.
                </p>
            </div>

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show">
                {FILTERS.map((f) => (
                    <Button key={f.key} type="button" size="sm" variant={filter === f.key ? "secondary" : "ghost"} aria-pressed={filter === f.key} className="h-8 text-[13px]" onClick={() => setFilter(f.key)}>
                        {f.label}<Badge variant="outline" className="ml-1 px-1.5 py-0 text-[11px] tabular-nums">{countFor(f)}</Badge>
                    </Button>
                ))}
            </div>

            {terms.length === 0 ? (
                <p className="rounded-lg bg-muted/30 px-5 py-8 text-center text-sm text-muted-foreground">
                    {filter === "lacking" ? "Nothing is lacking: every subject is passed or in progress." : "Nothing to check."}
                </p>
            ) : terms.map((term) => {
                const style = semesterStyle(term.semester_id);
                return (
                    <section key={`${term.year_level_id}-${term.semester_id}`} className={`min-w-0 overflow-hidden rounded-lg border border-l-2 ${style.edge}`} aria-label={`${YEAR_NAMES[term.year_level_id] ?? `Year ${term.year_level_id}`}, ${style.label}`}>
                        <div className={`flex items-center gap-2 px-3 py-1.5 text-sm ${style.strip}`}>
                            <span className="font-medium text-muted-foreground">{YEAR_NAMES[term.year_level_id] ?? `Year ${term.year_level_id}`}</span>
                            <SemesterLabel semesterId={term.semester_id} />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[760px] text-sm">
                                <thead className="bg-muted/40 text-xs text-muted-foreground">
                                    <tr>
                                        <th scope="col" className="h-8 px-3 text-left font-medium">Code</th>
                                        <th scope="col" className="h-8 px-3 text-left font-medium">Descriptive title</th>
                                        <th scope="col" className="h-8 px-2 text-center font-medium">Units</th>
                                        <th scope="col" className="h-8 px-3 text-left font-medium">Status</th>
                                        <th scope="col" className="h-8 px-3 text-left font-medium">Grade</th>
                                        <th scope="col" className="h-8 px-2"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody>{term.subjects.map((subject) => <SubjectRow key={subject.entry_id} subject={subject} data={data} {...handlers} />)}</tbody>
                            </table>
                        </div>
                    </section>
                );
            })}

            {filter === "all" && (
                <section className="space-y-2 rounded-xl border bg-card p-4" aria-labelledby="other-grades">
                    <div>
                        <h3 id="other-grades" className="font-medium">Other grades <span className="text-sm font-normal text-muted-foreground">({data.others.length})</span></h3>
                        <p className="text-xs text-muted-foreground">Grades that don't fit any subject in this curriculum: electives, substitutions, other schools' subjects, or codes that should be matched by hand.</p>
                    </div>
                    {data.others.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Every grade fits a subject in this curriculum.</p>
                    ) : (
                        <ul className="divide-y divide-border/60">
                            {data.others.map((record) => (
                                <li key={record.ref} className="flex flex-wrap items-start justify-between gap-2 py-2">
                                    <div className="min-w-0 flex-1 text-sm leading-snug">
                                        <p><span className="font-medium">{record.code || "No code"}</span> {record.title}</p>
                                        <p className="text-xs text-muted-foreground">{gradeText(record)} · {record.term}</p>
                                        {record.match?.status === "pending" && (
                                            <PendingLine record={record} permissions={data.permissions} busy={busy} onApprove={approve} onReject={setRejecting} onUndo={undo} showTarget />
                                        )}
                                        {record.match?.status === "approved" && (
                                            <p className="mt-1 text-xs text-muted-foreground">Counts for {record.match.target}, which isn't in this curriculum.</p>
                                        )}
                                    </div>
                                    {data.permissions.match && record.match?.status !== "pending" && (
                                        <Button type="button" variant="outline" size="sm" className="h-8 text-[13px]" disabled={busy} onClick={() => setMatchRequest({ record, currentSubjectId: null })}>
                                            <Plus aria-hidden="true" />Count for…
                                        </Button>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                    {data.hidden.length > 0 && (
                        <div className="pt-1">
                            <Button type="button" variant="ghost" size="sm" className="h-8 px-2 text-xs" aria-expanded={showHidden} onClick={() => setShowHidden((v) => !v)}>
                                <MinusCircle className="h-3.5 w-3.5" aria-hidden="true" />{showHidden ? "Hide" : "Show"} grades marked “doesn't count” ({data.hidden.length})
                            </Button>
                            {showHidden && (
                                <ul className="mt-1 divide-y divide-border/60">
                                    {data.hidden.map((record) => (
                                        <li key={record.ref} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm text-muted-foreground">
                                            <span>{record.code} {record.title} · {gradeText(record)} · {record.term}{record.match?.decided_by ? ` · by ${record.match.decided_by}` : ""}</span>
                                            {data.permissions.approve && (
                                                <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled={busy} onClick={() => undo(record.match, "It counts again.")}><Undo2 className="h-3.5 w-3.5" aria-hidden="true" />Undo</Button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}
                </section>
            )}

            <MatchDialog request={matchRequest} data={data} busy={busy} onClose={() => setMatchRequest(null)} onSave={sendMatch} />
            <RejectDialog match={rejecting} busy={busy} onClose={() => setRejecting(null)} onReject={reject} />
        </div>
    );
}
