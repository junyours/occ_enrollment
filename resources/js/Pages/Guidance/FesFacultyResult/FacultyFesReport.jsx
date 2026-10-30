import React, { useId, useRef, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Link } from "@inertiajs/react";
import { ArrowRight, CalendarDays, ClipboardList, Search, SearchX, X } from "lucide-react";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { Input } from "@/Components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { cn } from "@/Lib/Utils";

const STATUS_STYLES = {
    active: { label: "Active", badge: "border-emerald-500/25 bg-emerald-500/10", dot: "bg-emerald-500" },
    pending: { label: "Pending", badge: "border-amber-500/25 bg-amber-500/10", dot: "bg-amber-500" },
    closed: { label: "Closed", badge: "border-border bg-muted text-muted-foreground", dot: "bg-muted-foreground/60" },
};

const dateFormatter = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
const getStatus = (item) => String(item.status || "unknown").trim().toLowerCase();
const normalizeSearch = (value) => String(value || "").toLowerCase().replace(/[–—]/g, "-").replace(/\s*-\s*/g, "-").trim();
const semesterLabel = (name) => !name ? "Unspecified semester" : /semester|summer|term/i.test(name) ? name : `${name} Semester`;
const plural = (count, label) => `${count.toLocaleString("en")} ${label}${count === 1 ? "" : "s"}`;

function formatDate(value) {
    if (!value) return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|[T\s])/.exec(String(value));
    if (!match) return String(value);
    const [, year, month, day] = match.map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return String(value);
    return dateFormatter.format(date);
}

function evaluationPeriod(item) {
    const start = formatDate(item.start_date);
    const end = formatDate(item.end_date);
    if (start && end) return start === end ? start : `${start} – ${end}`;
    if (start) return `From ${start}`;
    if (end) return `Until ${end}`;
    return "Dates not set";
}

function EvaluationCard({ item, subjectsRoute }) {
    const status = getStatus(item);
    const appearance = STATUS_STYLES[status];

    return (
        <Link
            href={route(subjectsRoute, { schoolYearId: item.id, semester: item.semester_name })}
            aria-label={`View subjects for ${semesterLabel(item.semester_name)}, school year ${item.school_year}, ${evaluationPeriod(item)}`}
            className="group flex min-w-0 flex-col rounded-xl border bg-card text-card-foreground shadow-sm outline-none transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
        >
            <div className="flex flex-1 flex-col gap-5 p-5">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ClipboardList className="size-5" aria-hidden="true" />
                    </div>
                    <Badge variant="outline" className={cn("gap-1.5 rounded-full font-medium capitalize", appearance?.badge || "bg-muted text-muted-foreground")}>
                        <span className={cn("size-1.5 shrink-0 rounded-full", appearance?.dot || "bg-muted-foreground")} aria-hidden="true" />
                        <span className="sr-only">Evaluation status: </span>
                        {appearance?.label || status}
                    </Badge>
                </div>

                <div className="space-y-1">
                    <h3 className="text-lg font-semibold tracking-tight">{semesterLabel(item.semester_name)}</h3>
                    <p className="text-sm text-muted-foreground">School year {item.school_year}</p>
                </div>

                <div className="mt-auto space-y-2 rounded-lg bg-muted/50 p-3">
                    <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
                        Evaluation period
                    </p>
                    <p className="text-sm leading-relaxed">{evaluationPeriod(item)}</p>
                </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t px-5 py-3.5 text-sm font-medium text-primary transition-colors group-hover:bg-primary/5 motion-reduce:transition-none">
                <span>View subjects</span>
                <ArrowRight className="size-4 shrink-0" aria-hidden="true" />
            </div>
        </Link>
    );
}

export default function FacultyFesReport({ schoolYears = [], subjectsRoute = "fac.facultySubjects" }) {
    const [search, setSearch] = useState("");
    const [semester, setSemester] = useState("all");
    const [status, setStatus] = useState("all");
    const searchRef = useRef(null);
    const controlsId = useId();
    const records = schoolYears || [];
    const semesters = [...new Set(records.map((item) => item.semester_name).filter(Boolean))];
    const statuses = [...new Set(records.map(getStatus))];
    const schoolYearCount = new Set(records.map((item) => item.school_year)).size;
    const activeCount = records.filter((item) => getStatus(item) === "active").length;
    const searchWords = normalizeSearch(search).split(/\s+/).filter(Boolean);
    const hasFilters = searchWords.length > 0 || semester !== "all" || status !== "all";
    const filtered = records.filter((item) => {
        const searchable = normalizeSearch(`${item.school_year} ${semesterLabel(item.semester_name)} ${getStatus(item)} ${item.start_date || ""} ${item.end_date || ""} ${evaluationPeriod(item)}`);
        return searchWords.every((word) => searchable.includes(word))
            && (semester === "all" || item.semester_name === semester)
            && (status === "all" || getStatus(item) === status);
    });
    const grouped = new Map();
    filtered.forEach((item) => {
        const key = item.school_year || "Unspecified school year";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(item);
    });
    const groups = [...grouped.entries()].sort(([a], [b]) => normalizeSearch(b).localeCompare(normalizeSearch(a), "en", { numeric: true }));

    const clearFilters = () => {
        setSearch("");
        setSemester("all");
        setStatus("all");
        searchRef.current?.focus();
    };

    return (
        <AuthenticatedLayout title="Evaluation Results">
            <div className="mx-auto max-w-6xl space-y-6 pb-6 sm:pt-2">
                {/* <section aria-labelledby={`${controlsId}-heading`} className="relative overflow-hidden rounded-2xl border bg-card text-card-foreground">
                    <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-primary/5" aria-hidden="true" />
                    <div className="relative p-5 sm:p-7">
                        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
                            <ClipboardList className="size-4" aria-hidden="true" />
                            Faculty evaluation
                        </div>
                        <h2 id={`${controlsId}-heading`} className="text-2xl font-semibold tracking-tight sm:text-3xl">Evaluation history</h2>
                        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                            Choose a school year and semester to view subjects and evaluation results.
                        </p>

                        <dl className="mt-6 grid grid-cols-3 gap-3 border-t pt-5 sm:max-w-xl sm:gap-8">
                            {[
                                ["Evaluation periods", records.length],
                                ["School years", schoolYearCount],
                                ["Active periods", activeCount],
                            ].map(([label, count]) => (
                                <div key={label} className="flex flex-col gap-1">
                                    <dt className="order-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">{label}</dt>
                                    <dd className="text-xl font-semibold tabular-nums sm:text-2xl">{count.toLocaleString("en")}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section> */}

                {records.length > 0 && (
                    <>
                        {/* <section aria-label="Filter evaluation periods" className="space-y-4">
                            <div className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_11rem_11rem]">
                                <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                                    <label htmlFor={`${controlsId}-search`} className="text-xs font-medium text-muted-foreground">Search evaluations</label>
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-3 size-4 text-muted-foreground" aria-hidden="true" />
                                        <Input
                                            ref={searchRef}
                                            id={`${controlsId}-search`}
                                            type="search"
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Search school year or semester…"
                                            className="h-10 bg-background pl-9 pr-10 [&::-webkit-search-cancel-button]:appearance-none"
                                        />
                                        {search && (
                                            <button type="button" aria-label="Clear search" onClick={() => { setSearch(""); searchRef.current?.focus(); }} className="absolute right-1 top-1 flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                                                <X className="size-4" aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor={`${controlsId}-semester`} className="text-xs font-medium text-muted-foreground">Semester</label>
                                    <Select value={semester} onValueChange={setSemester}>
                                        <SelectTrigger id={`${controlsId}-semester`} className="h-10 bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All semesters</SelectItem>
                                            {semesters.map((name) => <SelectItem key={name} value={name}>{semesterLabel(name)}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor={`${controlsId}-status`} className="text-xs font-medium text-muted-foreground">Evaluation status</label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger id={`${controlsId}-status`} className="h-10 bg-background"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All statuses</SelectItem>
                                            {statuses.map((value) => <SelectItem key={value} value={value}><span className="capitalize">{STATUS_STYLES[value]?.label || value}</span></SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
                                <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-muted-foreground">
                                    {hasFilters ? `Showing ${filtered.length} of ${plural(records.length, "evaluation period")}` : plural(records.length, "evaluation period")}
                                </p>
                                {hasFilters ? (
                                    <Button type="button" variant="ghost" size="sm" onClick={clearFilters}><X aria-hidden="true" />Clear filters</Button>
                                ) : (
                                    <span className="text-xs text-muted-foreground">Newest school years first</span>
                                )}
                            </div>
                        </section> */}
                    </>
                )}

                <div className="space-y-7">
                    {groups.map(([schoolYear, items], groupIndex) => (
                        <section key={schoolYear} aria-labelledby={`${controlsId}-year-${groupIndex}`} className="space-y-3">
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <h2 id={`${controlsId}-year-${groupIndex}`} className="text-base font-semibold tracking-tight sm:text-lg">{schoolYear}</h2>
                                <span className="text-xs text-muted-foreground">{plural(items.length, "evaluation period")}</span>
                                <span className="hidden h-px flex-1 bg-border sm:block" aria-hidden="true" />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {items.map((item) => <EvaluationCard key={JSON.stringify([item.id, item.semester_name, item.start_date, item.end_date, item.status])} item={item} subjectsRoute={subjectsRoute} />)}
                            </div>
                        </section>
                    ))}

                    {groups.length === 0 && (
                        <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-5 py-14 text-center">
                            <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                                {records.length > 0 ? <SearchX className="size-6" aria-hidden="true" /> : <ClipboardList className="size-6" aria-hidden="true" />}
                            </div>
                            <h2 className="text-lg font-semibold">{records.length > 0 ? "No matching evaluation periods" : "No evaluation periods yet"}</h2>
                            <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
                                {records.length > 0 ? "Try a different school year, semester, or status." : "Evaluation periods will appear here when they are created."}
                            </p>
                            {hasFilters && <Button type="button" variant="outline" className="mt-5" onClick={clearFilters}>Clear filters</Button>}
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
