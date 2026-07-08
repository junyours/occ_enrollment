import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { AlertCircle, ArrowRight, BookOpen, Download, Loader2, Table as TableIcon, LayoutList } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import FillUpPrompt from '../CollectStudentData/FillUpPrompt';
import DownloadMode from './DownloadMode';

// Import our new mobile view and the logic helpers
import EnrollmentRecordMobileView, { 
    getInstructorName, 
    getSubjectStatus, 
    StatusBadge, 
    formatGradeDisplay 
} from './EnrollmentRecordMobileView';

function EnrollmentRecord({ need_fill_up }) {
    const [error] = useState(null);
    const [downloadMode, setDownloadMode] = useState(false);
    
    // View state: 'table' or 'mobile'
    const [viewMode, setViewMode] = useState('table');

    // Auto-detect screen size on initial load to set the best default view
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setViewMode('mobile');
            } else {
                setViewMode('table');
            }
        };
        
        handleResize(); // Check immediately on mount
        
        // Optional: Auto-switch when resizing the browser window
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const getStudentEnrollmentRecord = async () => {
        const response = await axios.post(route('enrollment-record'));
        return response.data.record;
    };

    const {
        data: records,
        isLoading,
        isError,
    } = useQuery({
        queryKey: ['enrollment-record'],
        queryFn: getStudentEnrollmentRecord,
        enabled: !!!need_fill_up,
        staleTime: 1000 * 60 * 5,
    });

    if (need_fill_up) return <FillUpPrompt />;

    return (
        <div className='space-y-4 flex flex-col justify-center'>
            <Head title="Enrollment Record" />
            <PageTitle align='center' className='w-full'>ENROLLMENT RECORD</PageTitle>

            {records?.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <Button
                        onClick={() => setDownloadMode(!downloadMode)}
                        variant={downloadMode ? "destructive" : "default"}
                        className="flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        {downloadMode ? 'Exit Download Mode' : 'Download Mode'}
                    </Button>

                    {/* View Toggle using shadcn Tabs */}
                    {!downloadMode && (
                        <Tabs 
                            value={viewMode} 
                            onValueChange={setViewMode} 
                            className="w-auto"
                        >
                            <TabsList className="h-10">
                                <TabsTrigger value="mobile" className="flex items-center gap-2">
                                    <LayoutList className="w-4 h-4" />
                                    <span className="hidden sm:inline">Cards</span>
                                </TabsTrigger>
                                <TabsTrigger value="table" className="flex items-center gap-2">
                                    <TableIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">Table</span>
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    )}
                </div>
            )}

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                    <p className="text-sm">Loading records...</p>
                </div>
            ) : isError ? (
                <div className="flex flex-col items-center justify-center py-12 text-destructive">
                    <AlertCircle className="w-8 h-8 mb-3" />
                    <p className="text-sm font-medium">Failed to load records</p>
                    <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
                </div>
            ) : records?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No records</p>
                    <p className="text-xs mt-1">Check back later or contact administration</p>
                </div>
            ) : downloadMode ? (
                <DownloadMode records={records} />
            ) : viewMode === 'mobile' ? (
                <EnrollmentRecordMobileView records={records} />
            ) : (
                <div className='max-w-[calc(100vw-2rem)] min-w-[calc(100vw-2rem)] sm:w-auto sm:min-w-0 sm:max-w-none overflow-x-auto sm:p-0 h-min sm:h-auto'>
                    <div className='space-y-4'>
                        {records.map(record => (
                            <Card id={`${record.id}-record`} key={record.id} className="md:mx-0 w-[1150px]">
                                <CardHeader>
                                    <CardTitle className="text-2xl">
                                        <div className='w-full flex justify-between gap-2'>
                                            <div className='flex flex-row gap-1'>
                                                <div className=''>{record.year_level_name} |</div>
                                                <div className='flex gap-2'>{record.start_year}-{record.end_year} {record.semester_name} Semester</div>
                                            </div>
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className='w-52'>Instructor</TableHead>
                                                    <TableHead className='w-44'>Subject Code</TableHead>
                                                    <TableHead className='w-96'>Descriptive Title</TableHead>
                                                    <TableHead className='w-18'>Midterm</TableHead>
                                                    <TableHead className='w-18'>Final Term</TableHead>
                                                    <TableHead className='w-18'>Grade</TableHead>
                                                    <TableHead className='w-28'>Remarks</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {error ? (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className='text-center'>{error}</TableCell>
                                                    </TableRow>
                                                ) : (
                                                    <>
                                                        {record.subjects.map(classInfo => {
                                                            // Using the imported helpers to keep logic completely unified
                                                            const { finalGrade, status, isEvaluated } = getSubjectStatus(classInfo);

                                                            return (
                                                                <TableRow key={classInfo.id}>
                                                                    <TableCell>{getInstructorName(classInfo)}</TableCell>
                                                                    <TableCell>{classInfo.subject_code}</TableCell>
                                                                    <TableCell>{classInfo.descriptive_title}</TableCell>
                                                                    {isEvaluated ? (
                                                                        <>
                                                                            <TableCell>
                                                                                {formatGradeDisplay(classInfo.midterm_grade)}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {formatGradeDisplay(classInfo.final_grade)}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                {finalGrade || '-'}
                                                                            </TableCell>
                                                                            <TableCell>
                                                                                <StatusBadge status={status} />
                                                                            </TableCell>
                                                                        </>
                                                                    ) : (
                                                                        <TableCell colSpan='4' className='text-center'>
                                                                            <div className='flex flex-row items-center gap-3 justify-end'>
                                                                                <Link href={route('student.evaluation')}>
                                                                                    <Button variant='link' className='p-0 h-min'>
                                                                                        <span className='font-medium'>Evaluation Required</span>
                                                                                        <ArrowRight className="w-4 h-4 ml-1" />
                                                                                    </Button>
                                                                                </Link>
                                                                            </div>
                                                                        </TableCell>
                                                                    )}
                                                                </TableRow>
                                                            )
                                                        })}
                                                    </>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

export default EnrollmentRecord;
EnrollmentRecord.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;