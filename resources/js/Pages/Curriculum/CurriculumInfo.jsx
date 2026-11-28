import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useForm, usePage } from "@inertiajs/react";
import { AlertCircle, BookOpen, ChevronDown, Layers3, ListChecks, Loader2, Plus, RefreshCw, X } from "lucide-react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Badge } from "@/Components/ui/badge";
import { Button } from "@/Components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/Components/ui/dialog";
import { Label } from "@/Components/ui/label";
import { Switch } from "@/Components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import CurriculumTable from "./CurriculumTable";
import { CurriculumPageSkeleton } from "./CurriculumSkeletons";
import UnitChecksPanel from "./UnitChecksPanel";
import UnitLimitsDialog from "./UnitLimitsDialog";
import { unitChecks } from "./unitLoads";
import { SemesterLabel } from "./semesters";
import { dependentsByEntryId, hasPrerequisites, linkedPrerequisites, termCanHavePrerequisites, yearStandingLabel } from "./prerequisites";

const YEAR_LEVELS = [
    { key: "firstYear", id: 1, label: "First Year" },
    { key: "secondYear", id: 2, label: "Second Year" },
    { key: "thirdYear", id: 3, label: "Third Year" },
    { key: "fourthYear", id: 4, label: "Fourth Year" },
];

const SEMESTERS = { 1: "First Semester", 2: "Second Semester", 3: "Summer" };
const emptyCurriculum = () => Object.fromEntries(YEAR_LEVELS.map(({ key }) => [key, []]));

const summarizeTerms = (terms) => terms.reduce((summary, term) => {
    const subjects = Array.isArray(term.curriculum_term_subject) ? term.curriculum_term_subject : [];
    summary.semesters += 1;
    summary.subjects += subjects.length;
    summary.units += subjects.reduce((units, entry) => {
        const creditUnits = Number(entry.subject?.credit_units ?? 0);
        return units + (Number.isFinite(creditUnits) ? creditUnits : 0);
    }, 0);
    return summary;
}, { semesters: 0, subjects: 0, units: 0 });

// Remember which year sections are open, per curriculum, in this browser only.
// Storage can be unavailable (private mode, blocked site data); fall back to First Year open.
const openYearsKey = () => `curriculum-open-years:${window.location.pathname}`;
const readOpenYears = () => {
    try {
        const saved = JSON.parse(window.localStorage.getItem(openYearsKey()) ?? "null");
        if (saved && typeof saved === "object" && !Array.isArray(saved)) {
            return Object.fromEntries(YEAR_LEVELS.map(({ key }) => [key, saved[key] === true]));
        }
    } catch { /* fall through */ }
    return { firstYear: true };
};
const saveOpenYears = (openYears) => {
    try { window.localStorage.setItem(openYearsKey(), JSON.stringify(openYears)); } catch { /* not critical */ }
};

export default function CurriculumInfo() {
    const { course_name, course_name_abbreviation, years } = usePage().props;
    const { toast } = useToast();
    const [curriculumData, setCurriculumData] = useState(emptyCurriculum);
    const allTerms = Object.values(curriculumData).flat();
    const [fetching, setFetching] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState("");
    const [openYears, setOpenYears] = useState(readOpenYears);
    const [onlyMissing, setOnlyMissing] = useState(false);
    const [focusedId, setFocusedId] = useState(null);
    const [hoveredId, setHoveredId] = useState(null);
    const [unitLimits, setUnitLimits] = useState(null);
    const [programTotals, setProgramTotals] = useState([]);
    const [limitsDialogOpen, setLimitsDialogOpen] = useState(false);
    const limitsOpener = useRef(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState(null);
    const requestSequence = useRef(0);
    const semesterOpener = useRef(null);

    const {
        data: semesterData,
        setData: setSemesterData,
        post: semesterPost,
        processing: semesterProcessing,
        errors: semesterErrors,
        clearErrors: clearSemesterErrors,
    } = useForm({ semester_id: "", year_level_id: "", curr_id: "" });

    useEffect(() => {
        getCurriculumInfo();
        return () => { requestSequence.current += 1; };
    }, []);

    useEffect(() => { saveOpenYears(openYears); }, [openYears]);

    // Escape clears the selected subject (unless a dialog is open; it handles Escape itself).
    useEffect(() => {
        if (focusedId === null) return undefined;
        const onKeyDown = (event) => {
            if (event.key === "Escape" && !document.querySelector("[role=dialog], [role=alertdialog]")) setFocusedId(null);
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [focusedId]);


    async function getCurriculumInfo() {
        const sequence = ++requestSequence.current;
        setRefreshing(true);
        setFetchError("");

        try {
            const response = await axios.post("");
            if (sequence !== requestSequence.current) return;

            const terms = response.data.curriculum?.[0]?.curriculum_term ?? [];
            const grouped = emptyCurriculum();
            YEAR_LEVELS.forEach(({ key, id }) => {
                grouped[key] = terms
                    .filter((term) => Number(term.year_level_id) === id)
                    .sort((a, b) => Number(a.semester_id) - Number(b.semester_id));
            });
            setCurriculumData(grouped);
            setSemesterData("curr_id", response.data.curriculum_id);
            setUnitLimits(response.data.unit_limits ?? null);
            setProgramTotals(response.data.program_totals ?? []);
        } catch (error) {
            if (sequence !== requestSequence.current) return;
            setFetchError("We couldn't load the curriculum. Your last loaded data is still shown below.");
        } finally {
            if (sequence === requestSequence.current) {
                setFetching(false);
                setRefreshing(false);
            }
        }
    }

    const nextSemesterFor = (yearKey) => [1, 2, 3].find((semesterId) =>
        !curriculumData[yearKey].some((term) => Number(term.semester_id) === semesterId)
    );

    const handleOpenSemester = (year, opener) => {
        semesterOpener.current = opener;
        const semesterId = nextSemesterFor(year.key);
        if (!semesterId || !semesterData.curr_id) return;
        clearSemesterErrors();
        setSelectedYear(year);
        setSemesterData({ curr_id: semesterData.curr_id, year_level_id: year.id, semester_id: semesterId });
        setDialogOpen(true);
    };

    const handleAddSemester = (event) => {
        event.preventDefault();
        if (semesterProcessing) return;
        semesterPost(route("add.semester"), {
            preserveScroll: true,
            onSuccess: () => {
                setDialogOpen(false);
                setOpenYears((current) => ({ ...current, [selectedYear.key]: true }));
                toast({ description: "Semester added successfully.", variant: "success" });
                getCurriculumInfo();
            },
            onError: () => {
                toast({ title: "Couldn't add semester", description: "Please review the error and try again.", variant: "destructive" });
            },
        });
    };

    const jumpToYear = (yearKey) => {
        setOpenYears((current) => ({ ...current, [yearKey]: true }));
        requestAnimationFrame(() => {
            document.getElementById(`curriculum-${yearKey}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    };

    // Shaped like the page (and the years the person keeps open), so nothing jumps when it loads.
    if (fetching) return <CurriculumPageSkeleton openYears={openYears} />;

    const summary = summarizeTerms(Object.values(curriculumData).flat());
    const allExpanded = YEAR_LEVELS.every(({ key }) => openYears[key]);

    // Prerequisite progress. First-semester subjects can't have any, so they don't count.
    const termEligible = Object.fromEntries(allTerms.map((term) => [term.id, termCanHavePrerequisites(term, allTerms)]));
    const dependentsById = dependentsByEntryId(allTerms);

    // Highlighting links (direct prerequisites and the subjects that require it):
    // - click selects a subject: it's marked, the rest dims, related years open, a summary bar shows;
    // - hover only colours the hovered subject's links, and only while nothing is selected.
    const entryById = Object.fromEntries(allTerms.flatMap((term) =>
        (term.curriculum_term_subject ?? []).map((entry) => [Number(entry.id), { entry, term }])));
    const linksOf = (id) => ({
        prerequisites: linkedPrerequisites(entryById[id]?.entry).map((p) => entryById[Number(p.required_term_subject_id)]).filter(Boolean),
        dependents: (dependentsById[id] ?? []).map((entry) => entryById[Number(entry.id)]).filter(Boolean),
    });
    const focused = focusedId !== null ? entryById[focusedId] : null;
    const focusedLinks = focused ? linksOf(focusedId) : { prerequisites: [], dependents: [] };
    const activeId = focused ? focusedId : (hoveredId !== null && entryById[hoveredId] ? hoveredId : null);
    const activeLinks = activeId === null ? null : (focused ? focusedLinks : linksOf(activeId));
    const focus = activeLinks ? {
        id: activeId,
        mode: focused ? "select" : "hover",
        prerequisiteIds: new Set(activeLinks.prerequisites.map(({ entry }) => Number(entry.id))),
        dependentIds: new Set(activeLinks.dependents.map(({ entry }) => Number(entry.id))),
    } : null;
    const yearKeyOf = (term) => YEAR_LEVELS.find(({ id }) => id === Number(term.year_level_id))?.key;

    // Unit-load warnings (over the limit, empty semesters, total short or incomplete).
    const checks = unitChecks({ terms: allTerms, limits: unitLimits, programTotals, curriculumId: semesterData.curr_id });
    const jumpToTerm = (term) => {
        const yearKey = yearKeyOf(term);
        if (yearKey) setOpenYears((current) => ({ ...current, [yearKey]: true }));
        requestAnimationFrame(() => {
            document.getElementById(`semester-${term.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        });
    };
    const yearLabel = Array.isArray(years) ? years.join("–") : String(years ?? "");

    const focusEntry = (id) => {
        if (focusedId === id) { setFocusedId(null); return; }
        const target = entryById[id];
        if (!target) return;
        // Open every year that holds a related subject, so nothing highlighted is hidden.
        const { prerequisites, dependents } = linksOf(id);
        const related = [target, ...prerequisites, ...dependents];
        setOpenYears((current) => ({ ...current, ...Object.fromEntries(related.map(({ term }) => [yearKeyOf(term), true]).filter(([key]) => key)) }));
        setFocusedId(id);
    };

    const scrollToEntry = (id) => {
        document.getElementById(`curriculum-entry-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    };
    const termLabel = (term) => `${YEAR_LEVELS.find(({ id }) => id === Number(term.year_level_id))?.label ?? ""}, ${SEMESTERS[term.semester_id] ?? "Semester"}`;
    const eligibleSubjects = allTerms
        .filter((term) => termEligible[term.id])
        .flatMap((term) => (term.curriculum_term_subject ?? []).filter((entry) => entry.subject));
    const withPrerequisites = eligibleSubjects.filter(hasPrerequisites).length;
    const missingPrerequisites = eligibleSubjects.length - withPrerequisites;
    const yearHasMissing = (terms) => terms.some((term) => termEligible[term.id]
        && (term.curriculum_term_subject ?? []).some((entry) => entry.subject && !hasPrerequisites(entry)));

    const toggleOnlyMissing = (checked) => {
        setOnlyMissing(checked);
        // Show every year so nothing that still needs prerequisites is hidden in a collapsed section.
        if (checked) setOpenYears(Object.fromEntries(YEAR_LEVELS.map(({ key }) => [key, true])));
    };

    return (
        <div className={`min-w-0 space-y-5 py-2 sm:py-3 ${focused ? "pb-36" : ""}`}>
            <header className="space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        { label: "Credit units", value: summary.units, icon: BookOpen },
                        { label: "Subjects", value: summary.subjects, icon: BookOpen },
                        { label: "Semesters", value: summary.semesters, icon: Layers3 },
                        {
                            label: "Have prerequisites",
                            value: <>{withPrerequisites}<span className="text-base font-normal text-muted-foreground sm:text-lg"> / {eligibleSubjects.length}</span></>,
                            icon: ListChecks,
                        },
                    ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="rounded-lg bg-muted/50 px-3 py-4 sm:px-5">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xl font-semibold tabular-nums sm:text-2xl">{value}</span>
                                <Icon className="hidden size-4 text-muted-foreground sm:block" aria-hidden="true" />
                            </div>
                            <p className="mt-1 text-[13px] text-muted-foreground sm:text-sm">{label}</p>
                        </div>
                    ))}
                </div>

                <UnitChecksPanel
                    checks={checks}
                    program={course_name_abbreviation}
                    onJumpToTerm={jumpToTerm}
                    onEditLimits={(event) => { limitsOpener.current = event.currentTarget; setLimitsDialogOpen(true); }}
                />

                <nav aria-label="Curriculum year levels" className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                        {YEAR_LEVELS.map(({ key, label }) => (
                            <Button key={key} type="button" variant="outline" size="sm" className="text-[13px]" onClick={() => jumpToYear(key)}>{label}</Button>
                        ))}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <div className="flex items-center gap-2">
                            <Switch id="only-missing-prerequisites" checked={onlyMissing} onCheckedChange={toggleOnlyMissing} disabled={eligibleSubjects.length === 0} />
                            <Label htmlFor="only-missing-prerequisites" className="cursor-pointer text-[13px] font-normal">
                                Only subjects without prerequisites
                                {eligibleSubjects.length > 0 && <span className="ml-1 text-muted-foreground">({missingPrerequisites})</span>}
                            </Label>
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-[13px] text-muted-foreground"
                            onClick={() => setOpenYears(Object.fromEntries(YEAR_LEVELS.map(({ key }) => [key, !allExpanded])))}
                        >
                            {allExpanded ? "Collapse all" : "Expand all"}
                        </Button>
                    </div>
                </nav>
                {onlyMissing && (
                    <p role="status" className="rounded-md bg-muted/60 px-3 py-2 text-sm text-muted-foreground">
                        {missingPrerequisites === 0
                            ? "Every subject that can have prerequisites has at least one. Turn off the filter to see all subjects."
                            : `Showing ${missingPrerequisites} ${missingPrerequisites === 1 ? "subject" : "subjects"} without prerequisites. Many general-education subjects correctly have none.`}
                    </p>
                )}
            </header>

            {fetchError && (
                <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                    <p className="flex min-w-0 items-start gap-2 text-sm"><AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />{fetchError}</p>
                    <Button type="button" variant="outline" size="sm" disabled={refreshing} onClick={getCurriculumInfo}><RefreshCw />Retry</Button>
                </div>
            )}

            <div className="space-y-5">
                {YEAR_LEVELS.map((year) => {
                    const terms = curriculumData[year.key];
                    const yearSummary = summarizeTerms(terms);
                    const expanded = Boolean(openYears[year.key]);
                    const availableSemester = nextSemesterFor(year.key);

                    return (
                        <section key={year.key} id={`curriculum-${year.key}`} className="min-w-0 scroll-mt-20 rounded-xl border bg-card">
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4 sm:px-5">
                                <h2 className="min-w-0 flex-1">
                                    <button
                                        type="button"
                                        className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
                                        aria-expanded={expanded}
                                        aria-controls={`curriculum-${year.key}-content`}
                                        onClick={() => setOpenYears((current) => ({ ...current, [year.key]: !current[year.key] }))}
                                    >
                                        <span className="flex items-center gap-2.5 text-xl font-semibold tracking-tight">
                                            <ChevronDown className={`size-5 shrink-0 text-muted-foreground transition-transform ${expanded ? "" : "-rotate-90"}`} aria-hidden="true" />
                                            {year.label}
                                        </span>
                                        <span className="flex flex-wrap gap-x-3 gap-y-1 text-[13px] font-normal text-muted-foreground">
                                            <span>{yearSummary.semesters} {yearSummary.semesters === 1 ? "semester" : "semesters"}</span>
                                            <span>{yearSummary.subjects} {yearSummary.subjects === 1 ? "subject" : "subjects"}</span>
                                            <span className="font-medium text-foreground">{yearSummary.units} units</span>
                                        </span>
                                    </button>
                                </h2>
                                {availableSemester && (
                                    <Button type="button" variant="ghost" size="sm" className="text-[13px]" disabled={!semesterData.curr_id || refreshing} onClick={(event) => handleOpenSemester(year, event.currentTarget)} aria-label={`Add semester to ${year.label}`}><Plus />Add Semester</Button>
                                )}
                            </div>
                            <div id={`curriculum-${year.key}-content`} hidden={!expanded} className="space-y-4 px-3 pb-3 sm:px-4 sm:pb-4">
                                {onlyMissing && terms.length > 0 && !yearHasMissing(terms) ? (
                                    <p className="rounded-lg bg-muted/30 px-5 py-6 text-center text-sm text-muted-foreground">
                                        {terms.some((term) => termEligible[term.id]) ? `Every subject in ${year.label.toLowerCase()} has prerequisites.` : "First-semester subjects can't have prerequisites."}
                                    </p>
                                ) : terms.length > 0 ? terms.map((term) => (
                                    <CurriculumTable key={term.id} termId={term.id} data={term} yearlevel={year.label} semesterId={term.semester_id} allTerms={allTerms} dependentsById={dependentsById} canHavePrerequisites={termEligible[term.id]} onlyMissing={onlyMissing} unitCheck={checks.perTerm[term.id]} focus={focus} onFocusEntry={focusEntry} onHoverEntry={setHoveredId} getCurriculumInfo={getCurriculumInfo} />
                                )) : (
                                    <div className="rounded-lg bg-muted/30 px-5 py-8 text-center">
                                        <p className="text-sm font-medium">No semesters yet</p>
                                        <p className="mt-1 text-sm text-muted-foreground">Add a semester to start building {year.label.toLowerCase()}.</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>

            <Dialog open={dialogOpen} onOpenChange={(open) => { if (!semesterProcessing) setDialogOpen(open); }}>
                <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); requestAnimationFrame(() => (semesterOpener.current?.isConnected ? semesterOpener.current : document.querySelector(`#curriculum-${selectedYear?.key} h2 button`))?.focus()); }} className="max-h-[90vh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
                    <DialogHeader>
                        <DialogTitle>Add Semester</DialogTitle>
                        <DialogDescription>Add {SEMESTERS[semesterData.semester_id]} to {selectedYear?.label}.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddSemester} className="space-y-5">
                        <div className="rounded-lg bg-muted/50 p-4">
                            <p className="text-sm text-muted-foreground">{selectedYear?.label}</p>
                            <p className="mt-1 font-semibold">{SEMESTERS[semesterData.semester_id]}</p>
                        </div>
                        {Object.keys(semesterErrors).length > 0 && (
                            <div role="alert" className="space-y-1 text-sm text-destructive">
                                {Object.entries(semesterErrors).map(([field, error]) => <p key={field}>{error}</p>)}
                            </div>
                        )}
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" disabled={semesterProcessing} onClick={() => setDialogOpen(false)}>Cancel</Button>
                            <Button type="submit" disabled={semesterProcessing}>{semesterProcessing ? <Loader2 className="animate-spin" /> : <Plus />}{semesterProcessing ? "Adding…" : "Add Semester"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {limitsDialogOpen && (
                <UnitLimitsDialog
                    open
                    curriculumId={semesterData.curr_id}
                    limits={unitLimits}
                    program={course_name_abbreviation}
                    yearLabel={yearLabel}
                    onOpenChange={(open) => { if (!open) setLimitsDialogOpen(false); }}
                    onSaved={getCurriculumInfo}
                    onCloseAutoFocus={(event) => { event.preventDefault(); requestAnimationFrame(() => limitsOpener.current?.focus()); }}
                />
            )}

            {focused && (
                <div role="region" aria-label={`Prerequisite links for ${focused.entry.subject?.subject_code}`} className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl rounded-xl border bg-background/95 p-3 shadow-lg backdrop-blur sm:inset-x-6">
                    <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1 space-y-1.5 text-sm">
                            <p className="truncate">
                                <button type="button" onClick={() => scrollToEntry(focusedId)} className="font-semibold hover:underline">{focused.entry.subject?.subject_code}</button>
                                <span className="text-muted-foreground"> · {focused.entry.subject?.descriptive_title} · {YEAR_LEVELS.find(({ id }) => id === Number(focused.term.year_level_id))?.label} · </span>
                                <SemesterLabel semesterId={focused.term.semester_id} className="align-middle text-xs" />
                            </p>
                            <p className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" aria-hidden="true" />Prerequisites:</span>
                                {focusedLinks.prerequisites.length === 0 && !Number(focused.entry.required_year_level_id) && <span className="text-xs text-muted-foreground">none</span>}
                                {focusedLinks.prerequisites.map(({ entry, term }) => (
                                    <button key={entry.id} type="button" onClick={() => scrollToEntry(entry.id)} title={`${entry.subject?.descriptive_title} · ${termLabel(term)}`} className="rounded bg-amber-500/15 px-1.5 text-xs font-medium hover:bg-amber-500/25">{entry.subject?.subject_code}</button>
                                ))}
                                {Number(focused.entry.required_year_level_id) > 0 && <span className="rounded bg-muted px-1.5 text-xs">{yearStandingLabel(Number(focused.entry.required_year_level_id))}</span>}
                            </p>
                            <p className="flex flex-wrap items-center gap-1.5">
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium"><span className="h-2.5 w-2.5 rounded-sm bg-sky-500" aria-hidden="true" />Required for:</span>
                                {focusedLinks.dependents.length === 0 && <span className="text-xs text-muted-foreground">none</span>}
                                {focusedLinks.dependents.map(({ entry, term }) => (
                                    <button key={entry.id} type="button" onClick={() => scrollToEntry(entry.id)} title={`${entry.subject?.descriptive_title} · ${termLabel(term)}`} className="rounded bg-sky-500/15 px-1.5 text-xs font-medium hover:bg-sky-500/25">{entry.subject?.subject_code}</button>
                                ))}
                            </p>
                        </div>
                        <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0 text-xs" onClick={() => setFocusedId(null)}>
                            <X aria-hidden="true" /> Clear <kbd className="ml-1 hidden rounded border px-1 text-[10px] text-muted-foreground sm:inline">Esc</kbd>
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}

CurriculumInfo.layout = (page) => {
    const { course_name_abbreviation, years } = page.props;
    const schoolYear = Array.isArray(years) ? years.join("–") : years;
    const curriculumTitle = `${course_name_abbreviation} Curriculum`;

    return (
        <AuthenticatedLayout
            stickyContent
            title={`${curriculumTitle} ${schoolYear}`}
            headerContent={
                <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
                    <h1 className="min-w-0 truncate text-sm font-semibold text-foreground md:text-base">{curriculumTitle}</h1>
                    <Badge variant="secondary" className="shrink-0 text-xs font-medium">{schoolYear}</Badge>
                </div>
            }
        >
            {page}
        </AuthenticatedLayout>
    );
};
