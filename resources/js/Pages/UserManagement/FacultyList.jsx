import PreLoader from '@/Components/preloader/PreLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { formatFullName } from '@/Lib/Utils';
import { Badge } from '@/Components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import DataTable from '@/Components/ui/DataTable';
import { PageTitle } from '@/Components/ui/PageTitle';
import AddFaculty from './AddFaculty';
import { Button } from '@/Components/ui/button';

const FacultyList = () => {
    const { user } = usePage().props.auth;
    const userRole = user.user_role

    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openPopovers, setOpenPopovers] = useState({});
    const [openPopoversEvaluator, setOpenPopoversEvaluator] = useState({});
    const [open, setOpen] = useState(false);

    const getFacultyList = async () => {
        let url
        if (userRole == 'registrar') {
            url = 'get.faculty.list'
        } else {
            url = 'get.faculty.list.department'
        }

        await axios.post(route(url))
            .then(response => {
                setFaculty(response.data);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        getFacultyList();
    }, []);

    const [pageIndex, setPageIndex] = useState(0); // Move pageIndex state here

    const activeOnChange = async (id, value) => {
        const currentPage = pageIndex; // Get the current page from state

        const updatedFaculties = faculty.map(fac =>
            fac.id === id ? { ...fac, active: value } : fac
        );
        setFaculty(updatedFaculties);
        setPageIndex(currentPage); // Ensure page index stays the same

        setOpenPopovers(prev => ({ ...prev, [id]: false }));

        await axios.patch('api/set-faculty-active-status', { id, active: value });
    };

    const evaluatorOnChange = async (id, value) => {
        const updatedFaculties = faculty.map(fac =>
            fac.id === id ? { ...fac, user_role: value } : fac
        );
        setFaculty(updatedFaculties);
        setOpenPopoversEvaluator(prev => ({ ...prev, [id]: false }));

        axios.patch('api/set-faculty-role', { id: id, role: value })
    };

    const cols = {
        'program_head': [{
            colName: "Status",
            header: "Status",
            cellClassName: 'text-right w-32 hidden sm:table-cell',
            headerClassName: 'text-right w-32 hidden sm:table-cell',
            cell: ({ row }) => {
                const { active, id } = row.original;
                return (
                    <Popover
                        open={!!openPopovers[id]}
                        onOpenChange={(isOpen) =>
                            setOpenPopovers(prev => ({ ...prev, [id]: isOpen }))
                        }
                    >
                        <PopoverTrigger>
                            <Badge
                                className={`${active ? 'bg-green-200 text-green-700 hover:bg-green-200 hover:text-green-700' : 'bg-red-200 text-red-700 hover:bg-red-200 hover:text-red-700'} cursor-pointer`}
                            >
                                {active ? 'Active' : 'Inactive'}
                            </Badge>
                        </PopoverTrigger>
                        <PopoverContent className="p-0 border-none w-min bg-transparent" sideOffset={0}>
                            {active ? (
                                <Badge
                                    onClick={() => activeOnChange(id, 0)}
                                    className='shadow-xl bg-red-200 text-red-700 hover:bg-red-200 hover:text-red-700 cursor-pointer'>
                                    Inactive
                                </Badge>
                            ) : (
                                <Badge
                                    onClick={() => activeOnChange(id, 1)}
                                    className='shadow-xl bg-green-200 text-green-700 hover:bg-green-200 hover:text-green-700 cursor-pointer'>
                                    Active
                                </Badge>
                            )}
                        </PopoverContent>
                    </Popover>
                );
            },
        }, {
            colName: "Evaluator",
            header: "Evaluator",
            cellClassName: 'text-right w-32 hidden sm:table-cell',
            headerClassName: 'text-right w-32 hidden sm:table-cell',
            cell: ({ row }) => {
                const { user_role, id } = row.original;
                return (
                    <>
                        {user_role === 'program_head' || user_role === 'registrar' ? (
                            <span className="px-2 py-1 rounded-full text-xs font-medium text-purple-500">
                                {user_role === 'program_head' ? 'Program Head' : 'Registrar'}
                            </span>
                        ) : (
                            <Popover
                                open={!!openPopoversEvaluator[id]}
                                onOpenChange={(isOpen) =>
                                    setOpenPopoversEvaluator(prev => ({ ...prev, [id]: isOpen }))
                                }
                            >
                                <PopoverTrigger>
                                    <Badge
                                        className={`${user_role === 'evaluator' ? 'bg-gray-200 text-blue-700 hover:bg-gray-200 hover:text-blue-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-200 hover:text-gray-800'} cursor-pointer`}
                                    >
                                        {user_role === 'evaluator' ? 'Evaluator' : 'Non-Evaluator'}
                                    </Badge>
                                </PopoverTrigger>
                                <PopoverContent className="p-0 border-none w-max bg-transparent" sideOffset={0}>
                                    {user_role == 'evaluator' ? (
                                        <Badge
                                            onClick={() => evaluatorOnChange(id, 'faculty')}
                                            className='shadow-xl bg-gray-200 text-gray-800 hover:bg-gray-200 hover:text-gray-800 cursor-pointer'>
                                            Non-Evaluator
                                        </Badge>
                                    ) : (
                                        <Badge
                                            onClick={() => evaluatorOnChange(id, 'evaluator')}
                                            className='shadow-xl bg-gray-200 text-blue-700 hover:bg-gray-200 hover:text-blue-700 cursor-pointer'>
                                            Evaluator
                                        </Badge>
                                    )}
                                </PopoverContent>
                            </Popover>
                        )
                        }
                    </>
                );
            },
        }],
        'registrar':
        {
            colName: "Department",
            accessorKey: "department_name_abbreviation",
            header: "Department",
        },
    }

    const extraCols = Array.isArray(cols[userRole])
        ? cols[userRole]
        : cols[userRole]
            ? [cols[userRole]]
            : [];

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
        ...extraCols
    ];

    if (loading) return <PreLoader title="Faculty List" />;

    return (
        <div className="space-y-4">
            <Head title="Faculty List" />
            <PageTitle align="center">Faculty List</PageTitle>
            {userRole == 'registrar' && (
                <Button onClick={() => setOpen(true)}>Add Faculty</Button>
            )}
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl"></CardTitle>
                </CardHeader>
                <CardContent>
                    <DataTable
                        columns={columns}
                        data={faculty}
                        pageIndex={pageIndex}
                        setPageIndex={setPageIndex}
                    />
                </CardContent>
            </Card>
            {userRole == 'registrar' && (
                <AddFaculty open={open} setOpen={setOpen} />
            )}
        </div>
    );
};

export default FacultyList;
FacultyList.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
