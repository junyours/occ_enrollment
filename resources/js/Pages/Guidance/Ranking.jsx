import React, { useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, router } from "@inertiajs/react";

export default function Ranking({
    auth,
    ranking = [],
    schoolYear,
    semester,
    departments = [],
    filters = {},
    hasActiveEval,
}) {
    const [search, setSearch] = useState(filters?.search || "");
    const [department, setDepartment] = useState(filters?.department || "");

    // If NO active evaluation → show message
    if (!hasActiveEval) {
        return (
            <AuthenticatedLayout user={auth.user}>
                <Head title="Faculty Ranking" />
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Faculty Ranking
                    </h1>
                    <div className="p-4 text-center text-yellow-800 bg-yellow-100 border-l-4 border-yellow-400 rounded-md shadow-md">
                        <p className="text-lg font-semibold">No active evaluation yet.</p>
                        <p className="text-sm">
                            Ranking, certificates, and reports will appear once a new evaluation is activated.
                        </p>
                    </div>
                </div>
            </AuthenticatedLayout>
        );
    }

    // ---------------------------
    // Helpers
    // ---------------------------
    const displayRating = (rating) =>
        rating !== null && Number(rating) > 0 ? Number(rating).toFixed(2) : null;

    const getBadgeColor = (rank) => {
        if (rank === 1) return "bg-indigo-200 text-indigo-800";
        if (rank === 2) return "bg-purple-200 text-purple-800";
        if (rank === 3) return "bg-pink-200 text-pink-800";
        return "bg-gray-100 text-gray-600";
    };

    // ---------------------------
    // Valid ranking list (backend already filtered & ranked, but keep UI safe)
    // ---------------------------
    const validRanking = useMemo(() => {
        return ranking
            .filter((f) => f.overall_rating !== null && Number(f.overall_rating) > 0)
            .sort((a, b) => Number(b.overall_rating) - Number(a.overall_rating));
    }, [ranking]);

    // ✅ Top 5 (rating >= 4.00) — and use the REAL rank from backend
    const top5 = useMemo(() => {
        return validRanking.filter((f) => Number(f.overall_rating) >= 4).slice(0, 5);
    }, [validRanking]);

    const handleFilter = (e) => {
        e.preventDefault();
        router.get(
            route("guidance.faculty.ranking"),
            { search, department },
            { preserveState: true }
        );
    };

    const generateCertificate = (faculty) => {
        const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Golden border
        doc.setDrawColor(191, 164, 111);
        doc.setLineWidth(18);
        doc.rect(20, 20, pageWidth - 40, pageHeight - 40);

        doc.setDrawColor(228, 213, 161);
        doc.setLineWidth(6);
        doc.rect(50, 50, pageWidth - 100, pageHeight - 100);

        // Title
        doc.setFont("Times", "bold");
        doc.setFontSize(52);
        doc.setTextColor(191, 164, 111);
        doc.text("Certificate of Excellence", pageWidth / 2, 120, { align: "center" });

        // Rank tag
        const rankBoxWidth = 260;
        const rankBoxHeight = 50;
        const rankBoxY = 150;
        doc.setFillColor(191, 164, 111);
        doc.roundedRect(
            (pageWidth - rankBoxWidth) / 2,
            rankBoxY,
            rankBoxWidth,
            rankBoxHeight,
            12,
            12,
            "F"
        );
        doc.setFontSize(22);
        doc.setTextColor(255, 255, 255);
        doc.text("TOP FACULTY", pageWidth / 2, rankBoxY + 32, { align: "center" });

        // Faculty name
        const fullName = `${faculty.first_name} ${faculty.middle_name || ""} ${faculty.last_name}`.trim();
        doc.setFont("Times", "italic");
        doc.setFontSize(22);
        doc.setTextColor(30, 30, 30);
        doc.text("This certificate is proudly presented to", pageWidth / 2, 220, { align: "center" });

        doc.setFont("Times", "bold");
        doc.setFontSize(44);
        doc.setTextColor(0, 0, 0);
        doc.text(fullName, pageWidth / 2, 280, { align: "center" });

        doc.setFont("Times", "italic");
        doc.setFontSize(22);
        doc.text(`of the ${faculty.department_name || "N/A"} Department`, pageWidth / 2, 320, { align: "center" });

        doc.setFont("Times", "normal");
        doc.setFontSize(20);
        doc.text("for outstanding performance in the Faculty Ranking Program.", pageWidth / 2, 360, { align: "center" });

        const schoolYearText =
            typeof schoolYear === "string"
                ? schoolYear
                : schoolYear?.start_year && schoolYear?.end_year
                    ? `${schoolYear.start_year}-${schoolYear.end_year}`
                    : "N/A";

        doc.setFontSize(18);
        doc.text(
            `School Year: ${schoolYearText}     |     Semester: ${semester || "N/A"}`,
            pageWidth / 2,
            398,
            { align: "center" }
        );

        // Signature lines
        const sigY = pageHeight - 140;
        doc.setLineWidth(1.5);
        doc.setDrawColor(50, 50, 50);
        doc.line(150, sigY, 360, sigY);
        doc.setFontSize(18);
        doc.text("Director / Dean", 255, sigY + 25, { align: "center" });
        doc.line(pageWidth - 360, sigY, pageWidth - 150, sigY);
        doc.text("Coordinator", pageWidth - 255, sigY + 25, { align: "center" });

        doc.save(`${faculty.first_name}_${faculty.last_name}_Certificate.pdf`);
    };

    const schoolYearText =
        typeof schoolYear === "string"
            ? schoolYear
            : schoolYear?.start_year && schoolYear?.end_year
                ? `${schoolYear.start_year}-${schoolYear.end_year}`
                : "N/A";

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Faculty Ranking" />

            <div className="px-6 py-8 mx-auto space-y-8 max-w-7xl">
                {/* Header */}
                <div className="space-y-2 text-center">
                    <h1 className="text-3xl font-extrabold tracking-tight">
                        Faculty Performance Ranking
                    </h1>
                    <p className="text-gray-600">
                        School Year:{" "}
                        <span className="font-semibold">{schoolYearText}</span>{" "}
                        | Semester: <span className="font-semibold">{semester}</span>
                    </p>

                    {/* ✅ New formula transparency */}
                    <div className="max-w-3xl p-3 mx-auto text-sm text-blue-900 border border-blue-200 bg-blue-50 rounded-xl">
                        <p className="font-semibold">Ranking Rule:</p>
                        <p>
                            Ratings are computed using <b>total students handled</b> to avoid unfair results
                            when only a few students respond. Also, a subject is counted only if the
                            <b> response rate is at least 50%</b>.
                        </p>
                    </div>
                </div>

                {/* Optional Filters (if you want to show them) */}
                {(departments?.length > 0 || true) && (
                    <form onSubmit={handleFilter} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                        <div className="flex-1">
                            <label className="block mb-1 text-sm font-medium text-gray-700">Search</label>
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl"
                                placeholder="Search faculty name..."
                            />
                        </div>

                        <div className="w-full sm:w-64">
                            <label className="block mb-1 text-sm font-medium text-gray-700">Department</label>
                            <select
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                                className="w-full px-3 py-2 border rounded-xl"
                            >
                                <option value="">All Departments</option>
                                {departments.map((d) => (
                                    <option key={d.id || d.department_name} value={d.department_name}>
                                        {d.department_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button
                            type="submit"
                            className="px-4 py-2 font-semibold text-white bg-gray-900 rounded-xl hover:bg-gray-800"
                        >
                            Apply
                        </button>
                    </form>
                )}

                {/* Top 5 message */}
                {top5.length === 0 && (
                    <p className="p-4 text-center text-yellow-800 bg-yellow-100 border-l-4 border-yellow-400 rounded-md shadow-md">
                        No faculty met the top overall rating of 4.0 and above.
                    </p>
                )}
                {top5.length > 0 && top5.length < 5 && (
                    <p className="p-4 text-center text-yellow-800 bg-yellow-100 border-l-4 border-yellow-400 rounded-md shadow-md">
                        Only {top5.length} faculty met the top overall rating of 4.0 and above.
                    </p>
                )}

                {/* Top 5 Cards */}
                {top5.length > 0 && (
                    <div>
                        <div className="mb-6 text-center">
                            <h2 className="text-2xl font-semibold text-green-700">
                                🎉 Congratulations to our Top Faculty! 🎉
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
                            {top5.map((f) => {
                                const rank = f.rank ?? null; // ✅ use backend rank
                                const badgeColor = getBadgeColor(rank || 999);
                                const rating = displayRating(f.overall_rating);

                                return (
                                    <div key={f.faculty_id} className="relative p-4 bg-white shadow-lg rounded-2xl">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className={`px-3 py-1 text-sm font-bold rounded-full ${badgeColor}`}>
                                                #{rank ?? "-"}
                                            </span>
                                            {rating && <span className="text-lg font-semibold">{rating}</span>}
                                        </div>

                                        <h3 className="font-medium text-gray-700 text-md">{f.full_name}</h3>
                                        <p className="text-sm text-gray-500">{f.department_name || "N/A"}</p>

                                        {rating && (
                                            <button
                                                type="button"
                                                onClick={() => generateCertificate(f)}
                                                className="absolute text-gray-500 right-4 bottom-4 hover:text-gray-900"
                                                title="Download Certificate"
                                            >
                                                ⬇
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Rankings Table */}
                <div>
                    <h2 className="mt-8 mb-4 text-xl font-semibold">Faculty Rankings</h2>

                    {validRanking.length === 0 && (
                        <p className="p-4 text-center text-yellow-800 bg-yellow-100 border-l-4 border-yellow-400 rounded-md shadow-md">
                            No faculty has a rating above 0 (or no subjects passed the 50% rule).
                        </p>
                    )}

                    {validRanking.length > 0 && (
                        <div className="overflow-x-auto bg-white border shadow-lg rounded-2xl">
                            <table className="min-w-full divide-y">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left">Rank</th>
                                        <th className="px-6 py-3 text-left">Faculty Name</th>
                                        <th className="px-6 py-3 text-left">Department</th>
                                        <th className="px-6 py-3 text-left">Rating</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y">
                                    {validRanking.map((f) => {
                                        const rating = displayRating(f.overall_rating);
                                        return (
                                            <tr key={f.faculty_id}>
                                                <td className="px-6 py-4">{f.rank ?? "-"}</td>
                                                <td className="px-6 py-4">{f.full_name}</td>
                                                <td className="px-6 py-4">{f.department_name}</td>
                                                <td className="px-6 py-4">
                                                    {rating ? (
                                                        <span className="px-3 py-1 bg-gray-100 rounded-full">
                                                            {rating}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
