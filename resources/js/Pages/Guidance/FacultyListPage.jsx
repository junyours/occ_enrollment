import React, { useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link, router } from "@inertiajs/react";
import DataTable from "@/components/ui/dTable";
import { Download, Loader2 } from "lucide-react";

export default function FacultyListPage({
    auth,
    faculty,
    schoolYear,
    departments = [],
    filters,
    semester,
}) {
    const { data, meta, links } = faculty;
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDepartmentChange = (e) => {
        router.get(
            route("guidance.faculty.index"),
            {
                department: e.target.value || "",
                search: filters.search || "",
            },
            { preserveScroll: true }
        );
    };

    const getFileNameFromResponse = (response) => {
        const disposition = response.headers.get("content-disposition");

        if (!disposition) {
            return "faculty-evaluation-results.zip";
        }

        const fileNameMatch = disposition.match(/filename="?([^"]+)"?/);

        return fileNameMatch?.[1] || "faculty-evaluation-results.zip";
    };

    const handleDownloadZip = async () => {
        if (isDownloading) return;

        setIsDownloading(true);

        try {
            const downloadUrl = route("guidance.faculty.evaluation-results.bulk-download", {
                department: filters.department || "",
                search: filters.search || "",
            });

            const response = await fetch(downloadUrl, {
                method: "GET",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                },
            });

            if (!response.ok) {
                throw new Error("Failed to download ZIP file.");
            }

            const blob = await response.blob();
            const fileName = getFileNameFromResponse(response);

            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");

            link.href = url;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();

            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error(error);
            alert("Unable to download the ZIP file. Please try again.");
        } finally {
            setIsDownloading(false);
        }
    };

    const columns = [
        {
            accessorKey: "name",
            header: "Faculty Name",
            colName: "Name",
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
            accessorKey: "department_name",
            header: "Department",
            colName: "Department",
            cell: ({ row }) => (
                <span className="text-gray-700 dark:text-gray-300">
                    {row.original.department_name}
                </span>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            colName: "Actions",
            enableSorting: false,
            cell: ({ row }) => (
                <Link
                    href={route("guidance.faculty.subjects", row.original.id)}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 transition text-sm font-semibold shadow"
                >
                    View Subjects
                </Link>
            ),
        },
    ];

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Faculty List" />

            <div className="px-4 py-8 mx-auto space-y-6 max-w-7xl sm:px-6 lg:px-8">
                {/* Page Title */}
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                        Faculty List
                    </h1>

                    {schoolYear && semester ? (
                        <>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                School Year:{" "}
                                <span className="font-semibold">
                                    {schoolYear.start_year}–{schoolYear.end_year}
                                </span>
                            </p>

                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                Semester:{" "}
                                <span className="font-semibold">{semester}</span>
                            </p>
                        </>
                    ) : (
                        <div className="p-4 text-center text-yellow-800 bg-yellow-100 border-l-4 border-yellow-400 rounded-md shadow-md">
                            <p className="text-lg font-semibold">
                                No active evaluation yet.
                            </p>
                            <p className="text-sm">
                                Currently, there is no active evaluation for any school year or semester.
                                Please wait until an evaluation is activated to view faculty and their subjects.
                            </p>
                        </div>
                    )}
                </div>

                {/* Only show table if active evaluation exists */}
                {schoolYear && semester && (
                    <div className="p-6 space-y-4 bg-white border border-gray-200 shadow dark:bg-gray-900 dark:border-gray-700 rounded-2xl">
                        {/* Department Filter */}
                        <div className="flex items-center gap-3">
                            <label
                                htmlFor="department"
                                className="text-sm font-medium text-gray-700 dark:text-gray-300"
                            >
                                Filter by Department:
                            </label>

                            <select
                                id="department"
                                value={filters.department || ""}
                                onChange={handleDepartmentChange}
                                className="border border-gray-300 dark:border-gray-700 rounded-md px-3 py-1.5 bg-white dark:bg-gray-800 text-sm text-gray-800 dark:text-white"
                                disabled={isDownloading}
                            >
                                <option value="">All Departments</option>
                                {(departments ?? []).map((dept) => (
                                    <option key={dept.id} value={dept.id}>
                                        {dept.department_name}
                                    </option>
                                ))}
                            </select>

                            {/* Download ZIP */}
                            <div className="ml-auto">
                                <button
                                    type="button"
                                    onClick={handleDownloadZip}
                                    disabled={isDownloading}
                                    className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition rounded-md shadow ${
                                        isDownloading
                                            ? "bg-gray-500 cursor-not-allowed"
                                            : "bg-green-600 hover:bg-green-700"
                                    }`}
                                >
                                    {isDownloading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Downloading...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="w-4 h-4" />
                                            Download ZIP
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Data Table */}
                        <DataTable
                            columns={columns}
                            data={(data ?? []).map((f) => ({
                                ...f,
                                name: f.full_name,
                            }))}
                            paginationMeta={meta}
                            paginationLinks={links}
                            onPageChange={(page) =>
                                router.get(
                                    route("guidance.faculty.index"),
                                    {
                                        page,
                                        department: filters.department || "",
                                        search: filters.search || "",
                                    },
                                    { preserveScroll: true }
                                )
                            }
                            searchCol="full_name"
                            columnsFilter
                        />
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
