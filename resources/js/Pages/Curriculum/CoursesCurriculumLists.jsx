import React, { useEffect, useId, useRef, useState } from "react";
import axios from "axios";
import { useForm } from "@inertiajs/react";
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, CalendarDays, Check, ChevronDown, ChevronRight, Files, GraduationCap, Loader2, Plus, RefreshCw, Search, Settings2, X } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/Components/ui/dialog";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Skeleton } from "@/Components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/Components/ui/card";

const INITIAL_VERSIONS = 4;
const numericYear = (value) => Number(value) || 0;

function CourseCurriculumCard({ course, onAdd, onManage }) {
    const [expanded, setExpanded] = useState(false);
    const versionsId = useId();
    const abbreviation = course.course_name_abbreviation || "Program";
    const versions = [...(Array.isArray(course.curriculum) ? course.curriculum : [])].sort((a, b) =>
        numericYear(b.school_year_start) - numericYear(a.school_year_start)
        || numericYear(b.school_year_end) - numericYear(a.school_year_end)
        || numericYear(b.id) - numericYear(a.id)
    );
    const visibleVersions = expanded ? versions : versions.slice(0, INITIAL_VERSIONS);

    return (
        <Card className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border-border/80 shadow-sm">
            <div className="space-y-4 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-primary/10 px-3 text-base font-semibold tracking-tight text-primary">
                        {abbreviation}
                    </div>
                    <Badge variant="secondary" className="shrink-0 font-normal">
                        {versions.length} {versions.length === 1 ? "curriculum" : "curricula"}
                    </Badge>
                </div>
                <div className="space-y-1.5">
                    <h3 className="text-lg font-semibold leading-snug tracking-tight">{course.course_name}</h3>
                    {course.major && <p className="text-sm leading-relaxed text-muted-foreground">Major in {course.major}</p>}
                </div>
            </div>

            <div className="flex-1 px-5 pb-5 sm:px-6 sm:pb-6">
                <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Curriculum years</h4>
                    {versions.length > 1 && <span className="text-xs text-muted-foreground">Newest first</span>}
                </div>
                {versions.length === 0 ? (
                    <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-4 py-7 text-center">
                        <BookOpen className="mb-3 h-6 w-6 text-muted-foreground" aria-hidden="true" />
                        <p className="text-sm font-medium">No curricula yet</p>
                        <p className="mt-1 max-w-xs text-sm leading-relaxed text-muted-foreground">Add the first curriculum year for this program.</p>
                    </div>
                ) : (
                    <>
                        <div id={versionsId} className="space-y-1">
                            {visibleVersions.map((curriculum, index) => {
                                const year = `${curriculum.school_year_start}–${curriculum.school_year_end}`;
                                return (
                                    <a
                                        key={curriculum.id}
                                        href={`/curriculum/${encodeURIComponent(course.hashed_course_id)}/${encodeURIComponent(curriculum.school_year_start)}-${encodeURIComponent(curriculum.school_year_end)}`}
                                        aria-label={`Open ${abbreviation} curriculum for ${year}`}
                                        className="group flex min-h-14 items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                                    >
                                        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                                        <span className="min-w-0 flex-1 text-sm font-medium tabular-nums">{year}</span>
                                        {index === 0 && <Badge variant="secondary" className="border-0 bg-primary/10 text-[11px] font-medium text-primary">Latest</Badge>}
                                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden="true" />
                                    </a>
                                );
                            })}
                        </div>
                        {versions.length > INITIAL_VERSIONS && (
                            <Button type="button" variant="ghost" className="mt-2 w-full text-[13px] text-muted-foreground" aria-expanded={expanded} aria-controls={versionsId} onClick={() => setExpanded((current) => !current)}>
                                {expanded ? "Show fewer years" : `Show all ${versions.length} curricula`}
                                <ChevronDown className={`transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden="true" />
                            </Button>
                        )}
                    </>
                )}
            </div>

            <div className="grid grid-cols-1 gap-2 border-t border-border/60 bg-muted/20 px-5 py-4 sm:grid-cols-2 sm:px-6">
                <Button type="button" variant="outline" className="w-full" disabled={versions.length === 0} onClick={(event) => onManage(course, event.currentTarget)} aria-label={`Manage active curriculum for ${abbreviation}`}>
                    <Settings2 aria-hidden="true" />Manage active
                </Button>
                <Button type="button" className="w-full" onClick={(event) => onAdd(course, event.currentTarget)} aria-label={`Add curriculum for ${abbreviation}`}>
                    <Plus aria-hidden="true" />Add Curriculum
                </Button>
            </div>
        </Card>
    );
}


const YEAR_LEVELS = ["First Year", "Second Year", "Third Year", "Fourth Year"];
const sortCurricula = (curricula) => [...curricula].sort((a, b) => Number(b.school_year_start) - Number(a.school_year_start) || Number(b.school_year_end) - Number(a.school_year_end));
const normalizeAssignments = (assignments = {}) => Object.fromEntries(YEAR_LEVELS.map((_, index) => [String(index + 1), assignments[String(index + 1)] == null ? "" : String(assignments[String(index + 1)])]));

export default function CoursesCurriculumLists() {
    const { toast } = useToast();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [listError, setListError] = useState("");
    const [query, setQuery] = useState("");
    const [dialog, setDialog] = useState(null);
    const [activeCurricula, setActiveCurricula] = useState(normalizeAssignments);
    const [curriculumOptions, setCurriculumOptions] = useState([]);
    const [activeLoading, setActiveLoading] = useState(false);
    const [activeError, setActiveError] = useState("");
    const [activeUnconfirmed, setActiveUnconfirmed] = useState(false);
    const [savingYear, setSavingYear] = useState(null);
    const [savedYears, setSavedYears] = useState({});
    const [rowErrors, setRowErrors] = useState({});
    const openerRef = useRef(null);
    const searchRef = useRef(null);
    const activeRequest = useRef(0);
    const savingRef = useRef(false);
    const { data, setData, post, processing, errors, clearErrors } = useForm({
        course_id: "", school_year_start: "", school_year_end: "",
    });

    useEffect(() => {
        const controller = new AbortController();
        loadCourses(controller.signal);
        return () => { controller.abort(); activeRequest.current += 1; };
    }, []);

    async function loadCourses(signal) {
        setLoading(true);
        setListError("");
        try {
            const response = await axios.post(route("courses.curriculum.list"), {}, { signal });
            if (!Array.isArray(response.data)) throw new Error("Invalid curriculum response");
            if (!signal?.aborted) setCourses(response.data);
        } catch {
            if (!signal?.aborted) setListError("We couldn't load your program curricula. Please try again.");
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }

    async function loadActive(course) {
        const request = ++activeRequest.current;
        setActiveLoading(true);
        setActiveError("");
        try {
            const response = await axios.post("/get-course-active-curriculum", { courseId: course.id });
            if (request !== activeRequest.current) return;
            if (!Array.isArray(response.data.curriculums)) throw new Error("Invalid assignments response");
            setActiveCurricula(normalizeAssignments(response.data.active_currs));
            setCurriculumOptions(sortCurricula(response.data.curriculums));
            setActiveUnconfirmed(false);
            setRowErrors({});
        } catch {
            if (request === activeRequest.current) setActiveError("We couldn't load the active assignments. Please try again.");
        } finally {
            if (request === activeRequest.current) setActiveLoading(false);
        }
    }

    function openActive(course, opener) {
        openerRef.current = opener;
        setDialog({ type: "active", course });
        setActiveCurricula(normalizeAssignments());
        setCurriculumOptions([]);
        setSavedYears({});
        setRowErrors({});
        setActiveUnconfirmed(false);
        loadActive(course);
    }

    function openAdd(course, opener) {
        openerRef.current = opener;
        const start = new Date().getFullYear();
        clearErrors();
        setData({ course_id: course.id, school_year_start: String(start), school_year_end: String(start + 1) });
        setDialog({ type: "add", course });
    }

    function closeDialog() {
        if (processing || savingRef.current) return;
        activeRequest.current += 1;
        setDialog(null);
    }

    function restoreFocus(event) {
        event.preventDefault();
        requestAnimationFrame(() => (openerRef.current?.isConnected ? openerRef.current : searchRef.current)?.focus());
    }

    async function setActive(year, value) {
        if (savingRef.current || activeUnconfirmed || !dialog || activeCurricula[year] === value) return;
        const course = dialog.course;
        const option = curriculumOptions.find((curriculum) => String(curriculum.id) === value);
        if (!option) return;
        const previousValue = activeCurricula[year];
        let updateAttempted = false;
        savingRef.current = true;
        setSavingYear(year);
        setSavedYears((current) => ({ ...current, [year]: false }));
        setRowErrors((current) => ({ ...current, [year]: "" }));
        setActiveCurricula((current) => ({ ...current, [year]: value }));
        try {
            // Verify the target year exists before the legacy endpoint clears its previous assignment.
            const info = await axios.post(`/curriculum/${course.hashed_course_id}/${option.school_year_start}-${option.school_year_end}`);
            const terms = info.data.curriculum?.[0]?.curriculum_term;
            if (!Array.isArray(terms) || !terms.some((term) => Number(term.year_level_id) === Number(year))) {
                setActiveCurricula((current) => ({ ...current, [year]: previousValue }));
                setRowErrors((current) => ({ ...current, [year]: `Add ${YEAR_LEVELS[Number(year) - 1].toLowerCase()} semesters to this curriculum before making it active.` }));
                return;
            }
            updateAttempted = true;
            await axios.post("/set-curriculum-term-active", { courseId: course.id, yearLevel: year, curriculumId: value });
            const response = await axios.post("/get-course-active-curriculum", { courseId: course.id });
            if (!Array.isArray(response.data.curriculums)) throw new Error("Could not confirm assignment");
            const confirmed = normalizeAssignments(response.data.active_currs);
            setActiveCurricula(confirmed);
            if (confirmed[year] !== value) {
                setRowErrors((current) => ({ ...current, [year]: "This curriculum was not activated. Review its year-level semesters and try again." }));
                return;
            }
            setSavedYears((current) => ({ ...current, [year]: true }));
        } catch {
            if (updateAttempted) {
                setActiveUnconfirmed(true);
                setActiveError("We couldn't confirm the change. Reload assignments to check the current selection before making another change.");
            } else {
                setActiveCurricula((current) => ({ ...current, [year]: previousValue }));
                setRowErrors((current) => ({ ...current, [year]: "Couldn't check this curriculum. Please try again." }));
            }
        } finally {
            savingRef.current = false;
            setSavingYear(null);
        }
    }

    function changeStartYear(value) {
        clearErrors();
        setData((current) => ({ ...current, school_year_start: value, school_year_end: /^\d{4}$/.test(value) ? String(Number(value) + 1) : "" }));
    }

    const startYear = Number(data.school_year_start);
    const validYear = /^\d{4}$/.test(String(data.school_year_start)) && startYear >= 1900 && startYear <= 2100;
    const duplicateYear = dialog?.type === "add" && (dialog.course.curriculum || []).some((curriculum) => String(curriculum.school_year_start) === String(data.school_year_start) && String(curriculum.school_year_end) === String(data.school_year_end));
    const search = query.trim().toLowerCase();
    const filteredCourses = courses.filter((course) => [course.course_name, course.course_name_abbreviation, course.major].filter(Boolean).join(" ").toLowerCase().includes(search));
    const totalCurricula = courses.reduce((count, course) => count + (course.curriculum?.length || 0), 0);
    const emptyPrograms = courses.filter((course) => !course.curriculum?.length).length;

    function createCurriculum(event) {
        event.preventDefault();
        if (processing || !validYear || duplicateYear) return;
        post(route("curr.schoolyear"), {
            onSuccess: () => {
                setDialog(null);
                toast({ description: "Curriculum created. You can now add its semesters and subjects.", variant: "success" });
            },
        });
    }

    return (
        <div className="min-w-0 space-y-6 py-2 sm:py-4">
            <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl space-y-2">
                    <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Curriculum library</h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">Browse curricula by program, create a new curriculum year, and manage active assignments.</p>
                </div>
                <Button type="button" variant="outline" disabled={loading} onClick={() => loadCourses()}><RefreshCw className={loading ? "animate-spin" : ""} aria-hidden="true" />Refresh</Button>
            </header>

            <div className="grid grid-cols-3 gap-3 sm:gap-4">
                {[{ label: "Programs", value: courses.length, icon: GraduationCap }, { label: "Curricula", value: totalCurricula, icon: Files }, { label: "Without curricula", value: emptyPrograms, icon: BookOpen }].map(({ label, value, icon: Icon }) => (
                    <div key={label} className="rounded-xl bg-muted/50 p-3 sm:p-5">
                        <div className="flex items-center justify-between gap-2"><span className="text-2xl font-semibold tabular-nums">{loading ? "—" : value}</span><Icon className="hidden h-5 w-5 text-muted-foreground sm:block" aria-hidden="true" /></div>
                        <p className="mt-1 text-[13px] leading-snug text-muted-foreground sm:text-sm">{label}</p>
                    </div>
                ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative w-full sm:max-w-sm">
                    <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    <Input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search programs" placeholder="Search programs or majors…" className="h-10 pl-9 pr-10" />
                    {query && <Button type="button" variant="ghost" size="icon" aria-label="Clear program search" className="absolute right-0.5 top-0.5 h-9 w-9" onClick={() => { setQuery(""); searchRef.current?.focus(); }}><X aria-hidden="true" /></Button>}
                </div>
                {!loading && <p role="status" className="text-sm text-muted-foreground">{filteredCourses.length} of {courses.length} {courses.length === 1 ? "program" : "programs"}</p>}
            </div>

            {listError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-500/30 bg-red-500/5 p-4"><p className="flex items-start gap-2 text-sm"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />{listError}</p><Button type="button" variant="outline" onClick={() => loadCourses()}>Try again</Button></div>}

            {loading ? (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2" role="status" aria-label="Loading curricula">
                    {[0, 1].map((key) => <div key={key} className="space-y-5 rounded-xl border p-6"><Skeleton className="h-11 w-20" /><Skeleton className="h-6 w-4/5" /><div className="space-y-3">{[0, 1, 2].map((row) => <Skeleton key={row} className="h-12 w-full" />)}</div><Skeleton className="h-10 w-full" /></div>)}
                </div>
            ) : courses.length === 0 && !listError ? (
                <div className="flex flex-col items-center rounded-xl border border-dashed bg-muted/20 px-6 py-16 text-center"><GraduationCap className="mb-4 h-9 w-9 text-muted-foreground" aria-hidden="true" /><h3 className="text-lg font-semibold">No programs available</h3><p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Programs assigned to your department will appear here.</p></div>
            ) : filteredCourses.length === 0 && !listError ? (
                <div className="rounded-xl border border-dashed px-6 py-12 text-center"><Search className="mx-auto mb-3 h-7 w-7 text-muted-foreground" aria-hidden="true" /><h3 className="font-semibold">No matching programs</h3><p className="mt-2 text-sm text-muted-foreground">Try a program name, abbreviation, or major.</p><Button type="button" variant="outline" className="mt-5" onClick={() => { setQuery(""); searchRef.current?.focus(); }}>Clear search</Button></div>
            ) : (
                <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">{filteredCourses.map((course) => <CourseCurriculumCard key={course.id} course={course} onAdd={openAdd} onManage={openActive} />)}</div>
            )}

            <Dialog open={Boolean(dialog)} onOpenChange={(open) => { if (!open) closeDialog(); }}>
                <DialogContent onCloseAutoFocus={restoreFocus} className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-xl sm:max-w-lg">
                    <DialogHeader>
                        <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{dialog?.type === "active" ? <Settings2 className="h-5 w-5" aria-hidden="true" /> : <Plus className="h-5 w-5" aria-hidden="true" />}</div>
                        <DialogTitle>{dialog?.type === "active" ? "Active curriculum" : "Add curriculum"}</DialogTitle>
                        <DialogDescription>{dialog?.course.course_name}{dialog?.course.major && ` · ${dialog.course.major}`}</DialogDescription>
                    </DialogHeader>
                    {dialog?.type === "active" ? (
                        <div className="space-y-5">
                            <p className="text-sm leading-relaxed text-muted-foreground">Choose the curriculum used when creating new classes for each year level. Changes save immediately.</p>
                            {activeError && <div role="alert" className="space-y-3 rounded-lg border border-red-500/30 bg-red-500/5 p-3"><p className="text-sm text-red-700 dark:text-red-300">{activeError}</p><Button type="button" variant="outline" disabled={activeLoading || savingYear !== null} onClick={() => loadActive(dialog.course)}><RefreshCw className={activeLoading ? "animate-spin" : ""} aria-hidden="true" />Reload assignments</Button></div>}
                            {activeLoading ? (
                                <div className="space-y-3" role="status" aria-label="Loading active assignments">{YEAR_LEVELS.map((year) => <Skeleton key={year} className="h-20 w-full" />)}</div>
                            ) : (!activeError || curriculumOptions.length > 0) && (
                                <div className="space-y-3">
                                    {YEAR_LEVELS.map((year, index) => {
                                        const id = String(index + 1);
                                        return (
                                            <div key={id} className="rounded-lg border border-border/70 p-3 sm:p-4">
                                                <div className="flex flex-wrap items-center justify-between gap-3">
                                                    <Label htmlFor={`active-curriculum-year-${id}`} className="text-sm font-medium">{year}</Label>
                                                    <Select value={activeCurricula[id] || ""} disabled={savingYear !== null || activeUnconfirmed || curriculumOptions.length === 0} onValueChange={(value) => setActive(id, value)}>
                                                        <SelectTrigger id={`active-curriculum-year-${id}`} className="w-40" aria-describedby={rowErrors[id] ? `active-year-${id}-error` : undefined} aria-invalid={Boolean(rowErrors[id])}><SelectValue placeholder="Not assigned" /></SelectTrigger>
                                                        <SelectContent>{curriculumOptions.map((curriculum) => <SelectItem key={curriculum.id} value={String(curriculum.id)}>{curriculum.school_year_start}–{curriculum.school_year_end}</SelectItem>)}</SelectContent>
                                                    </Select>
                                                </div>
                                                {savingYear === id ? <p role="status" className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Checking and saving…</p> : rowErrors[id] ? <p id={`active-year-${id}-error`} role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{rowErrors[id]}</p> : savedYears[id] && <p role="status" className="mt-2 flex items-center gap-1 text-xs text-emerald-700 dark:text-emerald-400"><Check className="h-3.5 w-3.5" aria-hidden="true" />Saved</p>}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <DialogFooter><Button type="button" disabled={savingYear !== null} onClick={closeDialog}>Done</Button></DialogFooter>
                        </div>
                    ) : dialog?.type === "add" && (
                        <form onSubmit={createCurriculum} className="space-y-5">
                            <p className="text-sm leading-relaxed text-muted-foreground">Create a curriculum year for <strong className="font-medium text-foreground">{dialog.course.course_name_abbreviation}</strong>. You can add semesters and subjects after creation.</p>
                            <div className="rounded-lg border bg-muted/30 p-4">
                                <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                                    <div className="space-y-2"><Label htmlFor="curriculum-start-year">Starting year</Label><Input id="curriculum-start-year" name="school_year_start" type="number" inputMode="numeric" min={1900} max={2100} step={1} value={data.school_year_start} onChange={(event) => changeStartYear(event.target.value)} disabled={processing} required className="h-11 text-center text-lg font-medium tabular-nums" aria-invalid={Boolean(errors.school_year || errors.school_year_start || duplicateYear)} aria-describedby="curriculum-year-guidance" /></div>
                                    <ArrowRight className="mb-3 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                    <div className="space-y-2"><span id="curriculum-end-year-label" className="text-sm font-medium">Ending year</span><output aria-labelledby="curriculum-end-year-label" className="flex h-11 items-center justify-center rounded-md border bg-background text-lg font-medium tabular-nums">{data.school_year_end || "—"}</output></div>
                                </div>
                                <div className="mt-4 flex items-center justify-between gap-2"><Button type="button" variant="ghost" size="sm" disabled={processing || !validYear || startYear <= 1900} onClick={() => changeStartYear(String(startYear - 1))} aria-label="Previous starting year"><ArrowLeft aria-hidden="true" />Previous</Button><Button type="button" variant="ghost" size="sm" disabled={processing || !validYear || startYear >= 2100} onClick={() => changeStartYear(String(startYear + 1))} aria-label="Next starting year">Next<ArrowRight aria-hidden="true" /></Button></div>
                            </div>
                            <p id="curriculum-year-guidance" className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />The ending year is calculated automatically from the starting year.</p>
                            {duplicateYear && <p role="alert" className="text-sm text-amber-800 dark:text-amber-300">This curriculum year already exists. Open it from the program card.</p>}
                            {Object.entries(errors).map(([name, message]) => <p key={name} role="alert" className="text-sm text-red-700 dark:text-red-300">{message}</p>)}
                            <DialogFooter className="gap-2 sm:gap-0"><Button type="button" variant="outline" disabled={processing} onClick={closeDialog}>Cancel</Button><Button type="submit" disabled={processing || !validYear || duplicateYear}>{processing ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}{processing ? "Creating…" : "Create curriculum"}</Button></DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

CoursesCurriculumLists.layout = (page) => <AuthenticatedLayout title="Curricula">{page}</AuthenticatedLayout>;
