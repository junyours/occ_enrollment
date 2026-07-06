import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatFullName, formatFullNameFML } from '@/Lib/Utils';
import { Head, Link, usePage } from '@inertiajs/react';
import html2canvas from 'html2canvas';
import { AlertCircle, ArrowRight, BookOpen, Download, Loader2 } from 'lucide-react';
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/Components/ui/badge';
import FillUpPrompt from '../CollectStudentData/FillUpPrompt';
import { computeFinalGrade } from '@/Pages/Grades/GradeUtility';
import DownloadMode from './DownloadMode';

function EnrollmentRecord({ need_fill_up }) {
    const [error] = useState(null);

    const getStudentEnrollmentRecord = async () => {
        const response = await axios.post(route('enrollment-record'))
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

    const [downloadMode, setDownloadMode] = useState(false);

    if (need_fill_up) return <FillUpPrompt />

    return (
        <div className='space-y-4 flex flex-col justify-center'>
            <Head title="Enrollment Record" />
            <PageTitle align='center' className='w-full'>ENROLLMENT RECORD</PageTitle>

            {records?.length > 0 && (
                <Button
                    onClick={() => setDownloadMode(!downloadMode)}
                    variant={downloadMode ? "destructive" : "default"}
                    className="flex items-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    {downloadMode ? 'Exit Download Mode' : 'Download Mode'}
                </Button>
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
            ) : (
                <>
                    {downloadMode ? (
                        <DownloadMode records={records} />
                    ) : (
                        <>
                            <div className='max-w-[calc(100vw-2rem)] min-w-[calc(100vw-2rem)]  sm:w-auto sm:min-w-0 sm:max-w-none  overflow-x-auto sm:p-0 h-min sm:h-auto'>
                                <div className='space-y-4'>
                                    {
                                        records.map(record => (
                                            <Card id={`${record.id}-record`} key={record.id} className="md:mx-0 w-[1150px]">
                                                <CardHeader>
                                                    <CardTitle className="text-2xl">
                                                        <div className='w-full flex justify-between gap-2'>
                                                            <div className='flex flex-row gap-1'>
                                                                <div className=''>{record.year_level_name} |</div>
                                                                <div className='flex gap-2'>{record.start_year}-{record.end_year} {record.semester_name} Semester</div>
                                                            </div>
                                                            {/* <p className='self-end underline'>{formatFullNameFML(user)}</p> */}
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
                                                                        <TableCell colSpan={5} className='text-center'>{error}</TableCell>
                                                                    </TableRow>
                                                                ) : (
                                                                    <>
                                                                        {record.subjects.map(classInfo => {
                                                                            const finalGrade = computeFinalGrade(classInfo.midterm_grade, classInfo.final_grade);
                                                                            const isDropped = classInfo.midterm_grade == 0.0 || classInfo.final_grade == 0.0;
                                                                            const isPassed = !isDropped && classInfo.midterm_grade && classInfo.final_grade && finalGrade <= 3;
                                                                            const isFailed = !isDropped && classInfo.midterm_grade && classInfo.final_grade && finalGrade > 3;
                                                                            return (
                                                                                <TableRow key={classInfo.id}>
                                                                                    <TableCell>{classInfo.first_name ? formatFullName(classInfo) : classInfo.nstp_faculty_first_name ? formatFullName({ first_name: classInfo.nstp_faculty_first_name, last_name: classInfo.nstp_faculty_last_name, middle_name: classInfo.nstp_faculty_middle_name }) : '-'}</TableCell>
                                                                                    <TableCell>{classInfo.subject_code}</TableCell>
                                                                                    <TableCell>{classInfo.descriptive_title}</TableCell>
                                                                                    {classInfo.evaluated ? (
                                                                                        <>
                                                                                            <TableCell>
                                                                                                {classInfo.midterm_grade === 0.0 ? (
                                                                                                    <span className="text-red-500 font-medium">DROPPED</span>
                                                                                                ) : classInfo.midterm_grade ? (
                                                                                                    classInfo.midterm_grade?.toFixed(1)
                                                                                                ) : (
                                                                                                    '-'
                                                                                                )}
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                {classInfo.final_grade == 0.0 ? (
                                                                                                    <span className="text-red-500 font-medium">DROPPED</span>
                                                                                                ) : classInfo.final_grade ? (
                                                                                                    classInfo.final_grade?.toFixed(1)
                                                                                                ) : (
                                                                                                    '-'
                                                                                                )}
                                                                                            </TableCell>
                                                                                            { }
                                                                                            <TableCell>
                                                                                                {finalGrade || '-'}
                                                                                            </TableCell>
                                                                                            <TableCell>
                                                                                                {isDropped ? (
                                                                                                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 font-semibold">
                                                                                                        DROPPED
                                                                                                    </Badge>
                                                                                                ) : isPassed ? (
                                                                                                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 font-semibold">
                                                                                                        PASSED
                                                                                                    </Badge>
                                                                                                ) : isFailed ? (
                                                                                                    <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 font-semibold">
                                                                                                        FAILED
                                                                                                    </Badge>
                                                                                                ) : (
                                                                                                    <span className="text-slate-400">-</span>
                                                                                                )}
                                                                                            </TableCell></>
                                                                                    ) : (
                                                                                        <TableCell colSpan='4' className='text-center '>
                                                                                            <div className='flex flex-row items-center gap-3 justify-end'>
                                                                                                <Link href={route('student.evaluation')}>
                                                                                                    <Button variant='link' className='p-0 h-min'>
                                                                                                        <span className='font-medium'>Evaluation Required</span>
                                                                                                        <ArrowRight />
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
                                        ))
                                    }
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}
        </div>
    )
}

export default EnrollmentRecord
EnrollmentRecord.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
