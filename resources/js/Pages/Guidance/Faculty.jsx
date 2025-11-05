import React from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head } from "@inertiajs/react";
import {
    Card,
    CardHeader,
    CardTitle,
    CardContent,
} from "@/Components/ui/card";
import DataTable from "@/Components/ui/dTable"; // Import your custom DataTable
import { Eye } from "lucide-react";
import { Link } from "@inertiajs/react";

export default function FacultyPage({ auth, faculty, departments, filters }) {
    const columns = [
        {
            accessorKey: "name",
            header: "Name",
            colName: "Name",
            cell: ({ row }) => (
                <span>{row.original.last_name}, {row.original.first_name} </span>
            ),
        },
        {
            accessorKey: "email",
            header: "Email",
            colName: "Email",
        },
        {
            accessorKey: "department_name",
            header: "Department",
            colName: "Department",
        },
        // {
        //     accessorKey: "subjects",
        //     header: "Handled Subjects",
        //     colName: "Subjects",
        //     cell: ({ row }) =>
        //         row.original.subjects.length > 0 ? (
        //             <ul className="list-disc list-inside">
        //                 {row.original.subjects.map((subj, idx) => (
        //                     <li key={idx}>
        //                         {subj.subject_code} - {subj.descriptive_title}
        //                     </li>
        //                 ))}
        //             </ul>
        //         ) : (
        //             <span className="italic text-gray-500">No subjects</span>
        //         ),
        // },
        {
            accessorKey: "action",
            header: "Action",
            colName: "Action",
            cell: ({ row }) => (
                <Link href={route('faculty.subjects', { id: row.original.faculty_id })} className="text-blue-600 hover:text-blue-800">
                    <span>Subjects</span>
                </Link>
            ),
        },
    ];

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Faculty List" />
            <div className="p-4 space-y-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-2xl">Faculty List</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-2 text-lg">
                        <DataTable
                            columns={columns}
                            data={faculty.data}
                            searchCol="name"
                            searchBar={true}
                            pagination={true}
                            columnsFilter={true}
                        />
                    </CardContent>
                </Card>
            </div>
        </AuthenticatedLayout>
    );
}
