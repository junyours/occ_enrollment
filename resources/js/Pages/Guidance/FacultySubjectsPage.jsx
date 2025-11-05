import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import DataTable from "@/Components/ui/dTable";
import { BookOpen, ArrowLeft, BarChart2 } from "lucide-react";

export default function FacultySubjectsPage({ auth, faculty, subjects }) {
    const columns = [
        {
            accessorKey: "subject_code",
            header: "Subject Code",
            colName: "Subject Code",
        },
        {
            accessorKey: "descriptive_title",
            header: "Descriptive Title",
            colName: "Descriptive Title",
        },
        {
            id: "actions",
            header: "Actions",
            colName: "Actions",
            cell: ({ row }) => {
                const subject = row.original;
                return (
                    <Link
                        href={route("guidance.faculty.subject.evaluation", {
                            facultyId: faculty.id,
                            studentSubjectId: subject.student_subject_id, // <- correctly used here
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

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Handled Subjects" />

            <div className="max-w-7xl mx-auto p-6 space-y-6">
                {/* Header Section */}
                <div className="flex items-center gap-3">
                    <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                        Subjects Handled by {faculty.last_name}, {faculty.first_name} {faculty.middle_name ?? ""}
                    </h1>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                    Department: <strong>{faculty.department_name ?? "N/A"}</strong>
                </p>

                {/* Back Link */}
                <div>
                    <Link
                        href={route("guidance.faculty.index")}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline transition text-sm font-medium"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Faculty List
                    </Link>
                </div>

                {/* Data Table */}
                <div className="bg-white dark:bg-gray-900 shadow rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                    <DataTable
                        columns={columns}
                        data={subjects}
                        searchCol="subject_code"
                        pagination
                        columnsFilter
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
