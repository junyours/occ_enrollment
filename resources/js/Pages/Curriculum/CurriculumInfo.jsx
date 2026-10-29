import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useForm, usePage } from "@inertiajs/react";
import { AlertCircle, BookOpen, ChevronDown, Layers3, Loader2, Plus, RefreshCw } from "lucide-react";
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
import PreLoader from "@/Components/preloader/PreLoader";
import { useToast } from "@/hooks/use-toast";
import CurriculumTable from "./CurriculumTable";

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

export default function CurriculumInfo() {
    const { course_name } = usePage().props;
    const { toast } = useToast();
    const [curriculumData, setCurriculumData] = useState(emptyCurriculum);
    const [fetching, setFetching] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [fetchError, setFetchError] = useState("");
    const [openYears, setOpenYears] = useState({ firstYear: true });
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

    if (fetching) return <PreLoader title="Curriculum" />;

    const summary = summarizeTerms(Object.values(curriculumData).flat());
    const allExpanded = YEAR_LEVELS.every(({ key }) => openYears[key]);

    return (
        <div className="min-w-0 space-y-6 py-2 sm:py-4">
            <header className="space-y-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="min-w-0 text-sm text-muted-foreground">{course_name}</p>
                    {refreshing && <span role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Refreshing…</span>}
                </div>

                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: "Credit units", value: summary.units, icon: BookOpen },
                        { label: "Subjects", value: summary.subjects, icon: BookOpen },
                        { label: "Semesters", value: summary.semesters, icon: Layers3 },
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

                <nav aria-label="Curriculum year levels" className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap gap-2">
                        {YEAR_LEVELS.map(({ key, label }) => (
                            <Button key={key} type="button" variant="outline" size="sm" className="text-[13px]" onClick={() => jumpToYear(key)}>{label}</Button>
                        ))}
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
                </nav>
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
                            <div id={`curriculum-${year.key}-content`} hidden={!expanded} className="space-y-5 px-3 pb-4 sm:px-5 sm:pb-5">
                                {terms.length > 0 ? terms.map((term) => (
                                    <CurriculumTable key={term.id} termId={term.id} data={term} yearlevel={year.label} semesterId={term.semester_id} getCurriculumInfo={getCurriculumInfo} />
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
        </div>
    );
}

CurriculumInfo.layout = (page) => {
    const { course_name_abbreviation, years } = page.props;
    const schoolYear = Array.isArray(years) ? years.join("–") : years;
    const curriculumTitle = `${course_name_abbreviation} Curriculum`;

    return (
        <AuthenticatedLayout
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
