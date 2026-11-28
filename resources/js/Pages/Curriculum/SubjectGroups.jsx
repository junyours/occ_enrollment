import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "@inertiajs/react";
import { AlertCircle, AlertTriangle, ArrowLeft, Check, Link2, Loader2, Pencil, Plus, RefreshCw, Search, Trash2, Undo2, X } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/Components/ui/alert-dialog";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { Checkbox } from "@/Components/ui/checkbox";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Skeleton } from "@/Components/ui/skeleton";
import { Switch } from "@/Components/ui/switch";
import { useToast } from "@/hooks/use-toast";

const ORDINAL = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
const SEMESTER = { 1: "1st sem", 2: "2nd sem", 3: "Summer" };
const VIEWS = [
    { key: "suggestions", label: "Suggestions" },
    { key: "groups", label: "Groups" },
    { key: "dismissed", label: "Not the same" },
];
const EMPTY = {
    suggestions: "No suggestions. Every subject title is either grouped already or used under one code only.",
    groups: "No groups yet. Confirm a suggestion to make one.",
    dismissed: "Nothing is marked as not the same.",
};

const place = (use) => `${use.label} (${ORDINAL[use.year_level_id] ?? use.year_level_id} yr, ${SEMESTER[use.semester_id] ?? "sem"})`;
const joinCodes = (codes) => (codes.length <= 2 ? codes.join(" and ") : `${codes.slice(0, -1).join(", ")} and ${codes[codes.length - 1]}`);
const codeKey = (code) => code.toUpperCase().replace(/\s+/g, "");
const formatDate = (value) => {
    const date = value ? new Date(String(value).replace(" ", "T")) : null;
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "";
};

/** Curricula that list two or more of these subjects: a curriculum rarely lists the same subject twice. */
function clashesOf(ids, subjectsById) {
    const byCurriculum = new Map();
    ids.forEach((id) => {
        const subject = subjectsById.get(id);
        if (!subject) return;
        new Map(subject.used_in.map((use) => [use.curriculum_id, use.label])).forEach((label, curriculumId) => {
            if (!byCurriculum.has(curriculumId)) byCurriculum.set(curriculumId, { label, codes: [] });
            byCurriculum.get(curriculumId).codes.push(subject.code);
        });
    });
    return [...byCurriculum.values()].filter((clash) => clash.codes.length > 1);
}

function ClashNote({ clashes }) {
    if (clashes.length === 0) return null;
    return (
        <p className="mt-2 flex items-start gap-2 rounded-md bg-amber-500/10 px-3 py-2 text-[13px] leading-snug text-amber-900 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
                {clashes.map((clash) => `${joinCodes(clash.codes)} ${clash.codes.length === 2 ? "are both" : "are all"} in ${clash.label}`).join("; ")}.
                {" "}A curriculum rarely lists the same subject twice, so these may be different subjects.
            </span>
        </p>
    );
}

function UsedIn({ uses }) {
    if (uses.length === 0) return <span>Not in any curriculum</span>;
    const shown = uses.slice(0, 2);
    return (
        <span title={uses.map(place).join("\n")}>
            {shown.map(place).join(" · ")}
            {uses.length > shown.length && <span> · +{uses.length - shown.length} more</span>}
        </span>
    );
}

function SubjectLine({ subject, children, action }) {
    return (
        <li className="flex items-start gap-3 py-2">
            {children}
            <div className="min-w-0 flex-1">
                <p className="text-sm leading-snug">
                    <span className="font-semibold">{subject.code}</span>
                    <span className="text-foreground"> {subject.title}</span>
                    <span className="ml-1 text-xs tabular-nums text-muted-foreground">{subject.units}u</span>
                </p>
                <p className="mt-0.5 text-xs leading-snug text-muted-foreground">
                    <UsedIn uses={subject.used_in} />
                    {!subject.editable && <span className="ml-1.5 whitespace-nowrap rounded bg-muted px-1">Other department</span>}
                </p>
            </div>
            {action}
        </li>
    );
}

function SuggestionCard({ suggestion, subjectsById, groupsById, busyAction, onConfirm, onAdd, onDismiss }) {
    const subjects = suggestion.subject_ids.map((id) => subjectsById.get(id)).filter(Boolean);
    const isAdd = suggestion.type === "add";
    const [unchecked, setUnchecked] = useState(() => new Set());
    const [groupId, setGroupId] = useState(String(suggestion.group_ids[0] ?? ""));
    const group = groupsById.get(Number(groupId));
    const chosen = subjects.filter((subject) => subject.editable && !unchecked.has(subject.id));
    const enough = isAdd ? chosen.length > 0 && group : new Set(chosen.map((s) => codeKey(s.code))).size >= 2;
    const clashes = clashesOf([...chosen.map((s) => s.id), ...(isAdd ? group?.subject_ids ?? [] : [])], subjectsById);
    const canAnswer = subjects.some((subject) => subject.editable);
    const busy = busyAction !== null;

    const toggle = (id, checked) => setUnchecked((previous) => {
        const next = new Set(previous);
        if (checked) next.delete(id); else next.add(id);
        return next;
    });

    return (
        <article className="rounded-xl border bg-card p-4" aria-label={`Suggestion: ${suggestion.name}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                <h3 className="font-medium leading-snug">{suggestion.name}</h3>
                <span className={`rounded px-1.5 text-[11px] font-semibold leading-5 ${isAdd ? "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200" : "bg-muted text-muted-foreground"}`}>
                    {isAdd ? "Add to a group" : "New group"}
                </span>
            </div>
            {isAdd && (suggestion.group_ids.length === 1 ? (
                <p className="mt-1 text-[13px] text-muted-foreground">
                    Same title as the group <span className="font-medium text-foreground">“{group?.name}”</span>
                    {group && ` (${group.subject_ids.map((id) => subjectsById.get(id)?.code).filter(Boolean).join(", ")})`}.
                </p>
            ) : (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Label htmlFor={`group-for-${suggestion.key}`} className="text-[13px] font-normal text-muted-foreground">Add to</Label>
                    <Select value={groupId} onValueChange={setGroupId}>
                        <SelectTrigger id={`group-for-${suggestion.key}`} className="h-8 w-auto min-w-48 text-[13px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {suggestion.group_ids.map((id) => <SelectItem key={id} value={String(id)}>{groupsById.get(id)?.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            ))}

            <ul className="mt-1 divide-y divide-border/60">
                {subjects.map((subject) => (
                    <SubjectLine key={subject.id} subject={subject}>
                        <Checkbox
                            className="mt-0.5"
                            checked={subject.editable && !unchecked.has(subject.id)}
                            disabled={!subject.editable || busy}
                            onCheckedChange={(value) => toggle(subject.id, value === true)}
                            aria-label={`Include ${subject.code} ${subject.title}`}
                        />
                    </SubjectLine>
                ))}
            </ul>
            <ClashNote clashes={clashes} />

            {canAnswer ? (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button type="button" size="sm" disabled={!enough || busy} onClick={() => (isAdd ? onAdd(suggestion, group, chosen) : onConfirm(suggestion, chosen))}>
                        {busyAction === "confirm" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
                        {isAdd ? "Add to group" : "Same subject"}
                    </Button>
                    <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onDismiss(suggestion)}>
                        {busyAction === "dismiss" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <X aria-hidden="true" />}Not the same
                    </Button>
                    {!enough && !isAdd && <span className="text-xs text-muted-foreground">Tick at least two different codes.</span>}
                </div>
            ) : (
                <p className="mt-3 text-[13px] text-muted-foreground">Only program heads of the departments using these subjects can answer this.</p>
            )}
        </article>
    );
}

function GroupCard({ group, subjectsById, candidates, busyAction, onRename, onRemove, onAdd, onDelete }) {
    const members = group.subject_ids.map((id) => subjectsById.get(id)).filter(Boolean).sort((a, b) => a.code.localeCompare(b.code));
    const own = members.filter((member) => member.editable);
    const canRename = own.length > 0;
    const canDelete = members.length > 0 && own.length === members.length;
    const busy = busyAction !== null;
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(group.name);
    const [adding, setAdding] = useState(false);
    const [search, setSearch] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);

    const results = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return [];
        return candidates.filter((s) => s.code.toLowerCase().includes(q) || s.title.toLowerCase().includes(q)).slice(0, 8);
    }, [candidates, search]);

    const saveName = async (event) => {
        event.preventDefault();
        const name = draft.trim();
        if (!name || name === group.name) { setEditing(false); setDraft(group.name); return; }
        if (await onRename(group, name)) setEditing(false);
    };

    return (
        <article className="rounded-xl border bg-card p-4" aria-label={`Group: ${group.name}`}>
            <div className="flex flex-wrap items-start justify-between gap-2">
                {editing ? (
                    <form onSubmit={saveName} className="flex min-w-0 flex-1 items-center gap-2">
                        <Input
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setEditing(false); setDraft(group.name); } }}
                            aria-label="Group name"
                            maxLength={255}
                            autoFocus
                            className="h-8"
                        />
                        <Button type="submit" size="sm" className="h-8" disabled={busy}>{busyAction === "rename" ? <Loader2 className="animate-spin" aria-hidden="true" /> : "Save"}</Button>
                        <Button type="button" size="sm" variant="ghost" className="h-8" onClick={() => { setEditing(false); setDraft(group.name); }}>Cancel</Button>
                    </form>
                ) : (
                    <h3 className="flex min-w-0 items-center gap-1 font-medium leading-snug">
                        <Link2 className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0 break-words">{group.name}</span>
                        {canRename && (
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label={`Rename ${group.name}`} disabled={busy} onClick={() => { setDraft(group.name); setEditing(true); }}>
                                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </Button>
                        )}
                    </h3>
                )}
                {!editing && canDelete && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 text-[13px] text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:text-red-400" disabled={busy} onClick={() => setConfirmDelete(true)}>
                        <Trash2 aria-hidden="true" />Delete
                    </Button>
                )}
            </div>

            <ul className="mt-1 divide-y divide-border/60">
                {members.map((member) => (
                    <SubjectLine
                        key={member.id}
                        subject={member}
                        action={member.editable && (
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 shrink-0" aria-label={`Remove ${member.code} from ${group.name}`} disabled={busy} onClick={() => onRemove(group, member)}>
                                {busyAction === `remove:${member.id}` ? <Loader2 className="animate-spin" aria-hidden="true" /> : <X aria-hidden="true" />}
                            </Button>
                        )}
                    />
                ))}
            </ul>
            {members.length === 1 && <p className="mt-1 text-[13px] text-muted-foreground">Only one code left. Add another, or delete the group.</p>}
            <ClashNote clashes={clashesOf(group.subject_ids, subjectsById)} />

            {candidates.length > 0 && (adding ? (
                <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setAdding(false); setSearch(""); } }}
                                placeholder="Search your subjects by code or title…"
                                aria-label={`Find a subject to add to ${group.name}`}
                                autoFocus
                                className="h-9 pl-8"
                            />
                        </div>
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setAdding(false); setSearch(""); }}>Done</Button>
                    </div>
                    {search.trim() !== "" && (results.length === 0 ? (
                        <p className="text-[13px] text-muted-foreground">No ungrouped subject of yours matches “{search.trim()}”.</p>
                    ) : (
                        <ul className="divide-y divide-border/60 rounded-md border" aria-label="Matching subjects">
                            {results.map((subject) => (
                                <li key={subject.id}>
                                    <button
                                        type="button"
                                        disabled={busy}
                                        onClick={async () => { if (await onAdd(group, subject)) setSearch(""); }}
                                        className="flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none disabled:opacity-50"
                                    >
                                        <Plus className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                                        <span className="min-w-0">
                                            <span className="font-semibold">{subject.code}</span> {subject.title}
                                            <span className="block text-xs text-muted-foreground"><UsedIn uses={subject.used_in} /></span>
                                        </span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ))}
                </div>
            ) : (
                <Button type="button" variant="outline" size="sm" className="mt-3 h-8 text-[13px]" disabled={busy} onClick={() => setAdding(true)}>
                    {busyAction === "add" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}Add a subject
                </Button>
            ))}

            {(group.updated_by || group.updated_at) && (
                <p className="mt-3 text-xs text-muted-foreground">
                    Last changed{group.updated_by ? ` by ${group.updated_by}` : ""}{formatDate(group.updated_at) ? ` · ${formatDate(group.updated_at)}` : ""}
                </p>
            )}

            <AlertDialog open={confirmDelete} onOpenChange={(open) => { if (!busy) setConfirmDelete(open); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete “{group.name}”?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {joinCodes(members.map((m) => m.code))} will stop counting as the same subject. The subjects themselves don't change.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
                        <Button type="button" variant="destructive" disabled={busy} onClick={async () => { if (await onDelete(group)) setConfirmDelete(false); }}>
                            {busyAction === "delete" && <Loader2 className="animate-spin" aria-hidden="true" />}Delete group
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </article>
    );
}

function DismissedCard({ item, subjectsById, busyAction, onRestore }) {
    const subjects = item.subject_ids.map((id) => subjectsById.get(id)).filter(Boolean);
    const canRestore = subjects.some((subject) => subject.editable);
    return (
        <article className="flex flex-wrap items-start justify-between gap-3 rounded-xl border bg-card p-4" aria-label={`Not the same: ${item.name}`}>
            <div className="min-w-0">
                <h3 className="font-medium leading-snug">{item.name}</h3>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{subjects.map((s) => s.code).join(", ")}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Marked not the same{item.dismissed_by ? ` by ${item.dismissed_by}` : ""}{formatDate(item.dismissed_at) ? ` · ${formatDate(item.dismissed_at)}` : ""}
                </p>
            </div>
            {canRestore && (
                <Button type="button" variant="outline" size="sm" className="h-8 text-[13px]" disabled={busyAction !== null} onClick={() => onRestore(item)}>
                    {busyAction === "restore" ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Undo2 aria-hidden="true" />}Restore
                </Button>
            )}
        </article>
    );
}

export default function SubjectGroups() {
    const { toast } = useToast();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [view, setView] = useState("suggestions");
    const [query, setQuery] = useState("");
    const [mine, setMine] = useState(true);
    const [busy, setBusy] = useState(null); // { key, action } of the change in progress

    const load = () => {
        setLoading(true);
        setError("");
        axios.post(route("curr.subject-groups.data"))
            .then((response) => setData(response.data))
            .catch(() => setError("We couldn't load the subject groups. Please try again."))
            .finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const subjectsById = useMemo(() => new Map((data?.subjects ?? []).map((s) => [s.id, s])), [data]);
    const groupsById = useMemo(() => new Map((data?.groups ?? []).map((g) => [g.id, g])), [data]);
    const candidates = useMemo(() => (data?.subjects ?? []).filter((s) => s.editable && s.group_id === null), [data]);
    const canEdit = (data?.subjects ?? []).some((s) => s.editable);
    const onlyMine = mine && canEdit;

    const lists = useMemo(() => {
        const scope = (items) => (onlyMine ? items.filter((item) => item.subject_ids.some((id) => subjectsById.get(id)?.editable)) : items);
        return { suggestions: scope(data?.suggestions ?? []), groups: scope(data?.groups ?? []), dismissed: scope(data?.dismissed ?? []) };
    }, [data, onlyMine, subjectsById]);

    const needle = query.trim().toLowerCase();
    const visible = lists[view].filter((item) => !needle || item.name.toLowerCase().includes(needle) || item.subject_ids.some((id) => {
        const subject = subjectsById.get(id);
        return subject && (subject.code.toLowerCase().includes(needle) || subject.title.toLowerCase().includes(needle));
    }));

    async function change(key, action, url, payload, success) {
        setBusy({ key, action });
        try {
            const response = await axios.post(url, payload);
            setData(response.data);
            toast({ description: success, variant: "success" });
            return true;
        } catch (err) {
            const errors = err.response?.data?.errors;
            toast({ description: (errors && Object.values(errors).flat()[0]) || err.response?.data?.message || "That didn't work. Please try again.", variant: "destructive" });
            return false;
        } finally {
            setBusy(null);
        }
    }
    const busyFor = (key) => (busy?.key === key ? busy.action : null);
    const codesOf = (subjects) => joinCodes(subjects.map((s) => s.code));

    const actions = {
        confirm: (s, chosen) => change(`s:${s.key}`, "confirm", route("curr.subject-groups.create"), { name: s.name, subject_ids: chosen.map((x) => x.id) }, `Grouped ${codesOf(chosen)} as “${s.name}”.`),
        addFromSuggestion: (s, group, chosen) => change(`s:${s.key}`, "confirm", route("curr.subject-groups.add", group.id), { subject_ids: chosen.map((x) => x.id) }, `Added ${codesOf(chosen)} to “${group.name}”.`),
        dismiss: (s) => change(`s:${s.key}`, "dismiss", route("curr.subject-groups.dismiss"), { key: s.key, subject_ids: s.subject_ids }, `Marked “${s.name}” as not the same. You can restore it under Not the same.`),
        restore: (d) => change(`d:${d.key}`, "restore", route("curr.subject-groups.restore"), { key: d.key }, `“${d.name}” is back in Suggestions.`),
        rename: (g, name) => change(`g:${g.id}`, "rename", route("curr.subject-groups.rename", g.id), { name }, `Renamed to “${name}”.`),
        remove: (g, subject) => change(`g:${g.id}`, `remove:${subject.id}`, route("curr.subject-groups.remove", g.id), { subject_id: subject.id }, `Removed ${subject.code} from “${g.name}”.`),
        addMember: (g, subject) => change(`g:${g.id}`, "add", route("curr.subject-groups.add", g.id), { subject_ids: [subject.id] }, `Added ${subject.code} to “${g.name}”.`),
        destroy: (g) => change(`g:${g.id}`, "delete", route("curr.subject-groups.delete", g.id), {}, `Deleted “${g.name}”.`),
    };

    return (
        <div className="min-w-0 space-y-5 py-2 sm:py-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    Confirm which subject codes are the same subject, like GENED01 and USELF101 for Understanding the Self, so a pass under one code
                    counts for the others. Compare already uses these groups. The exact same code and title always count as the same subject.
                </p>
                <Button asChild variant="ghost" size="sm" className="text-[13px]"><Link href="/curriculum"><ArrowLeft aria-hidden="true" />Curricula</Link></Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show">
                    {VIEWS.map((v) => (
                        <Button key={v.key} type="button" size="sm" variant={view === v.key ? "secondary" : "ghost"} aria-pressed={view === v.key} className="h-8 text-[13px]" onClick={() => setView(v.key)}>
                            {v.label}<Badge variant="outline" className="ml-1 px-1.5 py-0 text-[11px] tabular-nums">{data ? lists[v.key].length : "–"}</Badge>
                        </Button>
                    ))}
                </div>
                <div className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 sm:w-auto">
                    {canEdit && (
                        <div className="flex items-center gap-2">
                            <Switch id="same-subjects-mine" checked={mine} onCheckedChange={setMine} />
                            <Label htmlFor="same-subjects-mine" className="text-[13px] font-normal">Only my department’s subjects</Label>
                        </div>
                    )}
                    <div className="relative w-full sm:w-64">
                        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search code or title…" aria-label="Search by subject code or title" className="h-9 pl-8" />
                    </div>
                </div>
            </div>

            {data && !canEdit && (
                <p className="rounded-lg bg-muted/50 px-4 py-3 text-[13px] text-muted-foreground">
                    Your account isn't linked to a department's curricula, so you can view these groups but not change them.
                </p>
            )}

            {error && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <p className="flex items-start gap-2 text-sm"><AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />{error}</p>
                    <Button type="button" variant="outline" size="sm" onClick={load}><RefreshCw aria-hidden="true" />Try again</Button>
                </div>
            )}

            {loading && !data ? (
                <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2" role="status" aria-busy="true" aria-label="Loading subject groups">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="space-y-3 rounded-xl border p-4">
                            <Skeleton className="h-5 w-48" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-5/6" />
                            <Skeleton className="h-8 w-40" />
                        </div>
                    ))}
                </div>
            ) : data && (visible.length === 0 ? (
                <p className="rounded-lg bg-muted/30 px-5 py-10 text-center text-sm text-muted-foreground">
                    {needle ? `Nothing here matches “${query.trim()}”.` : EMPTY[view]}
                </p>
            ) : (
                <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
                    {view === "suggestions" && visible.map((s) => (
                        <SuggestionCard
                            key={`${s.type}:${s.key}`}
                            suggestion={s}
                            subjectsById={subjectsById}
                            groupsById={groupsById}
                            busyAction={busyFor(`s:${s.key}`)}
                            onConfirm={actions.confirm}
                            onAdd={actions.addFromSuggestion}
                            onDismiss={actions.dismiss}
                        />
                    ))}
                    {view === "groups" && visible.map((g) => (
                        <GroupCard
                            key={g.id}
                            group={g}
                            subjectsById={subjectsById}
                            candidates={candidates}
                            busyAction={busyFor(`g:${g.id}`)}
                            onRename={actions.rename}
                            onRemove={actions.remove}
                            onAdd={actions.addMember}
                            onDelete={actions.destroy}
                        />
                    ))}
                    {view === "dismissed" && visible.map((d) => (
                        <DismissedCard key={d.key} item={d} subjectsById={subjectsById} busyAction={busyFor(`d:${d.key}`)} onRestore={actions.restore} />
                    ))}
                </div>
            ))}
        </div>
    );
}

SubjectGroups.layout = (page) => (
    <AuthenticatedLayout
        title="Same subjects"
        headerContent={<h1 className="min-w-0 truncate text-sm font-semibold text-foreground md:text-base">Same subjects</h1>}
    >
        {page}
    </AuthenticatedLayout>
);
