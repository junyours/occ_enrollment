import React, { useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, router } from "@inertiajs/react";
import DataTable from "@/Components/ui/dTable";
import { Dialog } from "@headlessui/react";
import axios from "axios";

export default function StudentListPage({ auth, students, schoolYear, semester }) {
    const { data, meta, links } = students;

    // Modal state
    const [isOpen, setIsOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [subjects, setSubjects] = useState([]);

    // Open modal & fetch subjects
    const handleViewSubjects = async (student) => {
    setSelectedStudent(student);
    try {
        const response = await axios.get(route("guidance.student.subjects", { id: student.student_id }));
        setSubjects(response.data.subjects);
        setIsOpen(true);
    } catch (error) {
        console.error("Failed to fetch subjects", error);
    }
};


    const columns = [
        {
            accessorKey: "student_name",
            header: "Student Name",
            colName: "Student Name",
            cell: ({ row }) => {
                const { last_name, first_name, middle_name } = row.original;
                return (
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                        {last_name}, {first_name} {middle_name || ""}
                    </span>
                );
            },
        },
        {
            accessorKey: "course_name",
            header: "Course",
            colName: "Course",
            cell: ({ row }) => (
                <span className="text-gray-700 dark:text-gray-300">
                    {row.original.course_name}
                </span>
            ),
        },
        {
            accessorKey: "section",
            header: "Section",
            colName: "Section",
            cell: ({ row }) => (
                <span className="text-gray-700 dark:text-gray-300">
                    {row.original.section}
                </span>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            colName: "Actions",
            enableSorting: false,
            cell: ({ row }) => (
                <button
                    onClick={() => handleViewSubjects(row.original)}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition text-sm font-semibold shadow"
                >
                    View Subjects
                </button>
            ),
        },
    ];

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Student List" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Student Evaluation List
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        School Year:{" "}
                        <span className="font-semibold">
                            {schoolYear.start_year}–{schoolYear.end_year}
                        </span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        Semester: <span className="font-semibold">{semester}</span>
                    </p>
                </div>

                <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 shadow rounded-2xl p-6 space-y-4">
                    <DataTable
                        columns={columns}
                        data={data}
                        paginationMeta={meta}
                        paginationLinks={links}
                        onPageChange={(page) =>
                            router.get(route("guidance.student.index"), { page }, { preserveScroll: true })
                        }
                        searchCol="student_name"
                        columnsFilter
                    />
                </div>
            </div>

            {/* Modal */}
            <Dialog open={isOpen} onClose={() => setIsOpen(false)} className="relative z-50">
                <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full shadow-lg">
                        <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            {selectedStudent
                                ? `${selectedStudent.last_name}, ${selectedStudent.first_name}'s Subjects`
                                : "Subjects"}
                        </Dialog.Title>

                        <div className="space-y-2">
                            {subjects.length > 0 ? (
                                subjects.map((subj, idx) => (
                                    <div
                                        key={idx}
                                        className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 py-2"
                                    >
                                        <span className="font-medium text-gray-800 dark:text-gray-100">
                                            {subj.subject_code} – {subj.descriptive_title}

                                        </span>
                                        <span
                                            className={`px-2 py-1 text-xs rounded-md font-semibold ${
                                                subj.status === "Evaluated"
                                                    ? "bg-green-100 text-green-700"
                                                    : "bg-red-100 text-red-700"
                                            }`}
                                        >
                                            {subj.status}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                    No subjects found.
                                </p>
                            )}
                        </div>

                        <div className="mt-6 text-right">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="bg-gray-600 text-white px-4 py-1.5 rounded-md hover:bg-gray-700 transition"
                            >
                                Close
                            </button>
                        </div>
                    </Dialog.Panel>
                </div>
            </Dialog>
        </AuthenticatedLayout>
    );
}
