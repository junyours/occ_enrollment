import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import DataTable from "@/Components/ui/dTable";

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
            cell: ({ row }) => (
                <button
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                    onClick={() => alert("Evaluation result view coming soon.")}
                >
                    View Evaluation
                </button>
            ),
        },
    ];

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Handled Subjects" />

            <div className="container mx-auto p-6">
                <h1 className="text-2xl font-bold mb-2">
                    Subjects handled by {faculty.last_name}, {faculty.first_name} {faculty.middle_name ?? ""}
                </h1>
                <p className="mb-4 text-gray-700">
                    Department: <strong>{faculty.department_name ?? "N/A"}</strong>
                </p>

                <Link
                    href={route("guidance.faculty.index")}
                    className="inline-block mb-4 text-blue-500 hover:underline"
                >
                    ← Back to Faculty List
                </Link>

                <DataTable
                    columns={columns}
                    data={subjects}
                    searchCol="subject_code"
                    pagination
                    columnsFilter
                />
            </div>
        </AuthenticatedLayout>
    );
}
