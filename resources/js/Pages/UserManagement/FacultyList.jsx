import PreLoader from '@/Components/preloader/PreLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { cn, formatFullName } from '@/Lib/Utils';
import { Badge } from '@/Components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import DataTable from '@/Components/ui/DataTable';
import { PageTitle } from '@/Components/ui/PageTitle';
import AddFaculty from './AddFaculty';
import { Button } from '@/Components/ui/button';
import { CheckCircle, ChevronLeft, ChevronRight, Edit3Icon, Plus, Search, X, XCircle } from 'lucide-react';
import { Input } from '@/Components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip';
import Checkbox from '@/Components/Checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';

const FacultyList = ({ faculties, filters }) => {
    const { user } = usePage().props.auth;
    const userRole = user.user_role

    const [faculty, setFaculty] = useState([]);
    const [open, setOpen] = useState(false);

    const getFacultyList = async () => {
        let url
        if (userRole == 'registrar') {
            url = 'get.faculty.list'
        } else {
            url = 'get.faculty.list.department'
        }
    };

    useEffect(() => {
        getFacultyList();
    }, []);

    const activeOnChange = (id, value) => {
        router.patch('/set-faculty-active-status', {
            id,
            active: value,
        }, {
            preserveScroll: true,
            onSuccess: () => {

            }
        });
    };

    const [openPopoverId, setOpenPopoverId] = useState(null);

    const roleOnChange = (id, newRole) => {
        router.patch("/set-faculty-role", {
            id,
            user_role: newRole,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setOpenPopoverId(null);
            },
        });
    };

    const [search, setSearch] = useState(filters.search || '');

    const handleSearch = (e) => {
        e.preventDefault();
        router.get('/faculty-list', { search }, {
            preserveState: true,
            replace: true
        });
    };

    const handleReset = () => {
        setSearch('');
        router.get('/faculty-list', {}, {
            preserveState: true,
            replace: true
        });
    };

    const [facultyEdit, setFacultyEdit] = useState([]);
    const [editMode, setEditMode] = useState(false);

    const editFaculty = async (id) => {
        await axios.post(`/api/faculty-info/${id}`)
            .then(response => {
                setFacultyEdit(response.data);
            })
            .finally(() => {
                setEditMode(true)
                setOpen(true);
            });
    };

    return (
        <div className="space-y-4">
            <Head title="Faculty List" />
            <Card>
                <CardHeader>
                    <CardTitle className="text-xl sm:text-2xl font-bold">
                        <div className='w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
                            <span>Faculties</span>
                            <Button onClick={() => setOpen(true)} className="gap-2 w-full sm:w-auto">
                                <Plus className="w-4 h-4" />
                                Add Faculty
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="mb-4 mt-2">
                        <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xl">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search faculties by name or email..."
                                    className="pl-10 w-full"
                                />
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button
                                    type="submit"
                                    variant="default"
                                    className="flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                                >
                                    <Search className="h-4 w-4" />
                                    <span className="hidden sm:inline">Search</span>
                                </Button>

                                {search && (
                                    <Button
                                        type="button"
                                        onClick={handleReset}
                                        variant="outline"
                                        className="flex items-center justify-center gap-2 flex-1 sm:flex-initial"
                                    >
                                        <X className="h-4 w-4" />
                                        <span className="hidden sm:inline">Reset</span>
                                    </Button>
                                )}
                            </div>
                        </div>
                    </form>
                    {/* Mobile Card View */}
                    <div className="block sm:hidden space-y-3">
                        {faculties.data.length > 0 ? (
                            faculties.data.map(student => (
                                <Card key={student.id} className="p-4">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-start">
                                            <div className="font-medium text-sm text-gray-500">ID No</div>
                                            <div className="font-mono text-sm">{student.user_id_no}</div>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <div className="font-medium text-sm text-gray-500">Name</div>
                                            <div className="font-medium text-right">{formatFullName(student)}</div>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <div className="font-medium text-sm text-gray-500">Email</div>
                                            <div className="text-sm text-right break-all">{student.email_address}</div>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <div className="font-medium text-sm text-gray-500">Contact</div>
                                            <div className="text-sm">{student.contact_number}</div>
                                        </div>
                                    </div>
                                </Card>
                            ))
                        ) : (
                            <Card className="p-8">
                                <div className="text-center text-muted-foreground">
                                    No faculties found.
                                </div>
                            </Card>
                        )}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block rounded-md border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>ID No</TableHead>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    {userRole === 'program_head' && (
                                        <>
                                            <TableHead className="text-center">Active</TableHead>
                                            <TableHead className="text-center">Evaluator</TableHead>
                                        </>
                                    )}

                                    {userRole === 'registrar' && (
                                        <TableHead>Department</TableHead>
                                    )}

                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {faculties.data.length > 0 ? (
                                    faculties.data.map(faculty => (
                                        <TableRow key={faculty.id}>
                                            <TableCell className='w-36'>{faculty.user_id_no}</TableCell>
                                            <TableCell className="font-medium w-72">
                                                {formatFullName(faculty)}
                                            </TableCell>
                                            <TableCell>{faculty.email_address}</TableCell>
                                            {userRole === 'program_head' && (
                                                <>
                                                    <TableCell>
                                                        <div className='flex justify-center'>
                                                            <Button
                                                                variant='icon'
                                                                onClick={() => activeOnChange(faculty.id, faculty.active == 0 ? 1 : 0)}
                                                                className="transition hover:scale-110 h-max p-0"
                                                                title={faculty.active == 1 ? 'Deactivate' : 'Activate'}
                                                            >
                                                                {faculty.active == 1 ? (
                                                                    <CheckCircle className="text-green-500 w-5 h-5" />
                                                                ) : (
                                                                    <XCircle className="text-red-500 w-5 h-5" />
                                                                )}
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {(faculty.user_role === "faculty" || faculty.user_role === "evaluator") ? (
                                                            <Popover
                                                                open={openPopoverId === faculty.id}
                                                                onOpenChange={(open) => setOpenPopoverId(open ? faculty.id : null)}
                                                                className="p-0"
                                                            >
                                                                <PopoverTrigger asChild>
                                                                    <Button variant="ghost" className="p-0 h-auto text-xs">
                                                                        <Badge
                                                                            variant={faculty.user_role === "evaluator" ? "default" : "secondary"}
                                                                            className="cursor-pointer w-28 flex justify-center text-center"
                                                                        >
                                                                            {faculty.user_role === "evaluator" ? "Evaluator" : "Non-Evaluator"}
                                                                        </Badge>
                                                                    </Button>
                                                                </PopoverTrigger>

                                                                <PopoverContent className="p-0 border-none w-max bg-transparent">
                                                                    <div className="flex flex-col space-y-1">
                                                                        {faculty.user_role === "evaluator" ? (
                                                                            <Badge
                                                                                onClick={() => roleOnChange(faculty.id, "faculty")}
                                                                                className="shadow-xl bg-gray-200 text-gray-800 hover:bg-gray-200 hover:text-gray-800 cursor-pointer w-28 flex justify-center text-center"
                                                                            >
                                                                                Non-Evaluator
                                                                            </Badge>
                                                                        ) : (
                                                                            <Badge
                                                                                onClick={() => roleOnChange(faculty.id, "evaluator")}
                                                                                className="shadow-xl bg-gray-200 text-blue-700 hover:bg-gray-200 hover:text-blue-700 cursor-pointer w-28 flex justify-center text-center"
                                                                            >
                                                                                Evaluator
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </PopoverContent>
                                                            </Popover>
                                                        ) : (
                                                            <span>
                                                                {faculty.user_role
                                                                    .replace(/_/g, " ")
                                                                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                </>
                                            )}

                                            {userRole == 'registrar' && (
                                                <TableCell>{faculty.department_name_abbreviation}</TableCell>
                                            )}

                                            <TableCell className='w-20'>
                                                <div className='flex justify-center items-center'>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                className="h-max w-max text-green-500"
                                                                size="icon"
                                                                onClick={() => editFaculty(faculty.user_id_no)}
                                                            >
                                                                <Edit3Icon className="w-4 h-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Edit
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                                            No faculties found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-gray-700 text-center sm:text-left">
                            Showing <span className="font-medium">{faculties.from || 0}</span> to <span className="font-medium">{faculties.to || 0}</span> of{' '}
                            <span className="font-medium">{faculties.total}</span> results
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            {faculties.prev_page_url ? (
                                <Button asChild variant="outline" size="sm">
                                    <Link href={faculties.prev_page_url}>
                                        <ChevronLeft className="h-4 w-4 sm:mr-2" />
                                        <span className="hidden sm:inline">Previous</span>
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" disabled>
                                    <ChevronLeft className="h-4 w-4 sm:mr-2" />
                                    <span className="hidden sm:inline">Previous</span>
                                </Button>
                            )}

                            <div className="flex items-center gap-1">
                                {faculties.links.slice(1, -1).map((link, index) => (
                                    link.url ? (
                                        <Button
                                            key={index}
                                            asChild
                                            variant={link.active ? 'default' : 'outline'}
                                            size="sm"
                                            className="min-w-[2.5rem]"
                                        >
                                            <Link href={link.url} dangerouslySetInnerHTML={{ __html: link.label }} />
                                        </Button>
                                    ) : (
                                        <Button
                                            key={index}
                                            variant="outline"
                                            size="sm"
                                            disabled
                                            className="min-w-[2.5rem]"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    )
                                ))}
                            </div>

                            {faculties.next_page_url ? (
                                <Button asChild variant="outline" size="sm">
                                    <Link href={faculties.next_page_url}>
                                        <span className="hidden sm:inline">Next</span>
                                        <ChevronRight className="h-4 w-4 sm:ml-2" />
                                    </Link>
                                </Button>
                            ) : (
                                <Button variant="outline" size="sm" disabled>
                                    <span className="hidden sm:inline">Next</span>
                                    <ChevronRight className="h-4 w-4 sm:ml-2" />
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>{(editMode || open) && (
                <AddFaculty open={open} setOpen={setOpen} faculty={facultyEdit} editing={editMode} setEditing={setEditMode} setFaculty={setFacultyEdit} />
            )}
        </div>
    );
};

export default FacultyList;
FacultyList.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
