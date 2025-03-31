import PreLoader from '@/Components/preloader/PreLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { formatFullName } from '@/Lib/Utils';
import { Badge } from '@/Components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';

const FacultyList = () => {
    const [faculty, setFaculty] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openPopovers, setOpenPopovers] = useState({});
    const [openPopoversEvaluator, setOpenPopoversEvaluator] = useState({});
    
    const getFacultyList = async () => {
        await axios.post(route('api/get.faculty.list'))
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

    const activeOnChange = async (id, value) => {
        const updatedFaculties = faculty.map(fac =>
            fac.id === id ? { ...fac, active: value } : fac
        );
        setFaculty(updatedFaculties);
        setOpenPopovers(prev => ({ ...prev, [id]: false }));

        axios.patch('api/set-faculty-actice-status', { id: id, active: value })
    };

    const evaluatorOnChange = async (id, value) => {
        const updatedFaculties = faculty.map(fac =>
            fac.id === id ? { ...fac, user_role: value } : fac
        );
        setFaculty(updatedFaculties);
        setOpenPopoversEvaluator(prev => ({ ...prev, [id]: false }));

        axios.patch('api/set-faculty-role', { id: id, role: value })
    };

    if (loading) return <PreLoader title="Faculty List" />;

    return (
        <div>
            <Head title="Faculty List" />
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Faculty List</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8">#</TableHead>
                                <TableHead className="w-28">ID no.</TableHead>
                                <TableHead className="w-48">Name</TableHead>
                                <TableHead className="hidden sm:table-cell">Email</TableHead>
                                <TableHead className="text-end w-32 hidden sm:table-cell">Status</TableHead>
                                <TableHead className="text-end w-32 hidden sm:table-cell">Evaluator</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {faculty.map((fac, index) => (
                                <TableRow key={fac.id}>
                                    <TableCell>{index + 1}.</TableCell>
                                    <TableCell>{fac.user_id_no}</TableCell>
                                    <TableCell>{formatFullName(fac)}</TableCell>
                                    <TableCell className="hidden sm:table-cell">{fac.email_address}</TableCell>
                                    <TableCell className="text-end hidden sm:table-cell">
                                        <Popover
                                            open={!!openPopovers[fac.id]}
                                            onOpenChange={(isOpen) =>
                                                setOpenPopovers(prev => ({ ...prev, [fac.id]: isOpen }))
                                            }
                                        >
                                            <PopoverTrigger>
                                                <Badge
                                                    className={`${fac.active ? 'bg-green-200 text-green-700 hover:bg-green-200 hover:text-green-700' : 'bg-red-200 text-red-700 hover:bg-red-200 hover:text-red-700'} cursor-pointer`}
                                                >
                                                    {fac.active ? 'Active' : 'Inactive'}
                                                </Badge>
                                            </PopoverTrigger>
                                            <PopoverContent className="p-0 border-none w-min bg-transparent" sideOffset={0}>
                                                {fac.active ? (
                                                    <Badge
                                                        onClick={() => activeOnChange(fac.id, 0)}
                                                        className='shadow-xl bg-red-200 text-red-700 hover:bg-red-200 hover:text-red-700 cursor-pointer'>
                                                        Inactive
                                                    </Badge>
                                                ) : (
                                                    <Badge
                                                        onClick={() => activeOnChange(fac.id, 1)}
                                                        className='shadow-xl bg-green-200 text-green-700 hover:bg-green-200 hover:text-green-700 cursor-pointer'>
                                                        Active
                                                    </Badge>
                                                )}
                                            </PopoverContent>
                                        </Popover>
                                    </TableCell>
                                    <TableCell className="text-end hidden sm:table-cell">
                                        {fac.user_role === 'program_head' || fac.user_role === 'registrar' ? (
                                            <span className="px-2 py-1 rounded-full text-xs font-medium text-purple-500">
                                                {fac.user_role === 'program_head' ? 'Program Head' : 'Registrar'}
                                            </span>
                                        ) : (
                                            <Popover
                                                open={!!openPopoversEvaluator[fac.id]}
                                                onOpenChange={(isOpen) =>
                                                    setOpenPopoversEvaluator(prev => ({ ...prev, [fac.id]: isOpen }))
                                                }
                                            >
                                                <PopoverTrigger>
                                                    <Badge
                                                        className={`${fac.user_role === 'evaluator' ? 'bg-gray-200 text-blue-700 hover:bg-gray-200 hover:text-blue-700' : 'bg-gray-200 text-gray-800 hover:bg-gray-200 hover:text-gray-800'} cursor-pointer`}
                                                    >
                                                        {fac.user_role === 'evaluator' ? 'Evaluator' : 'Non-Evaluator'}
                                                    </Badge>
                                                </PopoverTrigger>
                                                <PopoverContent className="p-0 border-none w-max bg-transparent" sideOffset={0}>
                                                    {fac.user_role == 'evaluator' ? (
                                                        <Badge
                                                            onClick={() => evaluatorOnChange(fac.id, 'faculty')}
                                                            className='shadow-xl bg-gray-200 text-gray-800 hover:bg-gray-200 hover:text-gray-800 cursor-pointer'>
                                                            Non-Evaluator
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            onClick={() => evaluatorOnChange(fac.id, 'evaluator')}
                                                                    className='shadow-xl bg-gray-200 text-blue-700 hover:bg-gray-200 hover:text-blue-700 cursor-pointer'>
                                                            Evaluator
                                                        </Badge>
                                                    )}
                                                </PopoverContent>
                                            </Popover>
                                        )}

                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
};

export default FacultyList;
FacultyList.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
