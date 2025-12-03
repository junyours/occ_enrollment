import React, { useState } from 'react';
import { Calendar, Clock, User, FileText, Search, School, SendHorizonal, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import { useQuery } from '@tanstack/react-query';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import SchoolYearPicker from '@/Components/SchoolYearPicker';
import { formatFullName } from '@/Lib/Utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Label } from '@/Components/ui/label';
import InfoTooltip from '@/Components/InfoTooltip';

export default function ChangeRequests() {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('pending');

    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const fetchFacultySubjects = async () => {
        const response = await axios.post(route('change-requests-list'), {
            schoolYearId: selectedSchoolYearEntry.id,
        });
        return response.data;
    };

    const {
        data: requests = [],
        isLoading,
        isError,
        refetch,
    } = useQuery({
        queryKey: ['change-requests-list', selectedSchoolYearEntry?.id],
        queryFn: fetchFacultySubjects,
        enabled: !!selectedSchoolYearEntry?.id,
        staleTime: 1000 * 60 * 5,
    });

    const filterByStatus = (status) => {
        return requests.filter(req => {
            const statusMatch = req.status === status;
            const searchMatch = searchQuery === '' ||
                req.descriptive_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                req.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                `${req.course_name_abbreviation}-${req.year_level_id}${req.section}`.toLowerCase().includes(searchQuery.toLowerCase());
            return statusMatch && searchMatch;
        });
    };

    const getStatusVariant = (status) => {
        switch (status) {
            case 'pending': return 'default';
            case 'approved': return 'secondary';
            case 'rejected': return 'destructive';
            case 'submitted': return 'outline';
            default: return 'secondary';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getClassCode = (req) => {
        return `${req.course_name_abbreviation}-${req.year_level_id}${req.section}`;
    };

    const stats = {
        pending: requests.filter(r => r.status === 'pending').length,
        approved: requests.filter(r => r.status === 'approved').length,
        rejected: requests.filter(r => r.status === 'rejected').length,
        submitted: requests.filter(r => r.status === 'submitted').length
    };

    const [submitting, setSubmitting] = useState(false);
    const [requestId, setRequestId] = useState(0);

    const approve = (requestId) => {
        setSubmitting(true);
        setRequestId(requestId);

        router.post(route('approve-request'),
            { requestId },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Approved");
                },
                onError: () => {
                    toast.error("Failed to approve request");
                },
                onFinish: async () => {
                    await refetch();
                    setSubmitting(false);
                    setRequestId(0);
                }
            }
        );
    };

    const [rejectionMessage, setRejectionMessage] = useState('');

    const reject = (requestId) => {
        setSubmitting(true);
        setRequestId(requestId);

        router.post(route('reject-request'),
            { requestId, rejectionMessage },
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Rejected");
                },
                onError: () => {
                    toast.error("Failed to reject request");
                },
                onFinish: async () => {
                    await refetch();
                    setSubmitting(false);
                    setRequestId(0);
                }
            }
        );
    };

    const RequestTable = ({ requests, status }) => (
        <div className="overflow-x-auto">
            <Table className="w-full">
                <TableHeader>
                    <TableRow className="border-b">
                        <TableHead>Class</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Instructor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Request Date</TableHead>
                        <TableHead className="text-right py-3 px-4 font-medium text-sm">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {requests.map((request) => (
                        <TableRow key={request.id} className="border-b hover:bg-muted/50">
                            <TableCell>
                                <span className="font-medium">{getClassCode(request)}</span>
                            </TableCell>
                            <TableCell>
                                <span className="text-sm">{request.descriptive_title}</span>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{formatFullName(request)}</span>
                                </div>
                            </TableCell>
                            <TableCell>
                                {request.status === 'rejected' ? (
                                    <InfoTooltip position="top">
                                        <InfoTooltip.Trigger>
                                            <Badge className='w-[80px] flex justify-center' variant={getStatusVariant(request.status)}>
                                                {request.status}
                                            </Badge>
                                        </InfoTooltip.Trigger>
                                        <InfoTooltip.Content>
                                            <div className='flex gap-2 items-center'>
                                                <Mail className='w-4 h-4 text-muted-foreground' />
                                                {request.rejection_message}
                                            </div>
                                        </InfoTooltip.Content>
                                    </InfoTooltip>
                                ) : (
                                    <span className="font-mono text-sm">
                                        {request.status}
                                    </span>
                                )}
                            </TableCell>
                            <TableCell>
                                <span className="text-sm text-muted-foreground">
                                    {formatDate(request.request_date)}
                                </span>
                            </TableCell>
                            <TableCell>
                                <div className="flex justify-end gap-2">
                                    {request.status === 'pending' && (
                                        <>
                                            <Button
                                                variant="default"
                                                size="sm"
                                                onClick={() => approve(request.id)}
                                                disabled={submitting && requestId === request.id}
                                            >
                                                Approve
                                            </Button>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        disabled={submitting && requestId === request.id}
                                                    >
                                                        Reject
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-64 space-y-2">
                                                    <Label htmlFor="rejection-message">Message <span className='text-xs italic'>(not required)</span></Label>
                                                    <Input
                                                        id="rejection-message"
                                                        value={rejectionMessage}
                                                        onChange={(e) => setRejectionMessage(e.target.value)}
                                                        className="w-full"
                                                        placeholder="Enter reason for rejection"
                                                    />
                                                    <Button onClick={() => reject(request.id)} disabled={submitting && requestId === request.id}>
                                                        Send <SendHorizonal className="ml-2 h-4 w-4" />
                                                    </Button>
                                                </PopoverContent>
                                            </Popover>
                                        </>
                                    )}
                                </div>
                            </TableCell>
                        </TableRow>
                    ))}
                    {requests.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={6} className="py-12 text-center">
                                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                                <p className="text-muted-foreground">No {status} requests found.</p>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );

    return (
        <div className="container mx-auto space-y-4">
            <SchoolYearPicker />

            <Card>
                <CardHeader>
                    <CardTitle>Change Requests</CardTitle>
                    <CardDescription>Manage faculty grade change requests</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="mb-6">
                        <div className="relative">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by subject, faculty, or class..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>

                    <Tabs value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="pending" className="relative">
                                Pending
                                {stats.pending > 0 && (
                                    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1">
                                        {stats.pending}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="approved" className="relative">
                                Approved
                                {stats.approved > 0 && (
                                    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1">
                                        {stats.approved}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="rejected" className="relative">
                                Rejected
                                {stats.rejected > 0 && (
                                    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1">
                                        {stats.rejected}
                                    </Badge>
                                )}
                            </TabsTrigger>
                            <TabsTrigger value="submitted" className="relative">
                                Submitted
                                {stats.submitted > 0 && (
                                    <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1">
                                        {stats.submitted}
                                    </Badge>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="pending" className="mt-6">
                            <RequestTable requests={filterByStatus('pending')} status="pending" />
                        </TabsContent>

                        <TabsContent value="approved" className="mt-6">
                            <RequestTable requests={filterByStatus('approved')} status="approved" />
                        </TabsContent>

                        <TabsContent value="rejected" className="mt-6">
                            <RequestTable requests={filterByStatus('rejected')} status="rejected" />
                        </TabsContent>

                        <TabsContent value="submitted" className="mt-6">
                            <RequestTable requests={filterByStatus('submitted')} status="submitted" />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}

ChangeRequests.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;