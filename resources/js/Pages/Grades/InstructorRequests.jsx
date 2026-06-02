import InfoTooltip from '@/Components/InfoTooltip';
import SchoolYearPicker from '@/Components/SchoolYearPicker';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Link } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { AlertCircle, ArrowRight, BookOpen, Clock, Loader2, Mail, Users } from 'lucide-react';
import React, { useEffect } from 'react';

export default function InstructorRequests() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const fetchFacultyRequests = async () => {
        const response = await axios.post(route('instructor-requests-list'), {
            schoolYearId: selectedSchoolYearEntry.id,
        });
        return response.data;
    };

    const { data: requests = [], isLoading, isError } = useQuery({
        queryKey: ['instructor-requests', selectedSchoolYearEntry?.id],
        queryFn: fetchFacultyRequests,
        enabled: !!selectedSchoolYearEntry?.id,
        staleTime: 1000 * 60 * 5,
    });

    return (
        <div className='space-y-4'>
            <div className='w-max min-h-max'>
                <SchoolYearPicker layout="horizontal" />
            </div>

            <Card className="shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Subject List
                    </CardTitle>
                    <CardDescription>
                        {requests.length > 0 && `${requests.length} subject${requests.length !== 1 ? 's' : ''} assigned`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-3" />
                            <p className="text-sm">Loading requests...</p>
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center py-12 text-destructive">
                            <AlertCircle className="w-8 h-8 mb-3" />
                            <p className="text-sm font-medium">Failed to load requests</p>
                            <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm font-medium">No requests</p>
                            <p className="text-xs mt-1">Check back later or contact administration</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-semibold">Subject</TableHead>
                                        <TableHead className="font-semibold">Section</TableHead>
                                        <TableHead className="font-semibold">Date Requested</TableHead>
                                        <TableHead className="font-semibold">Status</TableHead>
                                        <TableHead className="text-right font-semibold">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map((request, index) => (
                                        <TableRow
                                            key={request.hashed_grade_edit_requests_id}
                                            className="group hover:bg-muted/50 transition-colors"
                                        >
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                        {index + 1}
                                                    </div>
                                                    <span>{request.descriptive_title}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-mono text-sm">
                                                        {request.course_name_abbreviation}-{request.year_level_id}{request.section}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-mono text-sm">
                                                        {request.request_date.slice(0, 10)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                                    {request.status === 'rejected' ? (
                                                        <InfoTooltip position="top">
                                                            <InfoTooltip.Trigger>
                                                                <span className="underline font-mono text-sm  text-red-500">
                                                                    rejected
                                                                </span>
                                                            </InfoTooltip.Trigger>
                                                            <InfoTooltip.Content>
                                                                <div className='flex gap-2 items-center'>
                                                                    <Mail className='w-4 h-4 text-muted-foreground' />
                                                                    {request.rejection_message}
                                                                </div>
                                                            </InfoTooltip.Content>
                                                        </InfoTooltip>
                                                    ) : (
                                                            <div
                                                                className={`underline font-mono text-sm ${request.status === 'pending'
                                                                    ? 'text-yellow-500'
                                                                    : request.status === 'approved'
                                                                        ? 'text-green-500'
                                                                        : request.status === 'rejected'
                                                                            ? 'text-red-500'
                                                                            : request.status === 'submitted'
                                                                                ? 'text-blue-500'
                                                                                : 'text-gray-500'
                                                                    }`}
                                                            >
                                                                {request.status.toUpperCase()}
                                                            </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className='text-right'>
                                                {request.status !== 'rejected' && (
                                                    <Link href={`/requests-list/${request.hashed_grade_edit_requests_id}`}>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="group/btn hover:bg-primary hover:text-primary-foreground transition-all"
                                                        >
                                                            Open
                                                            <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    );
}

InstructorRequests.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
