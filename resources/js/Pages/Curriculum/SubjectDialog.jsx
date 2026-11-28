import React, { useEffect, useId, useState } from "react";
import axios from "axios";
import { useForm } from "@inertiajs/react";
import { AlertTriangle, Check, Copy, Info, Loader2, Search } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { Checkbox } from "@/Components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { SubjectResultsSkeleton } from "./CurriculumSkeletons";

// A code as people mean it: case, spaces and trailing hyphens ignored ("it104-" is IT104). Mirrors the server.
const codeKey = (code) => String(code ?? "").replace(/\s+/g, "").toUpperCase().replace(/-+$/, "");
const sameCodeText = (a, b) => String(a ?? "").trim().toUpperCase() === String(b ?? "").trim().toUpperCase();
const normTitle = (title) => String(title ?? "").trim().replace(/\s+/g, " ").toLowerCase();

function usageText(subject) {
    const used = subject.used_in ?? [];
    const curricula = used.length === 0 ? "Not in any curriculum" : `Used in ${used.slice(0, 3).join(", ")}${used.length > 3 ? ` +${used.length - 3} more` : ""}`;
    const classes = subject.classes ? ` · ${subject.classes} ${subject.classes === 1 ? "class" : "classes"}` : "";
    return curricula + classes;
}

// One version of a subject code: details plus where it's used.
function VersionRow({ subject, onUse, disabled }) {
    return (
        <li className="flex items-start justify-between gap-3 px-3 py-2.5">
            <span className="min-w-0 text-sm">
                <span className="font-semibold">{subject.subject_code}</span>
                <span className="text-muted-foreground"> · {subject.descriptive_title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                    {subject.credit_units} units · {subject.lecture_hours || 0} lec / {subject.laboratory_hours || 0} lab hrs · {usageText(subject)}
                </span>
            </span>
            {onUse && <Button type="button" size="sm" variant="outline" className="h-7 shrink-0 text-xs" disabled={disabled} onClick={() => onUse(subject)}>Use this</Button>}
        </li>
    );
}

export default function SubjectDialog({ open, onOpenChange, termId, yearlevel, semesterName, entry, onSaved, onCloseAutoFocus }) {
    const editing = Boolean(entry);
    const prefix = useId();
    const { toast } = useToast();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(true);
    const [searchError, setSearchError] = useState("");
    const [retrySearch, setRetrySearch] = useState(0);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [approvedDetailsConfirmed, setApprovedDetailsConfirmed] = useState(false);
    const [versions, setVersions] = useState([]);
    const [checkingCode, setCheckingCode] = useState(false);
    const [createVersionConfirmed, setCreateVersionConfirmed] = useState(false);
    const { data, setData, post, transform, errors, clearErrors, processing } = useForm({
        id: entry?.id || "", curriculum_term_id: termId, mode: "existing",
        subject_id: entry?.subject_id || "", subject_code: entry?.subject?.subject_code || "",
        descriptive_title: entry?.subject?.descriptive_title || "",
        credit_units: entry?.subject?.credit_units ?? 3,
        lecture_hours: entry?.subject?.lecture_hours ?? 3,
        laboratory_hours: entry?.subject?.laboratory_hours ?? 0,
        create_version: false,
    });

    const requiresApprovalConfirmation = !editing && data.mode === "new";

    useEffect(() => {
        if (!open || editing || data.mode !== "existing") return;
        const controller = new AbortController();
        setSearching(true);
        setSearchError("");
        const timeout = setTimeout(async () => {
            try {
                const response = await axios.get(route("curr.subjects.search"), { params: { q: query.trim() }, signal: controller.signal });
                if (!controller.signal.aborted) setResults(response.data.subjects || []);
            } catch {
                if (!controller.signal.aborted) { setResults([]); setSearchError("Could not load subjects. Please try again."); }
            } finally {
                if (!controller.signal.aborted) setSearching(false);
            }
        }, 250);
        return () => { clearTimeout(timeout); controller.abort(); };
    }, [open, editing, data.mode, query, retrySearch]);

    // While typing a code (new subject, or a revision that changes the code), look up the
    // versions that code already has, including old hyphenated variants (IT104-, IT104--).
    const code = String(data.subject_code ?? "").trim();
    const lookupCode = open && code !== "" && (editing ? code !== (entry?.subject?.subject_code ?? "") : data.mode === "new");
    useEffect(() => {
        if (!lookupCode) { setVersions([]); setCheckingCode(false); return undefined; }
        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            setCheckingCode(true);
            try {
                const response = await axios.get(route("curr.subjects.search"), { params: { code }, signal: controller.signal });
                if (!controller.signal.aborted) setVersions(response.data.subjects || []);
            } catch {
                if (!controller.signal.aborted) setVersions([]);
            } finally {
                if (!controller.signal.aborted) setCheckingCode(false);
            }
        }, 350);
        return () => { clearTimeout(timeout); controller.abort(); };
    }, [lookupCode, code]);

    const exactVersions = versions.filter((subject) => sameCodeText(subject.subject_code, code));
    const similarCodes = versions.filter((subject) => !sameCodeText(subject.subject_code, code));
    const identical = exactVersions.find((subject) =>
        normTitle(subject.descriptive_title) === normTitle(data.descriptive_title)
        && Number(subject.credit_units) === Number(data.credit_units)
        && Number(subject.lecture_hours) === Number(data.lecture_hours)
        && Number(subject.laboratory_hours) === Number(data.laboratory_hours));
    const needsVersionConfirmation = !editing && data.mode === "new" && exactVersions.length > 0 && !identical;

    const changeField = (event) => {
        if (["subject_code", "descriptive_title"].includes(event.target.name)) setApprovedDetailsConfirmed(false);
        setCreateVersionConfirmed(false);
        setData(event.target.name, event.target.value);
        clearErrors(event.target.name);
    };

    // "Use this" on a listed version: switch to adding that existing subject instead.
    const useVersion = (subject) => {
        setData((current) => ({ ...current, mode: "existing", subject_id: subject.id, create_version: false }));
        setSelectedSubject(subject);
        setQuery(codeKey(subject.subject_code));
        setApprovedDetailsConfirmed(false);
        setCreateVersionConfirmed(false);
        clearErrors();
    };

    const submit = (event) => {
        event.preventDefault();
        if (processing || (requiresApprovalConfirmation && !approvedDetailsConfirmed) || (needsVersionConfirmation && !createVersionConfirmed)) return;
        const reused = !editing && data.mode === "new" && identical;
        const newVersion = needsVersionConfirmation;
        transform((form) => ({ ...form, create_version: newVersion && createVersionConfirmed }));
        post(route(editing ? "curr.editsubject" : "curr.addsubject"), {
            preserveScroll: true,
            onSuccess: () => {
                toast({
                    description: editing
                        ? "Subject revised for this curriculum. Existing classes keep the original details."
                        : reused ? `${code} already existed with these details, so it was added as is.`
                        : newVersion ? `New version of ${code} created and added to this semester.`
                        : "Subject added to this semester.",
                    variant: "success",
                });
                onOpenChange(false);
                onSaved();
            },
        });
    };
    const field = (name, label, type = "text") => (
        <div className="space-y-2">
            <Label htmlFor={`${prefix}-${name}`}>{label}</Label>
            <Input id={`${prefix}-${name}`} name={name} type={type} value={data[name]} onChange={changeField} required disabled={processing}
                {...(type === "number" ? { min: 0, max: name === "credit_units" ? 99 : 168, step: 1, inputMode: "numeric" } : { maxLength: 255 })}
                aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `${prefix}-${name}-error` : undefined} className={errors[name] ? "border-red-500" : ""} />
            {errors[name] && <p id={`${prefix}-${name}-error`} role="alert" className="text-sm text-red-600 dark:text-red-400">{errors[name]}</p>}
        </div>
    );

    // How many versions of each code are in the search results (for the "N versions" hint).
    const versionCounts = results.reduce((counts, subject) => {
        const key = codeKey(subject.subject_code);
        counts[key] = (counts[key] || 0) + 1;
        return counts;
    }, {});

    const versionsPanel = lookupCode && (checkingCode || versions.length > 0) && (
        <div className="space-y-2" role="status" aria-live="polite">
            {checkingCode && versions.length === 0 ? (
                <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Checking {code}…</p>
            ) : (
                <div className={`space-y-2 rounded-lg border p-3 ${identical ? "border-sky-500/40 bg-sky-50 dark:bg-sky-500/10" : "border-amber-500/50 bg-amber-50 dark:bg-amber-500/10"}`}>
                    <p className="flex items-start gap-2 text-sm">
                        {identical ? <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : <Copy className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />}
                        <span>
                            {identical
                                ? editing ? <>This matches an existing version of <strong>{code}</strong>, which this curriculum will use.</>
                                          : <><strong>{code}</strong> with these exact details already exists. It will be added as is, without creating a copy.</>
                                : exactVersions.length > 0
                                    ? editing ? <><strong>{code}</strong> already exists with different details. Saving creates a new version of {code} for this curriculum; the existing versions and their classes stay as they are.</>
                                              : <><strong>{code}</strong> already exists with different details. Use one of its versions below, or create a new version for this curriculum.</>
                                    : <>Similar codes already exist. If one of them is this subject, use it instead of creating {code}.</>}
                        </span>
                    </p>
                    <ul className="divide-y rounded-md border bg-background" aria-label={`Existing versions of ${code}`}>
                        {[...exactVersions, ...similarCodes].map((subject) => (
                            <VersionRow key={subject.id} subject={subject} disabled={processing} onUse={editing ? null : useVersion} />
                        ))}
                    </ul>
                    {needsVersionConfirmation && (
                        <div className="flex items-start gap-3 rounded-md border bg-background p-3">
                            <Checkbox id={`${prefix}-create-version`} checked={createVersionConfirmed} onCheckedChange={(checked) => setCreateVersionConfirmed(checked === true)} disabled={processing} className="mt-0.5" />
                            <Label htmlFor={`${prefix}-create-version`} className="cursor-pointer text-sm font-normal leading-relaxed">
                                Create a new version of <strong>{code}</strong> for this curriculum. The existing versions and their classes stay as they are.
                            </Label>
                        </div>
                    )}
                </div>
            )}
        </div>
    );

    const submitLabel = editing ? "Save revision"
        : data.mode === "existing" ? "Add selected subject"
        : identical ? "Add existing subject"
        : needsVersionConfirmation ? "Create new version"
        : "Create and add subject";

    return (
        <Dialog open={open} onOpenChange={(value) => { if (!processing) onOpenChange(value); }}>
            <DialogContent onCloseAutoFocus={onCloseAutoFocus} className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>{editing ? "Revise subject" : "Add subject"}</DialogTitle>
                    <DialogDescription>{yearlevel} · {semesterName}</DialogDescription>
                </DialogHeader>
                <form onSubmit={submit} className="space-y-5">
                    {editing ? (
                        <p className="rounded-md bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">Changes apply to this curriculum entry. Existing classes keep their original subject details.</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/50 p-1" role="group" aria-label="How to add the subject">
                            {[{ mode: "existing", label: "Use existing subject" }, { mode: "new", label: "Create new subject" }].map((choice) => (
                                <Button key={choice.mode} type="button" variant={data.mode === choice.mode ? "secondary" : "ghost"} className="h-auto min-h-10 whitespace-normal px-2 py-2" aria-pressed={data.mode === choice.mode} disabled={processing} onClick={() => { setData("mode", choice.mode); setApprovedDetailsConfirmed(false); setCreateVersionConfirmed(false); clearErrors(); }}>{choice.label}</Button>
                            ))}
                        </div>
                    )}
                    {!editing && data.mode === "existing" ? (
                        <div className="space-y-3">
                            <p className="text-sm text-muted-foreground">Choose a subject from the catalog to use its code, title, and units. A code can have several versions; check the title, units and where each one is used.</p>
                            <div className="space-y-2">
                                <Label htmlFor={`${prefix}-search`}>Search subjects</Label>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                    <Input id={`${prefix}-search`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by code or title" maxLength={100} className="pl-9" disabled={processing} autoComplete="off" />
                                </div>
                            </div>
                            <div className="max-h-64 overflow-y-auto rounded-md border" aria-label="Subject search results" aria-busy={searching}>
                                {searching ? (
                                    <SubjectResultsSkeleton />
                                ) : searchError ? (
                                    <div className="space-y-2 p-4 text-center"><p role="alert" className="text-sm text-red-600 dark:text-red-400">{searchError}</p><Button type="button" variant="outline" onClick={() => setRetrySearch((value) => value + 1)}>Try again</Button></div>
                                ) : results.length === 0 ? (
                                    <p className="p-6 text-center text-sm text-muted-foreground">No subjects found. Try another search or create a new subject.</p>
                                ) : results.map((subject) => {
                                    const versionCount = versionCounts[codeKey(subject.subject_code)] || 1;
                                    return (
                                        <button key={subject.id} type="button" disabled={processing} aria-pressed={data.subject_id === subject.id} onClick={() => { setSelectedSubject(subject); setData("subject_id", subject.id); clearErrors("subject_id"); }} className={`flex w-full items-start justify-between gap-3 border-b px-3 py-3 text-left last:border-b-0 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:opacity-50 ${data.subject_id === subject.id ? "bg-primary/10" : ""}`}>
                                            <span className="min-w-0">
                                                <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                                                    {subject.subject_code}
                                                    {versionCount > 1 && <span className="rounded bg-amber-500/15 px-1.5 text-[11px] font-medium leading-5 text-amber-900 dark:text-amber-200">{versionCount} versions</span>}
                                                </span>
                                                <span className="mt-0.5 block text-sm text-muted-foreground">{subject.descriptive_title}</span>
                                                <span className="mt-1 block text-xs text-muted-foreground">{subject.credit_units} units · {subject.lecture_hours || 0} lec / {subject.laboratory_hours || 0} lab hrs</span>
                                                <span className="mt-0.5 block text-xs text-muted-foreground">{usageText(subject)}</span>
                                            </span>
                                            {data.subject_id === subject.id && <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                                        </button>
                                    );
                                })}
                            </div>
                            <p className="text-xs text-muted-foreground">Showing up to 30 matches. Refine your search to find a specific subject.</p>
                            {selectedSubject && <p className="rounded-md bg-muted/50 p-3 text-sm" role="status">Selected: <strong>{selectedSubject.subject_code}</strong> — {selectedSubject.descriptive_title} ({selectedSubject.credit_units} units)</p>}
                            {errors.subject_id && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errors.subject_id}</p>}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {!editing && (
                                <div role="note" aria-labelledby={`${prefix}-approved-curriculum-title`} className="flex gap-3 rounded-lg border border-amber-500/50 bg-amber-50 p-4 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
                                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
                                    <div className="space-y-1">
                                        <p id={`${prefix}-approved-curriculum-title`} className="text-sm font-semibold">Match the approved curriculum</p>
                                        <p id={`${prefix}-approved-curriculum-note`} className="text-sm leading-relaxed">The <strong>subject code</strong> and <strong>descriptive title</strong> must exactly match your approved curriculum. Check both against the approved document before creating this subject. No need to add hyphens to reuse a code: a code can now have a new version per curriculum.</p>
                                    </div>
                                </div>
                            )}
                            {field("subject_code", "Subject code")}
                            {field("descriptive_title", "Descriptive title")}
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                                {field("credit_units", "Credit units", "number")}
                                {field("lecture_hours", "Lecture hours", "number")}
                                {field("laboratory_hours", "Laboratory hours", "number")}
                            </div>
                            <p className="text-sm text-muted-foreground">Total contact hours: <span className="font-medium text-foreground">{(Number(data.lecture_hours) || 0) + (Number(data.laboratory_hours) || 0)} hrs/week</span></p>
                            {versionsPanel}
                            {!editing && (
                                <div className="flex items-start gap-3 rounded-md border p-3">
                                    <Checkbox id={`${prefix}-approved-curriculum-confirmation`} checked={approvedDetailsConfirmed} onCheckedChange={(checked) => setApprovedDetailsConfirmed(checked === true)} required disabled={processing} aria-describedby={`${prefix}-approved-curriculum-note`} className="mt-0.5" />
                                    <Label htmlFor={`${prefix}-approved-curriculum-confirmation`} className="cursor-pointer text-sm font-normal leading-relaxed">I checked the approved curriculum and confirm that the subject code and descriptive title match it exactly.</Label>
                                </div>
                            )}
                        </div>
                    )}
                    {["id", "curriculum_term_id", "mode", "create_version"].map((name) => errors[name] && <p key={name} role="alert" className="text-sm text-red-600 dark:text-red-400">{errors[name]}</p>)}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" disabled={processing} onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={processing || (requiresApprovalConfirmation && !approvedDetailsConfirmed) || (needsVersionConfirmation && !createVersionConfirmed) || (!editing && data.mode === "existing" && !data.subject_id)}>{processing && <Loader2 className="animate-spin" aria-hidden="true" />}{processing ? "Saving…" : submitLabel}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
