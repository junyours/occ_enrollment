import PreLoader from '@/Components/preloader/PreLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import DataTable from '@/Components/ui/DataTable';
import { PageTitle } from '@/Components/ui/PageTitle';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatFullName } from '@/Lib/Utils';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import AddStudent from './AddStudent';
import { Button } from '@/Components/ui/button';

export default function StudentList() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);

    const getStudents = async () => {
        await axios.post(route('students'))
            .then(response => {
                setStudents(response.data);
            })
            .finally(() => {
                setLoading(false);
            })
    }

    useEffect(() => {
        getStudents()
    }, [])

    if (loading) return <PreLoader title='Student List' />

    const columns = [
        {
            colName: "ID no.",
            accessorKey: "user_id_no",
            header: "ID no.",
            headerClassName: 'w-32',
        },
        {
            colName: "Name",
            accessorKey: "name",
            header: "Name",
            headerClassName: 'w-52',
            filterValue: (row) => {
                const { first_name, middle_name, last_name } = row;
                return formatFullName({ first_name, middle_name, last_name }).toLowerCase();
            },
            cell: ({ row }) => {
                const { first_name, middle_name, last_name } = row.original;
                const formattedName = formatFullName({ first_name, middle_name, last_name });
                return <div className="font-medium">{formattedName}</div>;
            },
        },
        {
            colName: "Email",
            accessorKey: "email_address",
            header: "Email",
        },
        {
            colName: "Contact no.",
            accessorKey: "contact_number",
            header: "Contact no.",
        },
    ];

    return (
        <div className="space-y-4">
            <Head title="Student List" />
            <PageTitle align="center">Student List</PageTitle>
            <Button onClick={() => setOpen(true)}>Add Student</Button>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl"></CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={students}
                    />
                </CardContent>
            </Card>
            <AddStudent open={open} setOpen={setOpen} />
        </div>
    )
}

StudentList.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
