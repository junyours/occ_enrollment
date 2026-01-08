import PreLoader from '@/Components/preloader/PreLoader';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatFullName, formatFullNameFML } from '@/Lib/Utils';
import { Head, Link, usePage } from '@inertiajs/react';
import html2canvas from 'html2canvas';
import { AlertCircle, ArrowRight, Download, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import FillUpPrompt from './CollectStudentData/FillUpPrompt';
import { useQuery } from '@tanstack/react-query';
import { computeFinalGrade } from '../Grades/GradeUtility';
import { Badge } from '@/Components/ui/badge';

function EnrollmentRecord({ need_fill_up }) {
    const [error] = useState(null);
    const { user } = usePage().props.auth;

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

    const [downloadingId, setDownloadingId] = useState(null);

    const downloadImage = async (id) => {
        setDownloadingId(id); // Start loading

        const record = records.find(record => record.id == id);

        try {
            await new Promise(resolve => setTimeout(resolve, 100));

            const filename = `${record.year_level_name}_${record.start_year}-${record.end_year}_${record.semester_name}_Semester_${formatFullNameFML(user)}.png`;
            const element = document.getElementById(`${id}-record`);

            if (element) {
                const style = document.createElement("style");
                document.head.appendChild(style);
                style.sheet?.insertRule('body > div:last-child img { display: inline-block; }');
                style.sheet?.insertRule('td div > svg { display: none !important; }');

                const canvas = await html2canvas(element, { scale: 5 });
                const imageUrl = canvas.toDataURL("image/png");

                const link = document.createElement("a");
                link.href = imageUrl;
                link.download = filename;
                link.click();

                style.remove();
            }
        } catch (error) {
            console.error('Error downloading image:', error);
        } finally {
            setDownloadingId(null); // Done loading
        }
    };

    if (need_fill_up) return <FillUpPrompt />

    return (
        <div className='space-y-4 flex items-center flex-col justify-center'>
            <Head title="Enrollment Record" />
            <PageTitle align='center' className='w-full'>ENROLLMENT RECORD</PageTitle>

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
                    {
                        records.map(record => (
                            <div className='relative mb-4' key={record.id} >
                                <div className="absolute top-0 right-0 z-10">
                                    <div className="absolute top-0 right-0 z-10">
                                        <Button
                                            variant="ghost"
                                            className='rounded-none text-blue-500 hover:text-blue-500'
                                            onClick={() => downloadImage(record.id)}
                                            disabled={downloadingId === record.id}
                                        >
                                            {downloadingId === record.id ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Downloading...
                                                </>
                                            ) : (
                                                <>
                                                    Download <Download className="ml-1" />
                                                </>
                                            )}
                                        </Button>
                                    </div>

                                </div>
                                <div className='max-w-[calc(100vw-2rem)] min-w-[calc(100vw-2rem)]
                                    sm:w-auto sm:min-w-0 sm:max-w-none
                                    overflow-x-auto sm:p-0 h-min sm:h-auto'
                                >
                                    <Card id={`${record.id}-record`} className="md:mx-0  w-[1150px]">
                                        <CardHeader>
                                            <CardTitle className="text-2xl">
                                                <div className='w-full flex justify-between gap-2'>
                                                    <div className='flex gap-1'>
                                                        <div className='self-start'>{record.year_level_name} |</div>
                                                        <div className='self-end'>{record.start_year}-{record.end_year} {record.semester_name} Semester</div>
                                                    </div>
                                                    <p className='self-end underline'>{formatFullNameFML(user)}</p>
                                                </div>
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="">
                                            {/* Desktop Table View */}
                                            <div className="">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead className='w-52'>Instructor</TableHead>
                                                            <TableHead className='w-44'>Subject Code</TableHead>
                                                            <TableHead>Descriptive Title</TableHead>
                                                            {/* <TableHead className='w-24'>Midterm</TableHead> */}
                                                            {/* <TableHead className='w-24'>Final</TableHead> */}
                                                            <TableHead className='w-28'>Final Grade</TableHead>
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
                                                                    const isDropped = classInfo.midterm_grade === 0.0 || classInfo.final_grade === 0.0;
                                                                    const isPassed = !isDropped && classInfo.midterm_grade && classInfo.final_grade && finalGrade <= 3;
                                                                    const isFailed = !isDropped && classInfo.midterm_grade && classInfo.final_grade && finalGrade > 3;
                                                                    return (
                                                                        <TableRow key={classInfo.id}>
                                                                            <TableCell>{classInfo.first_name ? formatFullName(classInfo) : '-'}</TableCell>
                                                                            <TableCell>{classInfo.subject_code}</TableCell>
                                                                            <TableCell>{classInfo.descriptive_title}</TableCell>
                                                                            {classInfo.evaluated ? (
                                                                                <>
                                                                                    {/* <TableCell>
                                                                                    {classInfo.midterm_grade === 0.0 ? (
                                                                                        <span className="text-red-500 font-medium">DROPPED</span>
                                                                                    ) : classInfo.midterm_grade ? (
                                                                                        classInfo.midterm_grade?.toFixed(1)
                                                                                    ) : (
                                                                                        '-'
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    {classInfo.final_grade === 0.0 ? (
                                                                                        <span className="text-red-500 font-medium">DROPPED</span>
                                                                                    ) : classInfo.final_grade ? (
                                                                                        classInfo.final_grade?.toFixed(1)
                                                                                    ) : (
                                                                                        '-'
                                                                                    )}
                                                                                </TableCell> */}
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
                                                                                <TableCell colSpan='4' className='text-center'>
                                                                                    <div className='flex flex-row items-center gap-3'>
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
                                </div>
                            </div>
                        ))
                    }
                </>
            )}
        </div>
    )
}

export default EnrollmentRecord
EnrollmentRecord.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
