import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/Components/ui/table';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { ChevronLeft, ChevronRight, Edit3Icon, Plus, Search, X } from 'lucide-react';
import { PageTitle } from '@/Components/ui/PageTitle';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import React, { useState } from 'react';
import { formatFullName } from '@/Lib/Utils';
import AddStudent from './AddStudent';
import { Input } from '@/Components/ui/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip';

export default function StudentList({ students, filters }) {
    const [search, setSearch] = useState(filters.search || '');
    const [open, setOpen] = useState(false);

    const handleSearch = (e) => {
        e.preventDefault();
        router.get('/student-list', { search }, {
            preserveState: true,
            replace: true
        });
    };

    const handleReset = () => {
        setSearch('');
        router.get('/student-list', {}, {
            preserveState: true,
            replace: true
        });
    };

    const editStudent = async (id) => {
        console.log(id);
    }

    return (
        <div className="space-y-4">
            <Head title="Student List" />

            <Card>
                <CardHeader>
                    <CardTitle className="text-xl sm:text-2xl font-bold">
                        <div className='w-full flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
                            <span>Students</span>
                            <Button onClick={() => setOpen(true)} className="gap-2 w-full sm:w-auto">
                                <Plus className="w-4 h-4" />
                                Add Student
                            </Button>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSearch} className="mb-4 mt-2">
                        <div className="flex flex-col sm:flex-row gap-2 w-96">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                                <Input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    placeholder="Search students by name or email..."
                                    className="pl-10 w-full"
                                />
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto">
                                <Button type="submit" variant="default" className="flex-1 sm:flex-initial">
                                    Search
                                </Button>
                                {(search) && (
                                    <Button type="button" onClick={handleReset} variant="outline" className="flex-1 sm:flex-initial">
                                        <X className="h-4 w-4 mr-2" />
                                        Reset
                                    </Button>
                                )}
                            </div>
                        </div>
                    </form>

                    {/* Mobile Card View */}
                    <div className="block sm:hidden space-y-3">
                        {students.data.length > 0 ? (
                            students.data.map(student => (
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
                                    No students found.
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
                                    <TableHead>Contact</TableHead>
                                    <TableHead></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {students.data.length > 0 ? (
                                    students.data.map(student => (
                                        <TableRow key={student.id}>
                                            <TableCell className='w-36'>{student.user_id_no}</TableCell>
                                            <TableCell className="font-medium w-72">
                                                {formatFullName(student)}
                                            </TableCell>
                                            <TableCell>{student.email_address}</TableCell>
                                            <TableCell className='w-32'>{student.contact_number}</TableCell>
                                            <TableCell className='w-20'>
                                                <div className='flex justify-center items-center'>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                className="h-max w-max text-green-500"
                                                                size="icon"
                                                                onClick={() => editStudent(student.id)}
                                                            >
                                                                <Edit3Icon />
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
                                            No students found.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-sm text-gray-700 text-center sm:text-left">
                            Showing <span className="font-medium">{students.from || 0}</span> to <span className="font-medium">{students.to || 0}</span> of{' '}
                            <span className="font-medium">{students.total}</span> results
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-center">
                            {students.prev_page_url ? (
                                <Button asChild variant="outline" size="sm">
                                    <Link href={students.prev_page_url}>
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
                                {students.links.slice(1, -1).map((link, index) => (
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

                            {students.next_page_url ? (
                                <Button asChild variant="outline" size="sm">
                                    <Link href={students.next_page_url}>
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
            </Card>

            <AddStudent open={open} setOpen={setOpen} />
        </div>
    );
}

StudentList.layout = page => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
