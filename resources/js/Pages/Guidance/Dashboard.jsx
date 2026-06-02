import React, { useState, useMemo } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/Components/ui/card";
import { PageTitle } from "@/Components/ui/PageTitle";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LabelList,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

export default function Dashboard({
    auth,
    schoolYear,
    activeEval, // Pass this from backend, corresponds to $activeEval
    totalEnrolled,
    facultyCount,
    submittedCount,
    unsubmittedCount,
    reports,
    departmentStats,
    title,
}) {
    const [flip, setFlip] = useState(false);

    const hasActiveEvaluation = !!activeEval;

    // Charts data
    const barChartData = useMemo(() => {
        if (!hasActiveEvaluation || !reports?.all) return [];
        return reports.all
            .filter((f) => f.overall_rating !== null)
            .sort((a, b) => b.overall_rating - a.overall_rating)
            .map((f) => ({ name: f.full_name, rating: f.overall_rating }));
    }, [reports, hasActiveEvaluation]);

    const departmentChartData = useMemo(() => {
        if (!hasActiveEvaluation || !departmentStats) return [];
        return departmentStats.map((dept) => ({
            department: dept.department,
            Pending: dept.pending_percentage,
            Completed: dept.completed_percentage,
        }));
    }, [departmentStats, hasActiveEvaluation]);

    const overallPieData = useMemo(() => {
        if (!hasActiveEvaluation) return [];
        const submitted = Number(submittedCount) || 0;
        const unsubmitted = Number(unsubmittedCount) || 0;
        return [
            { name: "Completed", value: submitted },
            { name: "Pending", value: unsubmitted },
        ];
    }, [submittedCount, unsubmittedCount, hasActiveEvaluation]);

    const COLORS = ["#22c55e", "#ef4444"]; // green = completed, red = pending

    const topFaculty = reports?.top5?.[0];
    const lowestFaculty = reports?.all
        ?.filter(f => f.overall_rating !== null)
        ?.reduce((min, f) => (min === null || f.overall_rating < min.overall_rating ? f : min), null);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={title} />

            <div className="px-6 py-10 mx-auto space-y-10 max-w-7xl">
                {/* PAGE HEADER */}
                 <div className="space-y-2 text-center">
                    <PageTitle align="center">
                        {schoolYear
                            ? `${schoolYear.start_year}-${schoolYear.end_year} ${schoolYear.semester.semester_name} Semester`
                            : "No Active School Year"}
                    </PageTitle>
                </div>

                {/* STATISTICS CARDS */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <Card className="transition border border-gray-100 shadow-lg rounded-2xl hover:shadow-xl">
                        <CardHeader className="pb-1">
                            <CardTitle className="flex items-center gap-2 text-gray-700">
                                Total Enrolled
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link
                                href={route("guidance.student.index")}
                                className="text-4xl font-extrabold text-blue-600 hover:text-blue-800"
                            >
                                {totalEnrolled}
                            </Link>
                            <p className="mt-1 text-sm text-gray-500">Students enrolled</p>
                        </CardContent>
                    </Card>

                    <Card className="transition border border-gray-100 shadow-lg rounded-2xl hover:shadow-xl">
                        <CardHeader className="pb-1">
                            <CardTitle className="flex items-center gap-2 text-gray-700">
                                Total Faculty
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link
                                href={route("guidance.faculty.index")}
                                className="text-4xl font-extrabold text-blue-600 hover:text-blue-800"
                            >
                                {facultyCount}
                            </Link>
                            <p className="mt-1 text-sm text-gray-500">Faculty Members</p>
                        </CardContent>
                    </Card>

                    <Card className="transition border border-gray-100 shadow-lg rounded-2xl hover:shadow-xl">
                        <CardHeader className="pb-1">
                            <CardTitle className="flex items-center gap-2 text-gray-700">
                                Unsubmitted Evaluation
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link
                                href={route("guidance.student.index")}
                                className="text-4xl font-extrabold text-red-600"
                            >
                                {unsubmittedCount}
                            </Link>
                            <p className="mt-1 text-sm text-gray-500">Students pending submission</p>
                        </CardContent>
                    </Card>

                    <Card className="transition border border-gray-100 shadow-lg rounded-2xl hover:shadow-xl">
                        <CardHeader className="pb-1">
                            <CardTitle className="flex items-center gap-2 text-gray-700">
                                Submitted Evaluation
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link
                                href={route("guidance.student.index")}
                                className="text-4xl font-extrabold text-green-600"
                            >
                                {submittedCount}
                            </Link>
                            <p className="mt-1 text-sm text-gray-500">Students completed submission</p>
                        </CardContent>
                    </Card>
                </div>

                {!hasActiveEvaluation ? (
                    <p className="mt-10 text-center text-gray-500">
                        No active evaluation yet. Charts and rankings will appear once evaluations are submitted.
                    </p>
                ) : (
                    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                        {/* Flippable Top 5 */}
                        <div
                            className="relative w-full cursor-pointer"
                            style={{ perspective: 1000 }}
                            onClick={() => setFlip(!flip)}
                        >
                            <div
                                className="relative w-full transition-transform duration-700"
                                style={{
                                    transformStyle: "preserve-3d",
                                    transform: flip ? "rotateY(180deg)" : "rotateY(0deg)",
                                }}
                            >
                                {/* FRONT */}
                                <Card
                                    className="w-full bg-white border border-gray-100 shadow-lg rounded-2xl"
                                    style={{ backfaceVisibility: "hidden", position: "relative" }}
                                >
                                    <CardHeader>
                                        <CardTitle className="text-lg font-semibold text-gray-800">
                                            Top 5 Faculty (Overall Rating)
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>

                                        {reports?.top5?.length ? (
                                            <table className="w-full mt-2 text-sm">
                                                <thead>
                                                    <tr className="border-b bg-gray-50">
                                                        <th className="p-2 text-left">Rank</th>
                                                        <th className="p-2 text-left">Faculty</th>
                                                        <th className="p-2 text-left">Rating</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                     {reports.top5.filter(f => f.overall_rating >= 4).length < 5 && (
                                                        <p className="mt-2 text-sm text-gray-500">
                                                            Only {reports.top5.filter(f => f.overall_rating >= 4).length} faculty met the top rating of 4 and above.
                                                        </p>
                                                    )}
                                                    {reports.top5
                                                        .filter((f) => f.overall_rating >= 4) // <-- Only include rating 4.0 and above
                                                        .slice(0, 5) // Just in case more than 5 pass the filter
                                                        .map((f, i) => (
                                                            <tr key={f.id} className="transition border-b hover:bg-gray-50">
                                                                <td className="p-2 font-bold text-blue-600">#{i + 1}</td>
                                                                <td className="p-2">{f.full_name}</td>
                                                                <td className="p-2 font-semibold">{f.overall_rating}</td>
                                                            </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <p className="text-gray-500">No ratings available.</p>
                                        )}

                                        <div className="pt-3 text-right">
                                            <div className="flex items-center justify-between mt-4 text-xs italic text-gray-500">
                                                <span>Click to flip back</span>
                                                <Link
                                                    href={route("guidance.faculty.ranking")}
                                                    className="text-sm font-medium text-blue-600 underline hover:text-blue-800"
                                                >
                                                    View complete rankings →
                                                </Link>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* BACK */}
                               <Card
                                    className="absolute top-0 left-0 w-full border border-gray-100 shadow-lg rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100"
                                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                                >
                                    <CardHeader>
                                        <CardTitle className="text-lg font-semibold text-gray-800">
                                            Faculty Insights
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3 text-sm text-gray-700">
                                        {reports?.top5?.length ? (
                                            <>
                                                {/* Get top faculty with rating >= 4 */}
                                                {(() => {
                                                    const topRatedFaculty = reports.top5
                                                        .filter((f) => f.overall_rating >= 4)
                                                        .sort((a, b) => b.overall_rating - a.overall_rating)[0];

                                                    const lowestRatedFaculty = reports.top5
                                                        .sort((a, b) => a.overall_rating - b.overall_rating)[0];

                                                    if (!topRatedFaculty) {
                                                        return <p>No faculty met the top rating of 4 and above.</p>;
                                                    }

                                                    return (
                                                        <>
                                                            <p className="leading-relaxed">
                                                                In the school year <strong>{activeEval.start_year}-{activeEval.end_year}</strong> ({activeEval.semester_name}), student assessments recognized <strong>{topRatedFaculty.full_name}</strong> with the highest rating of <strong>{topRatedFaculty.overall_rating}</strong>.
                                                            </p>
                                                            <p className="leading-relaxed">
                                                                On the other hand, <strong>{lowestRatedFaculty.full_name}</strong> needed improvement in teaching strategies. Insights guide our commitment to excellence.
                                                            </p>
                                                        </>
                                                    );
                                                })()}
                                            </>
                                        ) : (
                                            <p>No insights available.</p>
                                        )}
                                    </CardContent>
                                </Card>

                            </div>
                        </div>

                        {/* Faculty Rating Distribution */}
                        <Card className="border border-gray-100 shadow-lg rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold text-gray-700">
                                    Faculty Rating Distribution
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[340px]">
                                {barChartData.length === 0 ? (
                                    <p className="text-sm text-gray-500">No faculty ratings available.</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={barChartData}
                                            layout="vertical"
                                            margin={{ top: 10, left: 40, right: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11 }} />
                                            <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                                            <Tooltip contentStyle={{ fontSize: "12px" }} />
                                            <Bar dataKey="rating" fill="#3b82f6" barSize={18}>
                                                <LabelList dataKey="rating" position="right" style={{ fontSize: "11px" }} />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Department Completion */}
                        <Card className="border border-gray-100 shadow-lg rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold text-gray-700">
                                    Evaluation Completion by Department (%)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[340px]">
                                {departmentChartData.length === 0 ? (
                                    <p className="text-sm text-gray-500">No data available.</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={departmentChartData}
                                            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="department" tick={{ fontSize: 12 }} />
                                            <YAxis unit="%" tick={{ fontSize: 12 }} />
                                            <Tooltip />
                                            <Bar dataKey="Pending" fill="#ef4444" barSize={20} />
                                            <Bar dataKey="Completed" fill="#22c55e" barSize={20} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>

                        {/* Overall Pie */}
                        <Card className="relative border border-gray-100 shadow-lg rounded-2xl">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold text-gray-700">
                                    Overall Evaluation Completion
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="h-[340px] flex items-center justify-center relative">
                                {overallPieData.length === 0 ? (
                                    <p className="text-sm text-gray-500">No data available.</p>
                                ) : (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={overallPieData}
                                                dataKey="value"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                fill="#8884d8"
                                                label={({ name, value }) => {
                                                    const totalStudents = totalEnrolled || 1;
                                                    const percentage = ((value / totalStudents) * 100).toFixed(2);
                                                    return `${name}: ${percentage}%`;
                                                }}
                                            >
                                                {overallPieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(value) => `${value} students`} />
                                            <Legend verticalAlign="bottom" height={36} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
