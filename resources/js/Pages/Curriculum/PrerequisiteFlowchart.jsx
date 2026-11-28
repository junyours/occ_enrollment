import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Pencil, X } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { SemesterLabel } from "./semesters";
import { linkedPrerequisites, yearStandingLabel } from "./prerequisites";

const YEAR_NAMES = { 1: "First Year", 2: "Second Year", 3: "Third Year", 4: "Fourth Year" };
const SHORT_SEMESTER = { 1: "1st sem", 2: "2nd sem", 3: "Summer" };
const EDGE_COLORS = { idle: "#94a3b8", before: "#f59e0b", after: "#0ea5e9" };

// Every subject reachable from `start` by following `next` (prerequisites or dependents).
function reachable(start, next) {
    const seen = new Set();
    const queue = [...(next.get(start) ?? [])];
    while (queue.length > 0) {
        const id = queue.shift();
        if (id === start || seen.has(id)) continue;
        seen.add(id);
        queue.push(...(next.get(id) ?? []));
    }
    return seen;
}

const place = (term) => `${YEAR_NAMES[term.year_level_id] ?? `Year ${term.year_level_id}`} · ${SHORT_SEMESTER[term.semester_id] ?? "Semester"}`;

/**
 * The curriculum as a prerequisite flowchart: one column per semester (grouped by year),
 * a card per subject, and an arrow from each prerequisite to the subject that needs it.
 * Hover or focus a subject to light up its whole chain: everything needed before it (amber)
 * and everything it leads to (blue). Click to pin it; Esc clears.
 */
export default function PrerequisiteFlowchart({ terms = [], onEditPrerequisites }) {
    const ordered = useMemo(() => [...terms].sort((a, b) =>
        Number(a.year_level_id) - Number(b.year_level_id) || Number(a.semester_id) - Number(b.semester_id)), [terms]);

    const years = useMemo(() => {
        const groups = [];
        ordered.forEach((term) => {
            const last = groups[groups.length - 1];
            if (last && last.year === Number(term.year_level_id)) last.terms.push(term);
            else groups.push({ year: Number(term.year_level_id), terms: [term] });
        });
        return groups;
    }, [ordered]);

    // Subjects, links between them (only within this curriculum), and both directions of lookup.
    const { nodes, edges, prerequisitesOf, dependentsOf } = useMemo(() => {
        const nodes = new Map();
        ordered.forEach((term) => (term.curriculum_term_subject ?? []).forEach((entry) => {
            if (entry.subject) nodes.set(Number(entry.id), { entry, term });
        }));
        const edges = [];
        const prerequisitesOf = new Map();
        const dependentsOf = new Map();
        nodes.forEach(({ entry }, id) => {
            linkedPrerequisites(entry).forEach((p) => {
                const from = Number(p.required_term_subject_id);
                if (!nodes.has(from)) return;
                edges.push({ from, to: id });
                prerequisitesOf.set(id, [...(prerequisitesOf.get(id) ?? []), from]);
                dependentsOf.set(from, [...(dependentsOf.get(from) ?? []), id]);
            });
        });
        return { nodes, edges, prerequisitesOf, dependentsOf };
    }, [ordered]);

    const [hoveredId, setHoveredId] = useState(null);
    const [pinnedId, setPinnedId] = useState(null);
    const activeId = pinnedId !== null && nodes.has(pinnedId) ? pinnedId : (hoveredId !== null && nodes.has(hoveredId) ? hoveredId : null);
    const before = useMemo(() => (activeId === null ? new Set() : reachable(activeId, prerequisitesOf)), [activeId, prerequisitesOf]);
    const after = useMemo(() => (activeId === null ? new Set() : reachable(activeId, dependentsOf)), [activeId, dependentsOf]);

    // Arrow geometry, measured from the laid-out cards (re-measured on resize and once fonts load).
    const innerRef = useRef(null);
    const cardRefs = useRef(new Map());
    const [geometry, setGeometry] = useState({ width: 0, height: 0, paths: [] });
    const measure = useCallback(() => {
        const inner = innerRef.current;
        if (!inner) return;
        const box = inner.getBoundingClientRect();
        const paths = edges.map(({ from, to }) => {
            const a = cardRefs.current.get(from)?.getBoundingClientRect();
            const b = cardRefs.current.get(to)?.getBoundingClientRect();
            if (!a || !b) return null;
            const x1 = a.right - box.left;
            const y1 = a.top + a.height / 2 - box.top;
            const x2 = b.left - box.left - 2;
            const y2 = b.top + b.height / 2 - box.top;
            const bend = Math.max(24, (x2 - x1) / 2);
            return { from, to, d: `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}` };
        }).filter(Boolean);
        setGeometry({ width: inner.scrollWidth, height: inner.scrollHeight, paths });
    }, [edges]);

    useLayoutEffect(() => { measure(); }, [measure]);
    useEffect(() => {
        const inner = innerRef.current;
        if (!inner) return undefined;
        const observer = new ResizeObserver(() => measure());
        observer.observe(inner);
        document.fonts?.ready?.then(() => measure());
        return () => observer.disconnect();
    }, [measure]);

    // Unpinning removes the details bar; if focus was in it, move focus to the subject's card.
    const detailsRef = useRef(null);
    const unpin = () => {
        if (detailsRef.current?.contains(document.activeElement)) cardRefs.current.get(pinnedId)?.focus();
        setPinnedId(null);
    };

    // Escape unpins, unless an open dialog or menu already used it to close itself. Check
    // defaultPrevented: by the time this runs, React may have already removed that dialog.
    useEffect(() => {
        if (pinnedId === null) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape" && !event.defaultPrevented && !document.querySelector("[role=dialog], [role=alertdialog]")) unpin();
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [pinnedId]);

    const edgeKind = ({ from, to }) => {
        if (activeId === null) return "idle";
        if (before.has(from) && (to === activeId || before.has(to))) return "before";
        if (after.has(to) && (from === activeId || after.has(from))) return "after";
        return "dim";
    };
    const sortedPaths = [...geometry.paths].sort((a, b) => (edgeKind(a) === "dim" || edgeKind(a) === "idle" ? 0 : 1) - (edgeKind(b) === "dim" || edgeKind(b) === "idle" ? 0 : 1));

    const codesOf = (ids) => ordered.flatMap((term) => (term.curriculum_term_subject ?? [])
        .filter((entry) => ids.has(Number(entry.id)) && entry.subject)
        .map((entry) => entry.subject.subject_code));
    const pinned = pinnedId !== null ? nodes.get(pinnedId) : null;
    const pinnedBefore = pinned ? reachable(pinnedId, prerequisitesOf) : new Set();
    const pinnedAfter = pinned ? reachable(pinnedId, dependentsOf) : new Set();

    return (
        <section aria-label="Prerequisite flowchart" className="min-w-0 rounded-xl border bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2.5 text-xs text-muted-foreground">
                <p>
                    {edges.length === 0
                        ? "No prerequisites in this curriculum yet. Click a subject, then Edit prerequisites to add them."
                        : <>Hover or click a subject to see its whole prerequisite chain. <span className="tabular-nums">{edges.length}</span> {edges.length === 1 ? "link" : "links"}.</>}
                </p>
                <p className="flex items-center gap-3" aria-hidden="true">
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" />Needed first</span>
                    <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-500" />Leads to</span>
                </p>
            </div>

            <div className="overflow-x-auto">
                <div ref={innerRef} className="relative inline-flex min-w-full gap-x-10 p-4">
                    <svg aria-hidden="true" className="pointer-events-none absolute left-0 top-0 z-0" width={geometry.width} height={geometry.height}>
                        <defs>
                            {Object.entries(EDGE_COLORS).map(([kind, color]) => (
                                <marker key={kind} id={`flow-arrow-${kind}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                                    <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
                                </marker>
                            ))}
                        </defs>
                        {sortedPaths.map((path) => {
                            const kind = edgeKind(path);
                            const color = kind === "before" || kind === "after" ? EDGE_COLORS[kind] : EDGE_COLORS.idle;
                            return (
                                <path
                                    key={`${path.from}-${path.to}`}
                                    d={path.d}
                                    fill="none"
                                    stroke={color}
                                    strokeWidth={kind === "before" || kind === "after" ? 2.25 : 1.5}
                                    strokeOpacity={kind === "dim" ? 0.15 : kind === "idle" ? 0.7 : 1}
                                    markerEnd={`url(#flow-arrow-${kind === "before" || kind === "after" ? kind : "idle"})`}
                                />
                            );
                        })}
                    </svg>

                    {years.map((group) => (
                        <div key={group.year} className="relative z-10 flex shrink-0 flex-col">
                            <p className="mb-2 border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{YEAR_NAMES[group.year] ?? `Year ${group.year}`}</p>
                            <div className="flex gap-x-10">
                                {group.terms.map((term) => {
                                    const subjects = (term.curriculum_term_subject ?? []).filter((entry) => entry.subject);
                                    const units = subjects.reduce((sum, entry) => sum + (Number(entry.subject.credit_units) || 0), 0);
                                    return (
                                        <div key={term.id} className="w-40 shrink-0">
                                            <p className="mb-2 flex items-center gap-1.5 text-xs">
                                                <SemesterLabel semesterId={term.semester_id} />
                                                <span className="text-muted-foreground">· {units}u</span>
                                            </p>
                                            <ul className="space-y-2">
                                                {subjects.length === 0 && <li className="rounded-md border border-dashed px-2.5 py-3 text-center text-[11px] text-muted-foreground">No subjects</li>}
                                                {subjects.map((entry) => {
                                                    const id = Number(entry.id);
                                                    const role = activeId === null ? null
                                                        : id === activeId ? "active"
                                                        : before.has(id) ? "before"
                                                        : after.has(id) ? "after"
                                                        : "other";
                                                    const standing = yearStandingLabel(Number(entry.required_year_level_id) || 0);
                                                    const needs = (prerequisitesOf.get(id) ?? []).map((from) => nodes.get(from)?.entry.subject.subject_code).filter(Boolean);
                                                    const leadsTo = (dependentsOf.get(id) ?? []).map((to) => nodes.get(to)?.entry.subject.subject_code).filter(Boolean);
                                                    return (
                                                        <li key={id}>
                                                            <button
                                                                type="button"
                                                                ref={(element) => { if (element) cardRefs.current.set(id, element); else cardRefs.current.delete(id); }}
                                                                onMouseEnter={() => setHoveredId(id)}
                                                                onMouseLeave={() => setHoveredId((current) => (current === id ? null : current))}
                                                                onFocus={() => setHoveredId(id)}
                                                                onBlur={() => setHoveredId((current) => (current === id ? null : current))}
                                                                onClick={() => setPinnedId((current) => (current === id ? null : id))}
                                                                aria-pressed={pinnedId === id}
                                                                aria-label={`${entry.subject.subject_code}, ${entry.subject.descriptive_title}. ${needs.length ? `Requires ${needs.join(", ")}.` : "No prerequisite subjects."}${standing ? ` ${standing}.` : ""}${leadsTo.length ? ` Required for ${leadsTo.join(", ")}.` : ""}`}
                                                                className={`block w-full rounded-md border px-2.5 py-1.5 text-left shadow-sm transition-[opacity,background-color,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                                                    role === "active" ? "border-primary bg-card ring-2 ring-primary/40"
                                                                    : role === "before" ? "border-amber-400 bg-amber-50 dark:bg-amber-950"
                                                                    : role === "after" ? "border-sky-400 bg-sky-50 dark:bg-sky-950"
                                                                    : role === "other" ? "bg-card opacity-35"
                                                                    : "bg-card hover:border-foreground/30"}`}
                                                            >
                                                                <span className="flex items-baseline justify-between gap-2">
                                                                    <span className="truncate text-[12px] font-semibold">{entry.subject.subject_code}</span>
                                                                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">{entry.subject.credit_units}u</span>
                                                                </span>
                                                                <span className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{entry.subject.descriptive_title}</span>
                                                                {standing && <span className="mt-1 inline-block rounded bg-muted px-1 text-[10px] text-muted-foreground">{standing}</span>}
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {pinned && (
                <div ref={detailsRef} role="region" aria-label={`Selected subject ${pinned.entry.subject.subject_code}`} className="flex flex-wrap items-start justify-between gap-3 border-t px-4 py-3">
                    <div className="min-w-0 space-y-1 text-sm">
                        <p>
                            <span className="font-semibold">{pinned.entry.subject.subject_code}</span>
                            <span className="text-muted-foreground"> · {pinned.entry.subject.descriptive_title} · {place(pinned.term)}</span>
                        </p>
                        <p className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-500" aria-hidden="true" />
                            <span className="font-medium">Needed first ({pinnedBefore.size}):</span>
                            <span className="text-muted-foreground">{pinnedBefore.size ? codesOf(pinnedBefore).join(", ") : "none"}</span>
                            {Number(pinned.entry.required_year_level_id) > 0 && <span className="rounded bg-muted px-1">{yearStandingLabel(Number(pinned.entry.required_year_level_id))}</span>}
                        </p>
                        <p className="flex flex-wrap items-center gap-1.5 text-xs">
                            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-sky-500" aria-hidden="true" />
                            <span className="font-medium">Leads to ({pinnedAfter.size}):</span>
                            <span className="text-muted-foreground">{pinnedAfter.size ? codesOf(pinnedAfter).join(", ") : "none"}</span>
                        </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                        {onEditPrerequisites && (
                            <Button type="button" size="sm" variant="outline" className="h-8" onClick={(event) => onEditPrerequisites(pinned.entry, pinned.term, event.currentTarget)}>
                                <Pencil aria-hidden="true" />Edit prerequisites
                            </Button>
                        )}
                        <Button type="button" size="sm" variant="ghost" className="h-8 text-xs" onClick={unpin}>
                            <X aria-hidden="true" />Clear <kbd className="ml-1 hidden rounded border px-1 text-[10px] text-muted-foreground sm:inline">Esc</kbd>
                        </Button>
                    </div>
                </div>
            )}
        </section>
    );
}
