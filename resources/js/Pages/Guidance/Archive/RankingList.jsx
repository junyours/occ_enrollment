import React, { useState } from "react";
import { jsPDF } from "jspdf";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";

export default function RankingList({
    auth,
    ranking = [],
    schoolYear,
    semester,
    hasArchive = false,
}) {



    // ---------------------------
    // Top 5
    // ---------------------------
    const top5 = ranking.slice(0, 5).filter((f) => f.overall_rating > 4);

    const getBadgeColor = (rank) => {
        if (rank === 1) return "bg-indigo-200 text-indigo-800";
        if (rank === 2) return "bg-purple-200 text-purple-800";
        if (rank === 3) return "bg-pink-200 text-pink-800";
        return "bg-gray-100 text-gray-600";
    };

    const displayRating = (rating) => (rating !== null && rating > 0 ? rating : null);

    // ---------------------------
    // CERTIFICATE GENERATION
    // ---------------------------
    const generateCertificate = (faculty) => {
        const doc = new jsPDF({
            orientation: "landscape",
            unit: "pt",
            format: "a4",
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Border
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

        // Badge
        const rankBoxWidth = 240;
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
        doc.text("TOP 5 FACULTY", pageWidth / 2, rankBoxY + 32, { align: "center" });

        // Faculty Name
        const fullName = `${faculty.first_name} ${faculty.middle_name || ""} ${faculty.last_name}`.trim();

        doc.setFont("Times", "italic");
        doc.setFontSize(22);
        doc.setTextColor(30, 30, 30);
        doc.text("This certificate is proudly presented to", pageWidth / 2, 220, {
            align: "center",
        });

        doc.setFont("Times", "bold");
        doc.setFontSize(44);
        doc.setTextColor(0, 0, 0);
        doc.text(fullName, pageWidth / 2, 280, { align: "center" });

        doc.setFont("Times", "italic");
        doc.setFontSize(22);
        doc.text(
            `of the ${faculty.department_name || "N/A"} Department`,
            pageWidth / 2,
            320,
            { align: "center" }
        );

        doc.setFont("Times", "normal");
        doc.setFontSize(20);
        doc.text(
            "for outstanding performance in the Faculty Ranking Program.",
            pageWidth / 2,
            360,
            { align: "center" }
        );

        // School Year Text (archive sends string)
        const schoolYearText =
            typeof schoolYear === "string"
                ? schoolYear
                : `${schoolYear.start_year}-${schoolYear.end_year}`;

        doc.setFontSize(18);
        doc.text(
            `School Year: ${schoolYearText}     |     Semester: ${semester}`,
            pageWidth / 2,
            398,
            { align: "center" }
        );

        // Signature Lines
        const sigY = pageHeight - 140;
        doc.setLineWidth(1.5);
        doc.line(150, sigY, 360, sigY);
        doc.setFontSize(18);
        doc.text("Director / Dean", 255, sigY + 25, { align: "center" });

        doc.line(pageWidth - 360, sigY, pageWidth - 150, sigY);
        doc.text("Coordinator", pageWidth - 255, sigY + 25, { align: "center" });

        doc.save(`${faculty.first_name}_${faculty.last_name}_Certificate.pdf`);
    };

    // ---------------------------
    // MAIN PAGE
    // ---------------------------

    const schoolYearText =
        typeof schoolYear === "string"
            ? schoolYear
            : `${schoolYear.start_year}-${schoolYear.end_year}`;

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
                        | Semester:{" "}
                        <span className="font-semibold">{semester}</span>
                    </p>
                </div>

                 {top5.length === 0 ? (
                    <p className="p-4 text-center text-yellow-800 bg-yellow-100 border-l-4 border-yellow-400 rounded-md shadow-md">
                        No faculty met the top overall rating of 4.0 and above.
                    </p>
                ) : top5.length > 1 || top5.length < 5 ? (
                    <p className="p-4 text-center text-yellow-800 bg-yellow-100 border-l-4 border-yellow-400 rounded-md shadow-md">
                        Only {top5.length} faculty met the top overall rating of 4.0 and above.
                    </p>
                ) : null}



                {/* Top 5 Cards */}
                {top5.length > 0 && (
                    <div>
                        <h2 className="mb-6 text-2xl font-semibold text-center text-green-700">
                            🎉 Congratulations to our Top 5 Faculty! 🎉
                        </h2>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
                            {top5.map((f, idx) => {
                                const rank = idx + 1;
                                const badgeColor = getBadgeColor(rank);
                                const rating = displayRating(f.overall_rating);

                                return (
                                    <div
                                        key={f.faculty_id}
                                        className="relative p-4 bg-white shadow-lg rounded-2xl"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span
                                                className={`px-3 py-1 text-sm font-bold rounded-full ${badgeColor}`}
                                            >
                                                #{rank}
                                            </span>

                                            {rating && (
                                                <span className="text-lg font-semibold">
                                                    {rating}
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="font-medium text-gray-700 text-md">
                                            {f.full_name}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            {f.department_name || "N/A"}
                                        </p>

                                        {rating && (
                                            <button
                                                onClick={() => generateCertificate(f)}
                                                className="absolute text-gray-500 right-4 bottom-4 hover:text-gray-900"
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
                                {ranking.map((f, idx) => {
                                    const rating = displayRating(f.overall_rating);

                                    return (
                                        <tr key={f.faculty_id}>
                                            <td className="px-6 py-4">{idx + 1}</td>
                                            <td className="px-6 py-4">{f.full_name}</td>
                                            <td className="px-6 py-4">{f.department_name}</td>

                                            <td className="px-6 py-4">
                                                {rating && (
                                                    <span className="px-3 py-1 bg-gray-100 rounded-full">
                                                        {rating}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
