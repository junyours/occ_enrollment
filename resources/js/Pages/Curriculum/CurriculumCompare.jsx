import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link, usePage } from "@inertiajs/react";
import { AlertCircle, ArrowLeft, ArrowLeftRight, ArrowRight, GitCompare, RefreshCw } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { Label } from "@/Components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { SemesterLabel, semesterStyle } from "./semesters";
import { CompareSkeleton } from "./CurriculumSkeletons";

const YEAR_NAMES = { 1: "First Year", 2: "Second Year", 3: "Third Year", 4: "Fourth Year" };
const ORDINAL = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };
const SHORT_SEMESTER = { 1: "1st sem", 2: "2nd sem", 3: "Summer" };

const STATUS = {
    added: { label: "Added", pill: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200" },
    removed: { label: "Removed", pill: "bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200" },
    changed: { label: "Changed", pill: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-200" },
    unchanged: { label: "Unchanged", pill: "bg-muted text-muted-foreground" },
};

const FILTERS = [
    { key: "differences", label: "All differences", match: (row) => row.status !== "unchanged" },
    { key: "added", label: "Added", match: (row) => row.status === "added" },
    { key: "removed", label: "Removed", match: (row) => row.status === "removed" },
    { key: "changed", label: "Changed", match: (row) => row.status === "changed" },
    { key: "unchanged", label: "Unchanged", match: (row) => row.status === "unchanged" },
];

const place = (side) => `${YEAR_NAMES[side.year_level_id] ?? `Year ${side.year_level_id}`} · ${SHORT_SEMESTER[side.semester_id] ?? "Semester"}`;
const standing = (id) => (id ? `${ORDINAL[id] ?? id} Year Standing` : "");
const prerequisiteText = (side) => [...(side?.prerequisites ?? []), standing(side?.required_year_level_id)].filter(Boolean).join(", ") || "none";

// "old → new" when changed, otherwise just the value.
function Diff({ before, after, changed }) {
    if (!changed) return <>{after}</>;
    return (
        <span className="inline-flex flex-wrap items-center gap-x-1">
            <span className="text-muted-foreground line-through decoration-muted-foreground/60">{before}</span>
            <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="changed to" />
            <span className="font-medium">{after}</span>
        </span>
    );
}

function ChangeChips({ row }) {
    const { from, to, changes } = row;
    const chips = [];
    if (changes.includes("code")) chips.push("Code");
    if (changes.includes("title")) chips.push("Title");
    if (changes.includes("units")) chips.push("Units");
    if (changes.includes("hours")) chips.push(`Hours ${from.lecture_hours}/${from.laboratory_hours} → ${to.lecture_hours}/${to.laboratory_hours} (lec/lab)`);
    if (changes.includes("moved")) chips.push(`Moved from ${place(from)}`);
    if (changes.includes("prerequisites")) chips.push("Prerequisites");
    if (changes.includes("standing")) chips.push("Year standing");
    if (chips.length === 0) return <span className="text-muted-foreground">—</span>;
    return (
        <div className="flex flex-wrap gap-1">
            {chips.map((chip) => <span key={chip} className="rounded bg-sky-500/10 px-1.5 text-[11px] leading-5 text-sky-900 dark:text-sky-200">{chip}</span>)}
        </div>
    );
}

function CompareRow({ row }) {
    const { status, from, to, changes } = row;
    const side = to ?? from;
    const removed = status === "removed";
    const has = (key) => changes.includes(key);
    const prerequisitesChanged = has("prerequisites") || has("standing");

    return (
        <tr className={`border-b border-border/50 align-top last:border-b-0 ${removed ? "text-muted-foreground" : ""}`}>
            <td className="w-24 px-3 py-1.5">
                <span className={`inline-block rounded px-1.5 text-[11px] font-semibold leading-5 ${STATUS[status].pill}`}>{STATUS[status].label}</span>
            </td>
            <td className={`w-40 whitespace-nowrap px-3 py-1.5 font-medium ${removed ? "line-through" : ""}`}>
                {from && to ? <Diff before={from.code} after={to.code} changed={has("code")} /> : side.code}
            </td>
            <td className={`min-w-[240px] px-3 py-1.5 leading-snug ${removed ? "line-through" : ""}`}>
                {from && to ? <Diff before={from.title} after={to.title} changed={has("title")} /> : side.title}
            </td>
            <td className="w-20 px-3 py-1.5 text-center tabular-nums">
                {from && to ? <Diff before={from.units} after={to.units} changed={has("units")} /> : side.units}
            </td>
            <td className="w-48 px-3 py-1.5 text-[13px]">
                {from && to
                    ? <Diff before={prerequisiteText(from)} after={prerequisiteText(to)} changed={prerequisitesChanged} />
                    : <span className={prerequisiteText(side) === "none" ? "text-muted-foreground" : ""}>{prerequisiteText(side)}</span>}
            </td>
            <td className="w-64 px-3 py-1.5 text-[13px]">
                {status === "changed" ? <ChangeChips row={row} /> : <span className="text-muted-foreground">{status === "added" ? `New in this year` : status === "removed" ? "Not in the newer year" : "—"}</span>}
            </td>
        </tr>
    );
}

function readQuery(curricula) {
    const ids = new Set(curricula.map((c) => String(c.id)));
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    const to = params.get("to");
    return {
        from: ids.has(from) ? from : String(curricula[1]?.id ?? ""),
        to: ids.has(to) ? to : String(curricula[0]?.id ?? ""),
    };
}

export default function CurriculumCompare() {
    const { course, curricula = [] } = usePage().props;
    const [selection, setSelection] = useState(() => readQuery(curricula));
    const [filter, setFilter] = useState("differences");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const labelOf = (id) => curricula.find((c) => String(c.id) === String(id))?.label ?? "";
    const canCompare = selection.from && selection.to && selection.from !== selection.to;

    useEffect(() => {
        if (!canCompare) { setResult(null); return undefined; }
        const params = new URLSearchParams(window.location.search);
        params.set("from", selection.from);
        params.set("to", selection.to);
        window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params}`);

        const controller = new AbortController();
        setLoading(true);
        setError("");
        axios.post(route("curr.compare.data", course.hashed_id), { from: Number(selection.from), to: Number(selection.to) }, { signal: controller.signal })
            .then((response) => setResult(response.data))
            .catch((err) => { if (!controller.signal.aborted) setError(err.response?.data?.message || "We couldn't compare these curriculum years. Please try again."); })
            .finally(() => { if (!controller.signal.aborted) setLoading(false); });
        return () => controller.abort();
    }, [selection.from, selection.to, retry]);

    const counts = result?.counts ?? { added: 0, removed: 0, changed: 0, unchanged: 0 };
    const filterCount = (key) => key === "differences" ? counts.added + counts.removed + counts.changed : counts[key] ?? 0;

    // Rows grouped by year and semester (the newer year's place; removed subjects by their old place).
    const groups = useMemo(() => {
        if (!result) return [];
        const match = FILTERS.find((f) => f.key === filter)?.match ?? (() => true);
        const map = new Map();
        result.rows.filter(match).forEach((row) => {
            const side = row.to ?? row.from;
            const key = `${side.year_level_id}-${side.semester_id}`;
            if (!map.has(key)) map.set(key, { key, year: side.year_level_id, semester: side.semester_id, rows: [] });
            map.get(key).rows.push(row);
        });
        return [...map.values()].sort((a, b) => a.year - b.year || a.semester - b.semester);
    }, [result, filter]);

    if (curricula.length < 2) {
        return (
            <div className="mx-auto max-w-xl py-16 text-center">
                <GitCompare className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
                <p className="font-medium">Nothing to compare yet</p>
                <p className="mt-1 text-sm text-muted-foreground">{course.abbreviation} needs at least two curriculum years to compare.</p>
                <Button asChild variant="outline" className="mt-5"><Link href="/curriculum"><ArrowLeft aria-hidden="true" />Back to curricula</Link></Button>
            </div>
        );
    }

    return (
        <div className="min-w-0 space-y-5 py-2 sm:py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{course.name}</p>
                <Button asChild variant="ghost" size="sm" className="text-[13px]"><Link href="/curriculum"><ArrowLeft aria-hidden="true" />Curricula</Link></Button>
            </div>

            <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-card p-4">
                <div className="min-w-40 flex-1 space-y-1.5">
                    <Label htmlFor="compare-from">From (older)</Label>
                    <Select value={selection.from} onValueChange={(value) => setSelection((s) => ({ ...s, from: value }))}>
                        <SelectTrigger id="compare-from"><SelectValue placeholder="Choose a year" /></SelectTrigger>
                        <SelectContent>{curricula.map((c) => <SelectItem key={c.id} value={String(c.id)} disabled={String(c.id) === selection.to}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <Button type="button" variant="outline" size="icon" aria-label="Swap the two years" title="Swap" onClick={() => setSelection((s) => ({ from: s.to, to: s.from }))}>
                    <ArrowLeftRight aria-hidden="true" />
                </Button>
                <div className="min-w-40 flex-1 space-y-1.5">
                    <Label htmlFor="compare-to">To (newer)</Label>
                    <Select value={selection.to} onValueChange={(value) => setSelection((s) => ({ ...s, to: value }))}>
                        <SelectTrigger id="compare-to"><SelectValue placeholder="Choose a year" /></SelectTrigger>
                        <SelectContent>{curricula.map((c) => <SelectItem key={c.id} value={String(c.id)} disabled={String(c.id) === selection.from}>{c.label}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
            </div>

            {error && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <p className="flex items-start gap-2 text-sm"><AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />{error}</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => setRetry((n) => n + 1)}><RefreshCw aria-hidden="true" />Try again</Button>
                </div>
            )}

            {loading && !result ? (
                <CompareSkeleton />
            ) : result && (
                <div className={`space-y-5 transition-opacity ${loading ? "opacity-50" : ""}`} aria-busy={loading}>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {[
                            { label: "Subjects", before: result.from.subjects, after: result.to.subjects },
                            { label: "Credit units", before: result.from.units, after: result.to.units },
                        ].map(({ label, before, after }) => (
                            <div key={label} className="rounded-lg bg-muted/50 px-4 py-3">
                                <p className="flex items-baseline gap-2 text-xl font-semibold tabular-nums">
                                    <span className="text-muted-foreground">{before}</span><ArrowRight className="h-4 w-4 self-center text-muted-foreground" aria-label="to" />{after}
                                </p>
                                <p className="mt-0.5 text-[13px] text-muted-foreground">{label} · {labelOf(selection.from)} → {labelOf(selection.to)}</p>
                            </div>
                        ))}
                        <div className="rounded-lg bg-muted/50 px-4 py-3">
                            <p className="text-xl font-semibold tabular-nums"><span className="text-emerald-700 dark:text-emerald-300">+{counts.added}</span> <span className="text-red-700 dark:text-red-300">−{counts.removed}</span></p>
                            <p className="mt-0.5 text-[13px] text-muted-foreground">Subjects added / removed</p>
                        </div>
                        <div className="rounded-lg bg-muted/50 px-4 py-3">
                            <p className="text-xl font-semibold tabular-nums text-sky-700 dark:text-sky-300">{counts.changed}</p>
                            <p className="mt-0.5 text-[13px] text-muted-foreground">Changed · {counts.unchanged} unchanged</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show">
                        {FILTERS.map((f) => (
                            <Button key={f.key} type="button" size="sm" variant={filter === f.key ? "secondary" : "ghost"} aria-pressed={filter === f.key} className="h-8 text-[13px]" onClick={() => setFilter(f.key)}>
                                {f.label}<Badge variant="outline" className="ml-1 px-1.5 py-0 text-[11px] tabular-nums">{filterCount(f.key)}</Badge>
                            </Button>
                        ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Subjects are matched even when their code changed between years (same or very similar title). Codes and titles that changed show as <span className="line-through">old</span> → new.
                    </p>

                    {groups.length === 0 ? (
                        <p className="rounded-lg bg-muted/30 px-5 py-10 text-center text-sm text-muted-foreground">
                            {filter === "differences" ? "These two curriculum years are identical." : "Nothing in this view."}
                        </p>
                    ) : groups.map((group) => {
                        const style = semesterStyle(group.semester);
                        return (
                            <section key={group.key} className={`min-w-0 border-l-2 ${style.edge}`} aria-label={`${YEAR_NAMES[group.year]}, ${style.label}`}>
                                <div className={`flex items-center gap-2 px-3 py-1.5 text-sm ${style.strip}`}>
                                    <span className="font-medium text-muted-foreground">{YEAR_NAMES[group.year] ?? `Year ${group.year}`}</span>
                                    <SemesterLabel semesterId={group.semester} />
                                    <span className={`text-xs ${style.subtext}`}>{group.rows.length} {group.rows.length === 1 ? "subject" : "subjects"}</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full min-w-[900px] text-sm">
                                        <thead className="bg-muted/40 text-xs text-muted-foreground">
                                            <tr>
                                                <th scope="col" className="h-8 px-3 text-left font-medium">Status</th>
                                                <th scope="col" className="h-8 px-3 text-left font-medium">Subject code</th>
                                                <th scope="col" className="h-8 px-3 text-left font-medium">Descriptive title</th>
                                                <th scope="col" className="h-8 px-3 text-center font-medium">Units</th>
                                                <th scope="col" className="h-8 px-3 text-left font-medium">Prerequisites</th>
                                                <th scope="col" className="h-8 px-3 text-left font-medium">What changed</th>
                                            </tr>
                                        </thead>
                                        <tbody>{group.rows.map((row, i) => <CompareRow key={`${row.from?.entry_id ?? "x"}-${row.to?.entry_id ?? "x"}-${i}`} row={row} />)}</tbody>
                                    </table>
                                </div>
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

CurriculumCompare.layout = (page) => {
    const { course } = page.props;
    return (
        <AuthenticatedLayout
            title={`Compare ${course?.abbreviation ?? ""} curricula`}
            headerContent={<h1 className="min-w-0 truncate text-sm font-semibold text-foreground md:text-base">Compare {course?.abbreviation} curricula</h1>}
        >
            {page}
        </AuthenticatedLayout>
    );
};
