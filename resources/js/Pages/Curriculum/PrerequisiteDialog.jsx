import React, { useId, useMemo, useState } from "react";
import { useForm } from "@inertiajs/react";
import { Loader2, Search, X } from "lucide-react";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { Checkbox } from "@/Components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { useToast } from "@/hooks/use-toast";

import { isEarlierTerm, yearStandingLabel } from "./prerequisites";
import { SemesterLabel, semesterStyle } from "./semesters";

const YEAR_NAMES = { 1: "First Year", 2: "Second Year", 3: "Third Year", 4: "Fourth Year" };
const SEMESTER_NAMES = { 1: "First Semester", 2: "Second Semester", 3: "Summer" };

export default function PrerequisiteDialog({ open, onOpenChange, entry, term, allTerms = [], yearlevel, semesterName, onSaved, onCloseAutoFocus }) {
    const prefix = useId();
    const { toast } = useToast();
    const [query, setQuery] = useState("");
    const code = entry?.subject?.subject_code || "this subject";
    const ownYear = Number(term?.year_level_id) || 1;

    const { data, setData, post, transform, errors, clearErrors, processing } = useForm({
        id: entry?.id,
        prerequisite_ids: (entry?.pre_requisite_subjects ?? []).map((p) => Number(p.required_term_subject_id)).filter(Boolean),
        required_year_level_id: entry?.required_year_level_id ? String(entry.required_year_level_id) : "none",
    });

    // Earlier terms of this curriculum, MOST RECENT FIRST: prerequisites usually come
    // from the semesters just before, so they shouldn't be at the bottom of a long list.
    const groups = useMemo(() => allTerms
        .filter((t) => isEarlierTerm(t, term))
        .sort((a, b) => Number(b.year_level_id) - Number(a.year_level_id) || Number(b.semester_id) - Number(a.semester_id))
        .map((t) => ({
            id: t.id,
            label: `${YEAR_NAMES[t.year_level_id] ?? "Year " + t.year_level_id} · ${SEMESTER_NAMES[t.semester_id] ?? "Semester"}`,
            yearName: YEAR_NAMES[t.year_level_id] ?? `Year ${t.year_level_id}`,
            semesterId: t.semester_id,
            subjects: (t.curriculum_term_subject ?? []).filter((s) => s.subject),
        }))
        .filter((g) => g.subjects.length > 0), [allTerms, term]);

    const byId = useMemo(() => {
        const map = new Map();
        groups.forEach((g) => g.subjects.forEach((s) => map.set(Number(s.id), s)));
        return map;
    }, [groups]);

    const search = query.trim().toLowerCase();
    const visibleGroups = search
        ? groups
            .map((g) => ({ ...g, subjects: g.subjects.filter((s) => `${s.subject.subject_code} ${s.subject.descriptive_title}`.toLowerCase().includes(search)) }))
            .filter((g) => g.subjects.length > 0)
        : groups;

    const toggle = (id, checked) => {
        clearErrors("prerequisite_ids");
        setData("prerequisite_ids", checked
            ? [...new Set([...data.prerequisite_ids, id])]
            : data.prerequisite_ids.filter((value) => value !== id));
    };

    const submit = (event) => {
        event.preventDefault();
        if (processing) return;
        transform((form) => ({
            ...form,
            required_year_level_id: form.required_year_level_id === "none" ? null : Number(form.required_year_level_id),
        }));
        post(route("curr.subject.prerequisites"), {
            preserveScroll: true,
            onSuccess: () => {
                toast({ description: `Prerequisites saved for ${code}.`, variant: "success" });
                onOpenChange(false);
                onSaved();
            },
        });
    };

    const standingOptions = [2, 3, 4].filter((year) => year <= ownYear);

    return (
        <Dialog open={open} onOpenChange={(value) => { if (!processing) onOpenChange(value); }}>
            <DialogContent onCloseAutoFocus={onCloseAutoFocus} className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg sm:max-w-xl">
                <DialogHeader>
                    <DialogTitle>Prerequisites for {code}</DialogTitle>
                    <DialogDescription>{entry?.subject?.descriptive_title} · {yearlevel}, {semesterName}</DialogDescription>
                </DialogHeader>

                <form onSubmit={submit} className="space-y-5">
                    <p className="rounded-md bg-muted/60 p-3 text-sm leading-relaxed text-muted-foreground">
                        Students must pass <strong className="font-medium text-foreground">all</strong> selected subjects before taking {code}. Only subjects from earlier semesters of this curriculum can be chosen; the most recent semester is listed first.
                    </p>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                            <Label htmlFor={`${prefix}-search`}>Required subjects</Label>
                            <span className="text-xs text-muted-foreground" aria-live="polite">{data.prerequisite_ids.length} selected</span>
                        </div>

                        {/* Always rendered so the list below doesn't jump when the first subject is ticked. */}
                        <div className="flex min-h-6 flex-wrap items-center gap-1.5" aria-label="Selected prerequisites">
                            {data.prerequisite_ids.length === 0 && <span className="text-xs text-muted-foreground">None selected yet.</span>}
                            {data.prerequisite_ids.map((id) => {
                                const selected = byId.get(id);
                                const label = selected?.subject?.subject_code ?? "Removed subject";
                                return (
                                    <Badge key={id} variant="secondary" className="gap-1 pr-1 font-normal">
                                        {label}
                                        <button type="button" disabled={processing} onClick={() => toggle(id, false)} className="rounded-sm p-0.5 hover:bg-foreground/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Remove ${label}`}>
                                            <X className="h-3 w-3" aria-hidden="true" />
                                        </button>
                                    </Badge>
                                );
                            })}
                        </div>

                        {groups.length === 0 ? (
                            <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                                There are no subjects in earlier semesters of this curriculum yet.
                            </p>
                        ) : (
                            <>
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                    <Input id={`${prefix}-search`} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by code or title" maxLength={100} className="pl-9" disabled={processing} autoComplete="off" />
                                </div>
                                <div className="max-h-72 overflow-y-auto rounded-md border">
                                    {visibleGroups.length === 0 ? (
                                        <p className="p-6 text-center text-sm text-muted-foreground">No subjects match your search.</p>
                                    ) : visibleGroups.map((group) => (
                                        <fieldset key={group.id} className="border-b last:border-b-0">
                                            <legend className="sr-only">{group.label}</legend>
                                            <p aria-hidden="true" className={`sticky top-0 z-10 flex items-center gap-2 border-l-2 px-3 py-1.5 text-xs ${semesterStyle(group.semesterId).strip} ${semesterStyle(group.semesterId).edge}`}>
                                                <span className="font-medium text-muted-foreground">{group.yearName}</span>
                                                <SemesterLabel semesterId={group.semesterId} />
                                            </p>
                                            {group.subjects.map((s) => {
                                                const id = Number(s.id);
                                                const inputId = `${prefix}-subject-${id}`;
                                                const checked = data.prerequisite_ids.includes(id);
                                                return (
                                                    <div key={id} className={`flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 ${checked ? "bg-primary/5" : ""}`}>
                                                        <Checkbox id={inputId} checked={checked} disabled={processing} onCheckedChange={(value) => toggle(id, value === true)} className="mt-0.5" />
                                                        <Label htmlFor={inputId} className="min-w-0 flex-1 cursor-pointer font-normal">
                                                            <span className="block text-sm font-semibold">{s.subject.subject_code}</span>
                                                            <span className="block text-sm text-muted-foreground">{s.subject.descriptive_title}</span>
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                        </fieldset>
                                    ))}
                                </div>
                            </>
                        )}
                        {errors.prerequisite_ids && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errors.prerequisite_ids}</p>}
                    </div>

                    {standingOptions.length > 0 && (
                        <div className="space-y-2">
                            <Label htmlFor={`${prefix}-standing`}>Year standing <span className="font-normal text-muted-foreground">(optional)</span></Label>
                            <Select value={data.required_year_level_id} disabled={processing} onValueChange={(value) => { clearErrors("required_year_level_id"); setData("required_year_level_id", value); }}>
                                <SelectTrigger id={`${prefix}-standing`} className="w-full sm:w-64">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No year standing required</SelectItem>
                                    {standingOptions.map((year) => (
                                        <SelectItem key={year} value={String(year)}>{yearStandingLabel(year)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">For example, OJT often requires 4th Year Standing.</p>
                            {errors.required_year_level_id && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errors.required_year_level_id}</p>}
                        </div>
                    )}

                    {errors.id && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errors.id}</p>}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button type="button" variant="outline" disabled={processing} onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={processing}>{processing && <Loader2 className="animate-spin" aria-hidden="true" />}{processing ? "Saving…" : "Save prerequisites"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
