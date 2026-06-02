import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import DataTable from "@/Components/ui/dTable";
import { BookOpen, ArrowLeft, BarChart2 } from "lucide-react";
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
import "@/Pages/Guidance/analyticsTransition.css";


export default function FacultySubjects({ auth, faculty, subjects,  schoolYearId}) {
    const [showAnalytics, setShowAnalytics] = React.useState(true);

    // Map backend data for DataTable
    const subjectsWithRating = subjects.map((s) => ({
        ...s,
        mean: s.overall_average ?? "—",
        student_count: s.student_count ?? 0,
    }));

    // Compute overall rating
    const validSubjects = subjectsWithRating.filter((s) => s.overall_average != null);
    const overallRating =
        validSubjects.reduce((sum, s) => sum + s.overall_average, 0) /
        (validSubjects.length || 1);

    const getDescription = (rating) => {
        if (rating >= 4.21) return "Excellent – Always exhibits the quality being rated.";
        if (rating >= 3.41) return "Very Good – Most of the time exhibits the quality being rated.";
        if (rating >= 2.61) return "Good – Sometimes exhibits the quality being rated.";
        if (rating >= 1.81) return "Fair – Seldom exhibits the quality being rated.";
        return "Poor – Rarely exhibits the quality being rated.";
    };

    const overallDescription = overallRating > 0 ? getDescription(overallRating) : "";

    const columns = [
    { accessorKey: "subject_code", header: "Subject Code", colName: "Subject Code" },
    { accessorKey: "descriptive_title", header: "Descriptive Title", colName: "Descriptive Title" },
    { accessorKey: "student_count", header: "Students", colName: "Students" },
    { accessorKey: "mean", header: "Rating", colName: "Rating" },
    {
        id: "actions",
        header: "Actions",
        colName: "Actions",
        cell: ({ row }) => {
    const studentSubjectId = row.original.student_subject_id; // <- this is the correct ID
    const facultyId = faculty.id;

    return (
        <Link
            href={route("vpaa.faculty.evaluation", { facultyId, studentSubjectId, schoolYearId, })}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-1.5 rounded-md hover:bg-green-700 transition text-sm font-medium shadow-sm"
        >
            <BarChart2 className="w-4 h-4" />
            View Evaluation
        </Link>
    );
}

    }
];

    // Graph data
    const graphData = subjectsWithRating.map((s) => {
        const rating = s.overall_average ?? 0;
        return {
            subject: s.subject_code,
            rating,
            students: s.student_count,
            fill: rating < 3 ? "#EF4444" : rating < 4 ? "#F59E0B" : "#10B981",
            description: getDescription(rating),
        };
    });

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div className="p-3 bg-white border border-gray-200 rounded-lg shadow-md dark:bg-gray-800 dark:border-gray-700">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{data.subject}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Rating: {data.rating}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Students: {data.students}</p>
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

                {/* Back Link */}
                <div>
                    <Link
                        href={route("vpaa.faculty.index")}
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
                <CSSTransition
                    in={showAnalytics}
                    timeout={300}
                    classNames="analytics"
                    unmountOnExit
                >
                    <div className="grid grid-cols-1 gap-6 mt-4 md:grid-cols-3">
                        {/* Left: Overall Rating Card */}
                        <div className="flex flex-col items-center justify-center p-6 shadow bg-blue-50 dark:bg-blue-900 rounded-xl">
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-100">Overall Rating</h3>
                            <p className="mt-2 text-4xl font-bold text-blue-600 dark:text-blue-400">
                                {overallRating.toFixed(2)}
                            </p>
                            {overallRating > 0 && (
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{overallDescription}</p>
                            )}
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Across all subjects handled</p>
                        </div>

                        {/* Right: Subject Ratings Graph */}
                        <div className="p-4 bg-white shadow dark:bg-gray-900 rounded-xl md:col-span-2">
                            <h3 className="flex items-center gap-2 mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
                                <BarChart2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                Subject Ratings
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
                                            <LabelList dataKey="rating" position="top" />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </CSSTransition>

                {/* Data Table */}
                <div className="p-6 bg-white border border-gray-200 shadow dark:bg-gray-900 rounded-xl dark:border-gray-700">
                    <DataTable
                        columns={columns}
                        data={subjectsWithRating}
                        searchCol="subject_code"
                        pagination
                        columnsFilter
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
