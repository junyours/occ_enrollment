import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/Components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import {
    Search,
    CheckCircle2,
    XCircle,
    MinusCircle,
    GraduationCap,
    Info,
    User,
    X,
    ChevronUp,
    ArrowUp,
} from "lucide-react";
import axios from "axios";
import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/Components/ui/card";
import GradeRemarkBadge from "@/Components/GradeRemarkBadge";
import { Skeleton } from "@/Components/ui/skeleton";
import { getRandomNumber } from "@/Lib/Utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/Components/ui/tooltip";
import { formatName } from "@/Lib/InfoUtils";
import CopyButton from "@/Components/ui/CopyButton";

// Constants
const SEMESTER_DISPLAY_MAP = {
    First: <div>1<sup>st</sup> Semester</div>,
    Second: <div>2<sup>nd</sup> Semester</div>,
    Summer: "Summer Term",
};

const PASSING_GRADE_THRESHOLD = 3;
const DROPPED_GRADE = 0;

const STAT_CARDS = [
    {
        key: "passed",
        icon: CheckCircle2,
        color: "text-green-600",
        label: "Passed",
    },
    {
        key: "dropped",
        icon: MinusCircle,
        color: "text-amber-600",
        label: "Dropped",
    },
    {
        key: "failed",
        icon: XCircle,
        color: "text-red-600",
        label: "Failed",
    },
    {
        key: "gwa",
        icon: GraduationCap,
        color: "text-indigo-600",
        label: "GWA",
        isGWA: true,
    },
];

// Utility Functions
const calculateSubjectGradeStatus = (grade) => {
    if (grade === null) return "in-progress";
    if (grade === DROPPED_GRADE) return "dropped";
    return grade <= PASSING_GRADE_THRESHOLD ? "passed" : "failed";
};

const calculateStats = (data) => {
    if (!data) return null;

    const stats = {
        total: 0,
        passed: 0,
        failed: 0,
        dropped: 0,
        inProgress: 0,
        totalUnits: 0,
        totalWeighted: 0,
    };

    data.forEach((enrollment) => {
        enrollment.subjects?.forEach((subject) => {
            stats.total++;
            const grade = subject.grade != null ? Number(subject.grade) : null;

            const status = calculateSubjectGradeStatus(grade);

            if (status === "in-progress") {
                stats.inProgress++;
                return;
            }

            if (status === "dropped") {
                stats.dropped++;
                return;
            }

            if (status === "passed") {
                stats.passed++;
            } else {
                stats.failed++;
            }

            // Calculate GWA
            const units = Number(subject.credit_units ?? 0);
            if (units > 0) {
                stats.totalUnits += units;
                stats.totalWeighted += grade * units;
            }
        });
    });

    return {
        ...stats,
        gwa:
            stats.totalUnits > 0
                ? Number((stats.totalWeighted / stats.totalUnits).toFixed(2))
                : null,
    };
};

// Sub-Components
function StatCard({ icon: Icon, color, label, value, isGWA = false }) {
    return (
        <Card className="bg-muted/50">
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <Icon className={`h-5 w-5 ${color} mb-1`} />
                <span className="text-2xl font-bold">{value || "--"}</span>
                <div className="flex items-center gap-1">
                    <p className="text-xs text-muted-foreground uppercase font-semibold">
                        {label}
                    </p>
                    {isGWA && <GWATooltip />}
                </div>
            </CardContent>
        </Card>
    );
}

function GWATooltip() {
    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground hover:text-foreground transition-colors" />
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-sm">
                    <div className="space-y-2">
                        <p className="font-semibold">General Weighted Average (GWA)</p>
                        <p>
                            <strong>Formula:</strong>
                        </p>
                        <code className="block rounded px-2 py-1 text-xs">
                            GWA = Σ(Grade × Units) ÷ Σ(Units)
                        </code>
                        <ul className="list-disc pl-4 space-y-1 text-xs">
                            <li>Only subjects with a final numeric grade are included.</li>
                            <li>Each subject is weighted by its credit units.</li>
                            <li>Failed grades are included in the calculation.</li>
                            <li>Dropped and ungraded subjects are excluded.</li>
                        </ul>
                        <div className="border-t pt-2 text-xs">
                            <strong>Disclaimer:</strong> This GWA is provided for reference
                            only and is <strong>not an official GWA</strong>. The official
                            GWA is determined by the Registrar and may differ due to
                            institutional policies, excluded subjects, or grades that are not
                            yet available.
                        </div>
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

function StatsGrid({ stats }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {STAT_CARDS.map(({ key, icon, color, label, isGWA }) => (
                <StatCard
                    key={key}
                    icon={icon}
                    color={color}
                    label={label}
                    value={stats[key]}
                    isGWA={isGWA}
                />
            ))}
        </div>
    );
}

function SemesterHeader({ schoolYear, semester, isSameYear }) {
    return (
        <div className="flex items-center gap-3">
            <h4 className="font-bold text-sm text-muted-foreground/80 flex items-center gap-2">
                <ArrowUp className="h-4 w-4  flex-shrink-0" />
                {schoolYear && (
                    <>
                        {schoolYear}
                        <span className="text-muted-foreground">•</span>
                    </>
                )}
                {SEMESTER_DISPLAY_MAP[semester]}
            </h4>
            <div className="flex-1 border-b border-dashed" />
        </div>
    );
}

function HighlightedText({ text, query }) {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, "gi"));
    return (
        <>
            {parts.map((part, idx) =>
                part.toLowerCase() === query.toLowerCase() ? (
                    <span key={idx} className="bg-yellow-300/50 dark:bg-yellow-600/40 font-semibold">
                        {part}
                    </span>
                ) : (
                    part
                )
            )}
        </>
    );
}

function GradesTable({ subjects, searchQuery }) {
    return (
        <div className="rounded-md border bg-card">
            <Table>
                <TableBody>
                    {subjects.map(({ descriptive_title, grade }, idx) => (
                        <TableRow key={`${descriptive_title}-${idx}`}>
                            <TableCell className="font-medium text-sm w-96">
                                <HighlightedText text={descriptive_title} query={searchQuery} />
                            </TableCell>
                            <TableCell className="text-center font-bold w-24">
                                {grade || "-"}
                            </TableCell>
                            <TableCell className="text-right w-32">
                                <GradeRemarkBadge midterm={grade} final={grade} />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function SchoolYearGroup({ schoolYear, enrollments, searchQuery }) {
    return (
        <div>
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-0">
                <div className="flex items-center gap-3 border-l-2 border-primary/30 px-2">
                    <h3 className="text-lg font-bold text-primary">{schoolYear}</h3>
                    <div className="flex-1 border-t-2 border-dashed border-foreground/30" />
                </div>
            </div>
            <div className="space-y-6 pl-4 border-l-2 border-primary/30">
                {enrollments.map((enrollment, idx) => (
                    <div key={idx} className="space-y-1">
                        <SemesterHeader
                            schoolYear={null}
                            semester={enrollment.semester}
                            isSameYear={false}
                        />
                        <GradesTable subjects={enrollment.subjects} searchQuery={searchQuery} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function NoGradesFound() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
            <Search className="h-12 w-12 mb-4" />
            <p>No grade records found for this student.</p>
        </div>
    );
}

function StudentInfo({ student }) {
    return (
        <Card className="md:col-span-2 bg-primary text-primary-foreground">
            <CardContent className="p-6 flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                    <User className="h-7 w-7" />
                </div>
                <div>
                    <p className="text-xs font-medium uppercase opacity-70">Student</p>
                    <h2 className="text-xl font-bold uppercase tracking-tight leading-none">
                        {formatName(student)}
                    </h2>
                    <p className="text-sm opacity-80 mt-1 font-mono flex items-center justify-left">
                        <span>{student.user_id_no}</span>
                        <CopyButton className='text-white' text={student.user_id_no} size='xs' />
                    </p>
                </div>
            </CardContent>
        </Card>
    )
}

function StudentInfoSkeleton() {
    return (
        <Card className="md:col-span-2 bg-muted">
            <CardContent className="p-6 flex items-center gap-4">
                <Skeleton className="h-14 w-14 rounded-full" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                </div>
            </CardContent>
        </Card>
    )
}

// Skeleton Components
function StatCardSkeleton({ isGWA = false }) {
    return (
        <Card>
            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                <Skeleton className="h-5 w-5 rounded-full mb-2" />
                <Skeleton className="h-6 w-12 mb-2" />
                <div className="flex items-center gap-1">
                    <Skeleton className="h-3 w-14" />
                    {isGWA && <Skeleton className="h-3.5 w-3.5 rounded-full" />}
                </div>
            </CardContent>
        </Card>
    );
}

function StatsGridSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {STAT_CARDS.map(({ key, isGWA }) => (
                <StatCardSkeleton key={key} isGWA={isGWA} />
            ))}
        </div>
    );
}

function SemesterGradesSkeleton() {
    const gradeRows = Array.from({ length: getRandomNumber(4, 8) });

    return (
        <div className="space-y-1">
            <div className="flex items-center gap-3 mb-2">
                <Skeleton className="h-5 w-48" />
                <div className="flex-1 border-b border-dashed" />
            </div>
            <Card className="border-border shadow-sm rounded-lg overflow-hidden">
                <CardContent className="p-0">
                    <Table>
                        <TableBody>
                            {gradeRows.map((_, idx) => {
                                const randomWidth =
                                    Math.floor(Math.random() * 170) + 150;
                                return (
                                    <TableRow
                                        key={idx}
                                        className="border-border/50 hover:bg-transparent"
                                    >
                                        <TableCell className="py-2">
                                            <Skeleton
                                                className="h-4"
                                                style={{ width: `${randomWidth}px` }}
                                            />
                                        </TableCell>
                                        <TableCell className="py-2 align-middle">
                                            <Skeleton className="h-4 w-8 mx-auto" />
                                        </TableCell>
                                        <TableCell className="py-2 align-middle text-right">
                                            <Skeleton className="h-6 w-20 rounded-full ml-auto" />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

function SearchBarSkeleton() {
    return <Skeleton className="w-full h-10 rounded-md" />;
}

function GradesSkeleton() {
    return (
        <>
            {Array.from({ length: getRandomNumber(5, 8) }).map((_, idx) => (
                <SemesterGradesSkeleton key={`skeleton-${idx}`} />
            ))}
        </>
    );
}

// Main Component
export default function StudentGrades({ studentId }) {
    const [searchQuery, setSearchQuery] = useState("");

    const fetchStudentGrades = async () => {
        try {
            const [gradesRes, studentRes] = await Promise.all([
                axios.post(route("enrollment.student-grades.search"), {
                    id_no: studentId,
                }),
                axios.post(route("student-info", { id: studentId })),
            ]);

            return {
                grades: gradesRes.data.records,
                student: studentRes.data,
            };
        } catch (error) {
            console.error(error?.response?.data?.message || "Error fetching data");
            throw error;
        }
    };

    const { data: { grades, student } = {}, isLoading, isError } = useQuery({
        queryKey: ["enrollment.student-grades.search", studentId],
        queryFn: fetchStudentGrades,
        enabled: !!studentId,
    });

    const stats = useMemo(() => calculateStats(grades), [grades]);

    const filteredData = useMemo(() => {
        if (!grades || !searchQuery.trim()) return grades;

        return grades
            .map((enrollment) => ({
                ...enrollment,
                subjects: enrollment.subjects.filter((subject) =>
                    subject.descriptive_title
                        .toLowerCase()
                        .includes(searchQuery.toLowerCase())
                ),
            }))
            .filter((enrollment) => enrollment.subjects.length > 0);
    }, [grades, searchQuery]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <StudentInfoSkeleton />
                <StatsGridSkeleton />
                <SearchBarSkeleton />
                <GradesSkeleton />
            </div>
        );
    }

    if (isError) {
        return (
            <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                    Failed to fetch grades. Please try again.
                </AlertDescription>
            </Alert>
        );
    }

    if (!grades || grades.length === 0) {
        return <NoGradesFound />;
    }

    // Group enrollments by school year
    const groupedByYear = filteredData.reduce((acc, enrollment) => {
        const year = enrollment.schoolyear;
        if (!acc[year]) {
            acc[year] = [];
        }
        acc[year].push(enrollment);
        return acc;
    }, {});

    const hasResults = Object.keys(groupedByYear).length > 0;

    return (
        <div className="space-y-8">
            {student && <StudentInfo student={student} />}

            <StatsGrid stats={stats} />

            <div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search subjects..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label="Clear search"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {hasResults ? (
                <div className="space-y-8">
                    {Object.entries(groupedByYear).map(([year, enrollments]) => (
                        <SchoolYearGroup
                            key={year}
                            schoolYear={year}
                            enrollments={enrollments}
                            searchQuery={searchQuery}
                        />
                    ))}
                </div>
            ) : searchQuery ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
                    <Search className="h-12 w-12 mb-4" />
                    <p>No subjects found matching "{searchQuery}"</p>
                </div>
            ) : null}
        </div>
    );
}