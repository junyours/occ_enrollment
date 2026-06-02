import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import DataTable from "@/Components/ui/dTable";
import { BookOpen, ArrowLeft, BarChart2, CheckCircle2, XCircle } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
    LabelList,
} from "recharts";
import { CSSTransition } from "react-transition-group";
import "./analyticsTransition.css";

export default function FacultySubjects({ auth, faculty, subjects = [], schoolYear, semester }) {
    const [showAnalytics, setShowAnalytics] = React.useState(true);

    // ---------------------------
    // Helpers
    // ---------------------------
    const toNumber = (v) => (v === null || v === undefined ? null : Number(v));

    const displayRating = (v) => {
        const n = toNumber(v);
        return n !== null && !Number.isNaN(n) ? n.toFixed(2) : "—";
    };

    const getDescription = (rating) => {
        if (rating >= 4.21) return "Excellent – Always exhibits the quality being rated.";
        if (rating >= 3.41) return "Very Good – Most of the time exhibits the quality being rated.";
        if (rating >= 2.61) return "Good – Sometimes exhibits the quality being rated.";
        if (rating >= 1.81) return "Fair – Seldom exhibits the quality being rated.";
        return "Poor – Rarely exhibits the quality being rated.";
    };

    // Map backend data for DataTable (NEW FIELDS)
    const subjectsWithStats = subjects.map((s) => ({
        ...s,
        mean: s.overall_average ?? null,
        total_students_handled: s.total_students_handled ?? 0,
        total_respondents: s.total_respondents ?? 0,
        response_rate: s.response_rate ?? 0, // percent already from backend
        is_valid_evaluation: !!s.is_valid_evaluation,
    }));

    // ✅ Overall rating: average of VALID subjects only (same as ranking rule)
    const validSubjects = subjectsWithStats.filter(
        (s) => s.is_valid_evaluation && s.overall_average !== null && Number(s.overall_average) > 0
    );

    const overallRating =
        validSubjects.length > 0
            ? validSubjects.reduce((sum, s) => sum + Number(s.overall_average), 0) / validSubjects.length
            : 0;

    const overallDescription = overallRating > 0 ? getDescription(overallRating) : "";

    // ---------------------------
    // DataTable Columns (UPDATED)
    // ---------------------------
    const columns = [
        { accessorKey: "subject_code", header: "Subject Code", colName: "Subject Code" },
        { accessorKey: "descriptive_title", header: "Descriptive Title", colName: "Descriptive Title" },

        {
            accessorKey: "total_students_handled",
            header: "Handled",
            colName: "Handled",
            cell: ({ row }) => <span className="font-medium">{row.original.total_students_handled ?? 0}</span>,
        },
        {
            accessorKey: "total_respondents",
            header: "Respondents",
            colName: "Respondents",
            cell: ({ row }) => <span className="font-medium">{row.original.total_respondents ?? 0}</span>,
        },
        {
            accessorKey: "response_rate",
            header: "Response Rate",
            colName: "Response Rate",
            cell: ({ row }) => {
                const rr = Number(row.original.response_rate ?? 0);
                return (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${rr >= 50 ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                        {rr.toFixed(2)}%
                    </span>
                );
            },
        },
        {
            accessorKey: "is_valid_evaluation",
            header: "Valid",
            colName: "Valid",
            cell: ({ row }) => {
                const ok = !!row.original.is_valid_evaluation;
                return ok ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-full">
                        <CheckCircle2 className="w-4 h-4" /> Valid
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-full">
                        <XCircle className="w-4 h-4" /> Not valid
                    </span>
                );
            },
        },
        {
            accessorKey: "mean",
            header: "Overall Mean",
            colName: "Overall Mean",
            cell: ({ row }) => (
                <span className="px-3 py-1 bg-gray-100 rounded-full">
                    {displayRating(row.original.overall_average)}
                </span>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            colName: "Actions",
            cell: ({ row }) => {
                const subject = row.original;
                const canView =
                    subject.is_valid_evaluation &&
                    subject.student_subject_id &&
                    subject.overall_average !== null;

                // if (!canView) {
                //     return (
                //         <button
                //             type="button"
                //             disabled
                //             className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium bg-gray-200 text-gray-500 cursor-not-allowed"
                //             title="Not available (needs 50% response rate and valid computed mean)"
                //         >
                //             <BarChart2 className="w-4 h-4" />
                //             View Evaluation
                //         </button>
                //     );
                // }

                return (
                    <Link
                        href={route("guidance.faculty.subject.evaluation", {
                            facultyId: faculty.id,
                            studentSubjectId: subject.student_subject_id,
                        })}
                        className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-1.5 rounded-md hover:bg-green-700 transition text-sm font-medium shadow-sm"
                    >
                        <BarChart2 className="w-4 h-4" />
                        View Evaluation
                    </Link>
                );
            },
        },
    ];

    // ---------------------------
    // Graph data (UPDATED)
    // ---------------------------
    const graphData = subjectsWithStats.map((s) => {
        const rating = s.is_valid_evaluation ? Number(s.overall_average ?? 0) : 0;

        return {
            subject: s.subject_code,
            rating,
            handled: s.total_students_handled ?? 0,
            respondents: s.total_respondents ?? 0,
            responseRate: Number(s.response_rate ?? 0),
            valid: !!s.is_valid_evaluation,
            description: rating > 0 ? getDescription(rating) : "Not valid (needs ≥ 50% response rate).",
            // color is just for tooltip (recharts bar color is controlled differently)
            fill: rating < 3 ? "#EF4444" : rating < 4 ? "#F59E0B" : "#10B981",
        };
    });

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-md dark:bg-gray-800 dark:border-gray-700">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{data.subject}</p>

                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Mean: <span className="font-semibold">{data.valid ? data.rating.toFixed(2) : "—"}</span>
                    </p>

                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Respondents / Handled:{" "}
                        <span className="font-semibold">
                            {data.respondents} / {data.handled}
                        </span>
                    </p>

                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Response Rate: <span className="font-semibold">{data.responseRate.toFixed(2)}%</span>
                    </p>

                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Status:{" "}
                        <span className={`font-semibold ${data.valid ? "text-green-600" : "text-red-600"}`}>
                            {data.valid ? "Valid" : "Not valid"}
                        </span>
                    </p>

                    <p className="text-sm italic text-gray-500 dark:text-gray-400">{data.description}</p>
                </div>
            );
        }
        return null;
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Handled Subjects" />

            <div className="p-6 mx-auto space-y-6 max-w-7xl">
                {/* Header Section */}
                <div className="flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                        Subjects Handled by {faculty.last_name}, {faculty.first_name} {faculty.middle_name ?? ""}
                    </h1>
                </div>

                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Department: <strong>{faculty.department_name ?? "N/A"}</strong>
                </p>

                {schoolYear && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        School Year: <strong>{schoolYear.start_year}-{schoolYear.end_year}</strong> | Semester:{" "}
                        <strong>{semester}</strong>
                    </p>
                )}

                {/* Back Link */}
                <div>
                    <Link
                        href={route("guidance.faculty.index")}
                        className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 transition hover:text-blue-800 hover:underline"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Faculty List
                    </Link>
                </div>

                {/* Toggle Analytics Button */}
                <div className="flex justify-end mt-4">
                    <button
                        onClick={() => setShowAnalytics(!showAnalytics)}
                        className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-white transition bg-blue-600 rounded-full shadow-sm hover:bg-blue-700"
                    >
                        {showAnalytics ? "Hide Analytics" : "Show Analytics"}
                    </button>
                </div>

                {/* Animated Analytics Section */}
                <CSSTransition in={showAnalytics} timeout={300} classNames="analytics" unmountOnExit>
                    <div className="grid grid-cols-1 gap-6 mt-4 md:grid-cols-3">
                        {/* Left: Overall Rating Card */}
                        <div className="flex flex-col items-center justify-center p-6 shadow bg-blue-50 dark:bg-blue-900 rounded-xl">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-100">Overall Rating</h3>

                            <p className="mt-2 text-4xl font-bold text-blue-600 dark:text-blue-400">
                                {overallRating > 0 ? overallRating.toFixed(2) : "—"}
                            </p>

                            {overallRating > 0 && (
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{overallDescription}</p>
                            )}

                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Based only on subjects with ≥ 50% response rate (Valid).
                            </p>

                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Valid subjects: <strong>{validSubjects.length}</strong> / {subjectsWithStats.length}
                            </p>
                        </div>

                        {/* Right: Subject Ratings Graph */}
                        <div className="p-4 bg-white shadow dark:bg-gray-900 rounded-xl md:col-span-2">
                            <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                                <BarChart2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                Subject Overall Means
                            </h3>

                            <div className="w-full h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={graphData} margin={{ top: 10, right: 20, left: -10, bottom: 40 }}>
                                        <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                        <XAxis
                                            dataKey="subject"
                                            stroke="#888"
                                            angle={-30}
                                            textAnchor="end"
                                            interval={0}
                                            height={60}
                                        />
                                        <YAxis domain={[0, 5]} />
                                        <Tooltip content={<CustomTooltip />} />

                                        <Bar dataKey="rating" radius={[6, 6, 0, 0]}>
                                            <LabelList
                                                dataKey="rating"
                                                position="top"
                                                formatter={(v, entry) => (entry?.payload?.valid ? Number(v).toFixed(2) : "")}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Note: Invalid subjects (below 50% response rate) are shown as 0 in the graph but will display “Not valid” in tooltip.
                            </p>
                        </div>
                    </div>
                </CSSTransition>

                {/* Data Table */}
                <div className="p-6 bg-white border border-gray-200 shadow dark:bg-gray-900 rounded-xl dark:border-gray-700">
                    <DataTable
                        columns={columns}
                        data={subjectsWithStats}
                        searchCol="subject_code"
                        pagination
                        columnsFilter
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
