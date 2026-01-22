import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import React, { useState } from 'react'
import TimeTable from '../ScheduleFormats/TimeTable';
import MobileViewClasses from './MobileViewClasses';
import html2canvas from 'html2canvas';
import { Button } from '@/Components/ui/button';
import { AlertCircle, ArrowRight, BookOpen, ImageDown, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const ViewClasses = ({ currentSchoolYear }) => {
    const [scheduleType, setScheduleType] = useState('tabular');

    if (!currentSchoolYear) {
        return (
            <div className="flex items-center justify-center rounded-md shadow-sm">
                Current School Year not set yet
            </div>
        );
    }

    const fetchStudentClasses = async ({ queryKey }) => {
        const [, schoolYearId] = queryKey;
        const response = await axios.post(route('student.classes'), {
            schoolYearId,
        });
        return response.data;
    };

    const { data: classes, error, isLoading, isError } = useQuery({
        queryKey: ['studentClasses', currentSchoolYear.id],
        queryFn: fetchStudentClasses,
        enabled: !!currentSchoolYear?.id,
        retry: 1,
    });

    const downloadImage = async () => {
        try {
            // Small delay to let the UI update and show the spinner
            await new Promise(resolve => setTimeout(resolve, 100));

            const filename = `classes.png`;
            const element = document.getElementById(`classes`);

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
        }
    };

    return (
        <div className='space-y-4'>
            <Head title="Classes" />
            <PageTitle align="center" className='text-lg md:text-xl lg:text-2xl px-4'>
                {currentSchoolYear.start_year}-{currentSchoolYear.end_year} {currentSchoolYear.semester_name} Semester
            </PageTitle>
            {classes?.length > 0 && (
                <div className='flex flex-col sm:flex-row gap-4 items-center'>
                    <Card className='w-min'>
                        <CardContent className="p-2">
                            <div className="flex gap-2 w-min">
                                <Tabs className="w-max" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                                    <TabsList className="grid max-w-max grid-cols-2">
                                        <TabsTrigger className="w-28" value="tabular">List</TabsTrigger>
                                        <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </div>
                        </CardContent>
                    </Card>

                    <Button
                        size='lg'
                        className={`bg-blue-700 hover:bg-blue-600 ${scheduleType == 'timetable' ? '' : 'hidden'}`}
                        onClick={downloadImage}
                    >
                        Download
                        <ImageDown />
                    </Button>
                </div>
            )}

            {scheduleType == 'tabular' ? (
                <>
                    {/* Desktop Table View */}
                    <Card className="mx-2 md:mx-0 hidden md:block">
                        <CardHeader>
                            <CardTitle className="text-2xl">Class List</CardTitle>
                        </CardHeader>
                        <CardContent>


                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                                    <p className="text-sm">Loading classes...</p>
                                </div>
                            ) : isError ? (
                                <div className="flex flex-col items-center justify-center py-12 text-destructive">
                                    <AlertCircle className="w-8 h-8 mb-3" />
                                    <p className="text-sm font-medium">Failed to load classes</p>
                                    <p className="text-xs text-muted-foreground mt-1">{error.response?.data?.error ?? 'Please try again later'}</p>

                                </div>
                            ) : classes?.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                                    <p className="text-sm font-medium">No classes</p>
                                    <p className="text-xs mt-1">Check back later or contact administration</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Subject</TableHead>
                                            <TableHead>Day</TableHead>
                                            <TableHead>Time</TableHead>
                                            <TableHead>Room</TableHead>
                                            <TableHead>Instructor</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isError ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center text-red-600">
                                                    {error.response?.data?.error ?? 'Unable to load classes.'}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <>
                                                {classes.map((classInfo) => (
                                                    <React.Fragment key={classInfo.id}>
                                                        {/* Primary schedule row */}
                                                        <TableRow>
                                                            <TableCell className="font-medium">
                                                                {classInfo.type === 'nstp' && !classInfo.nstp_student_schedule_id
                                                                    ? 'NSTP - Select the NSTP component you took last semester.'
                                                                    : classInfo.descriptive_title}
                                                            </TableCell>

                                                            {classInfo.type === 'nstp' && !classInfo.nstp_student_schedule_id ? (
                                                                <>
                                                                    <TableCell colSpan={4}>
                                                                        <div className="grid grid-cols-3 gap-3">
                                                                            {['rotc', 'cwts', 'lts'].map((component) => (
                                                                                <Link
                                                                                    key={component}
                                                                                    href={route('nstp-enrollment', {
                                                                                        component,
                                                                                        id: classInfo.student_subject_id,
                                                                                    })}
                                                                                    className="group"
                                                                                >
                                                                                    <Button
                                                                                        variant="outline"
                                                                                        className="w-full justify-between"
                                                                                    >
                                                                                        {component.toUpperCase()}
                                                                                        <ArrowRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-1" />
                                                                                    </Button>
                                                                                </Link>
                                                                            ))}
                                                                        </div>
                                                                    </TableCell>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <TableCell>
                                                                        {classInfo.day === 'TBA' ? '-' : classInfo.day}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        {classInfo.start_time === 'TBA'
                                                                            ? '-'
                                                                            : `${convertToAMPM(classInfo.start_time)} – ${convertToAMPM(classInfo.end_time)}`}
                                                                    </TableCell>
                                                                    <TableCell>{classInfo.room_name || '-'}</TableCell>
                                                                    <TableCell>
                                                                        {classInfo.first_name ? formatFullName(classInfo) : '-'}
                                                                    </TableCell>
                                                                </>
                                                            )}
                                                        </TableRow>

                                                        {/* Secondary schedule */}
                                                        {classInfo.secondary_schedule && (
                                                            <TableRow className="italic text-muted-foreground">
                                                                <TableCell>
                                                                    {classInfo.descriptive_title} (2nd Schedule)
                                                                </TableCell>
                                                                <TableCell>
                                                                    {classInfo.secondary_schedule.day === 'TBA'
                                                                        ? '-'
                                                                        : classInfo.secondary_schedule.day}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {classInfo.secondary_schedule.start_time === 'TBA'
                                                                        ? '-'
                                                                        : `${convertToAMPM(classInfo.secondary_schedule.start_time)} – ${convertToAMPM(classInfo.secondary_schedule.end_time)}`}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {classInfo.secondary_schedule.room_name || '-'}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {classInfo.first_name ? formatFullName(classInfo) : '-'}
                                                                </TableCell>
                                                            </TableRow>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Mobile Card View */}
                    <div className='sm:hidden'>
                        <MobileViewClasses classes={classes} isLoading={isLoading} isError={isError} error={error} />
                    </div>
                </>
            ) : (
                <div className='max-w-[calc(100vw-2rem)] min-w-[calc(100vw-2rem)]
                                    max-h-[calc(100vh-19rem)] min-h-[calc(100vh-19rem)]
                                    sm:w-auto sm:min-w-0 sm:max-w-none
                                    sm:h-auto sm:min-h-0 sm:max-h-none
                                    overflow-x-auto sm:p-0'
                >
                    <Card id='classes' className='w-[1200px] sm:w-auto pt-6'>
                        <CardContent>
                            <TimeTable data={classes} />
                        </CardContent>
                    </Card>
                </div>
            )}
        </div >
    );
};

export default ViewClasses
ViewClasses.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
