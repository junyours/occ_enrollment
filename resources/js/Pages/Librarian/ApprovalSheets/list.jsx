import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Head, Link } from '@inertiajs/react';
import { ArrowRight, X, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import axios from 'axios';

const fetchApprovalSheets = async ({ queryKey }) => {
    const [_, searchTerm, searchType, page] = queryKey;
    const response = await axios.post('/approval-sheets', {
        searchTerm,
        searchType,
        page,
        perPage: 10
    });
    return response.data;
};

export default function List() {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchType, setSearchType] = useState('title');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [expandedRows, setExpandedRows] = useState(new Set());

    // Debounce search term
    React.useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPage(1);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchTerm]);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['approvalSheets', debouncedSearch, searchType, page],
        queryFn: fetchApprovalSheets,
        keepPreviousData: true,
        staleTime: 5000
    });

    const clearSearch = () => {
        setSearchTerm('');
        setDebouncedSearch('');
        setPage(1);
    };

    const handlePreviousPage = () => {
        setPage((prev) => Math.max(prev - 1, 1));
    };

    const handleNextPage = () => {
        if (data?.hasMore) {
            setPage((prev) => prev + 1);
        }
    };

    const toggleRow = (sheetId) => {
        setExpandedRows((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(sheetId)) {
                newSet.delete(sheetId);
            } else {
                newSet.add(sheetId);
            }
            return newSet;
        });
    };

    const getStudentName = (studentApprovalSheet) => {
        const info = studentApprovalSheet?.graduation_requirement?.enrolled_student?.user?.information;
        if (!info) return 'N/A';
        const fullName = `${info.first_name} ${info.middle_name ? info.middle_name + ' ' : ''}${info.last_name}${info.suffix ? ' ' + info.suffix : ''}`;
        return fullName;
    };

    return (
        <div className='space-y-4'>
            <Head title='Approval Sheets' />
            <div className='flex items-center gap-4'>
                <Link className='self-end' href='/approval-sheets/upload'>
                    <Button>
                        Upload New Sheet
                        <ArrowRight className='ml-2 w-4 h-4' />
                    </Button>
                </Link>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Approval Sheets</CardTitle>
                    <CardDescription>List of uploaded approval sheets.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className='mb-4 flex items-center gap-2'>
                        <Select value={searchType} onValueChange={setSearchType}>
                            <SelectTrigger className='w-[180px]'>
                                <SelectValue placeholder='Search by...' />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value='title'>Title</SelectItem>
                                <SelectItem value='student'>Student Name</SelectItem>
                            </SelectContent>
                        </Select>
                        <Input
                            type='text'
                            placeholder={searchType === 'title' ? 'Search by title...' : 'Search by student name...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className='max-w-sm'
                        />
                        {searchTerm && (
                            <Button variant='ghost' onClick={clearSearch}>
                                <X className='w-4 h-4' />
                            </Button>
                        )}
                    </div>

                    {isLoading && (
                        <div className='text-center py-8'>
                            <p className='text-muted-foreground'>Loading approval sheets...</p>
                        </div>
                    )}

                    {isError && (
                        <div className='text-center py-8'>
                            <p className='text-destructive'>Error loading approval sheets: {error.message}</p>
                        </div>
                    )}

                    {!isLoading && !isError && (
                        <>
                            <div className='rounded-md border'>
                                <table className='w-full'>
                                    <thead className='bg-muted/50'>
                                        <tr>
                                            <th className='px-4 py-3 text-left text-sm font-medium w-12'></th>
                                            <th className='px-4 py-3 text-left text-sm font-medium'>Title</th>
                                            <th className='px-4 py-3 text-left text-sm font-medium'>Students</th>
                                            <th className='px-4 py-3 text-left text-sm font-medium'>Uploaded At</th>
                                            <th className='px-4 py-3 text-left text-sm font-medium'>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className='divide-y'>
                                        {data?.data?.length === 0 ? (
                                            <tr>
                                                <td colSpan='5' className='px-4 py-8 text-center text-muted-foreground'>
                                                    No approval sheets found.
                                                </td>
                                            </tr>
                                        ) : (
                                            data?.data?.map((sheet) => (
                                                <React.Fragment key={sheet.id}>
                                                    <tr className='hover:bg-muted/50'>
                                                        <td className='px-4 py-3'>
                                                            <Button
                                                                variant='ghost'
                                                                size='sm'
                                                                onClick={() => toggleRow(sheet.id)}
                                                                className='p-0 h-8 w-8'
                                                            >
                                                                {expandedRows.has(sheet.id) ? (
                                                                    <ChevronUp className='w-4 h-4' />
                                                                ) : (
                                                                    <ChevronDown className='w-4 h-4' />
                                                                )}
                                                            </Button>
                                                        </td>
                                                        <td className='px-4 py-3'>{sheet.title}</td>
                                                        <td className='px-4 py-3'>
                                                            {sheet.student_approval_sheets?.length || 0} students
                                                        </td>
                                                        <td className='px-4 py-3'>
                                                            {new Date(sheet.uploaded_at).toLocaleDateString()}
                                                        </td>
                                                        <td className='px-4 py-3'>
                                                            <Link href={`/approval-sheets/${sheet.id}`}>
                                                                <Button variant='outline' size='sm'>
                                                                    View Details
                                                                </Button>
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                    {expandedRows.has(sheet.id) && (
                                                        <tr>
                                                            <td colSpan='5' className='px-4 py-4 bg-muted/20'>
                                                                <div className='ml-12'>
                                                                    <h4 className='font-semibold text-sm mb-3'>Students in this sheet:</h4>
                                                                    {sheet.student_approval_sheets?.length > 0 ? (
                                                                        <div className='space-y-2'>
                                                                            {sheet.student_approval_sheets.map((studentSheet) => {
                                                                                const studentName = getStudentName(studentSheet);
                                                                                const studentId = studentSheet?.graduation_requirement?.enrolled_student?.user?.user_id_no;
                                                                                const email = studentSheet?.graduation_requirement?.enrolled_student?.user?.information?.email_address;
                                                                                const contactNumber = studentSheet?.graduation_requirement?.enrolled_student?.user?.information?.contact_number;

                                                                                return (
                                                                                    <div
                                                                                        key={studentSheet.id}
                                                                                        className='p-3 bg-background rounded-md border flex justify-between items-start'
                                                                                    >
                                                                                        <div>
                                                                                            <p className='font-medium'>{studentName}</p>
                                                                                            {studentId && (
                                                                                                <p className='text-sm text-muted-foreground'>ID: {studentId}</p>
                                                                                            )}
                                                                                            {email && (
                                                                                                <p className='text-sm text-muted-foreground'>Email: {email}</p>
                                                                                            )}
                                                                                            {contactNumber && (
                                                                                                <p className='text-sm text-muted-foreground'>Contact: {contactNumber}</p>
                                                                                            )}
                                                                                        </div>
                                                                                        <div className='text-xs text-muted-foreground'>
                                                                                            {studentSheet.librarian_confirmed_id ? (
                                                                                                <span className='text-green-600 font-medium'>✓ Confirmed</span>
                                                                                            ) : (
                                                                                                <span className='text-amber-600 font-medium'>⏳ Pending</span>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    ) : (
                                                                        <p className='text-sm text-muted-foreground'>No students found in this sheet.</p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {data?.data?.length > 0 && (
                                <div className='mt-4 flex items-center justify-between'>
                                    <p className='text-sm text-muted-foreground'>
                                        Page {data.currentPage} of {data.lastPage} ({data.total} total)
                                    </p>
                                    <div className='flex space-x-2'>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={handlePreviousPage}
                                            disabled={page === 1}
                                        >
                                            <ChevronLeft className='w-4 h-4 mr-1' />
                                            Previous
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={handleNextPage}
                                            disabled={!data?.hasMore}
                                        >
                                            Next
                                            <ChevronRight className='w-4 h-4 ml-1' />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

List.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;