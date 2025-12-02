import PreLoader from '@/Components/preloader/PreLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Separator } from '@/Components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { FaExclamationTriangle } from 'react-icons/fa';
import TimeTable from '../ScheduleFormats/TimeTable';
import MobileViewClasses from './MobileViewClasses';
import html2canvas from 'html2canvas';
import { Button } from '@/Components/ui/button';
import { ImageDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

const ViewClasses = ({ currentSchoolYear }) => {
    const [loading, setLoading] = useState(true);
    const [scheduleType, setScheduleType] = useState('tabular');

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
        staleTime: 1000 * 60 * 60 * 24 * 30, // cache for 30 days
        retry: 1,
    });

    if (isLoading) return <PreLoader title="Classes" />

    if (!currentSchoolYear) {
        return (
            <div className="flex items-center justify-center rounded-md shadow-sm">
                Current School Year not set yet
            </div>
        );
    }

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

            {scheduleType == 'tabular' ? (
                <>
                    {/* Desktop Table View */}
                    <Card className="mx-2 md:mx-0 hidden md:block">
                        <CardHeader>
                            <CardTitle className="text-2xl">Class List</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div>
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
                                        {error ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className='text-center'>{error}</TableCell>
                                            </TableRow>
                                        ) : (
                                            <>
                                                {classes.map((classInfo) => (
                                                    <React.Fragment key={classInfo.id}>
                                                        <TableRow>
                                                            <TableCell>{classInfo.descriptive_title}</TableCell>
                                                            <TableCell>{classInfo.day == "TBA" ? '-' : classInfo.day}</TableCell>
                                                            <TableCell>{classInfo.start_time == 'TBA' ? '-' : `${convertToAMPM(classInfo.start_time)} - ${convertToAMPM(classInfo.end_time)}`}</TableCell>
                                                            <TableCell>{classInfo.room_name || '-'}</TableCell>
                                                            <TableCell>{classInfo.first_name ? formatFullName(classInfo) : '-'}</TableCell>
                                                        </TableRow>

                                                        {classInfo.secondary_schedule ? (
                                                            <TableRow>
                                                                <TableCell>{classInfo.descriptive_title} <span className='italic'>(2nd Schedule)</span></TableCell>
                                                                <TableCell>{classInfo.secondary_schedule.day == "TBA" ? '-' : classInfo.secondary_schedule.day}</TableCell>
                                                                <TableCell>{classInfo.secondary_schedule.start_time == 'TBA' ? '-' : `${convertToAMPM(classInfo.secondary_schedule.start_time)} - ${convertToAMPM(classInfo.secondary_schedule.end_time)}`}</TableCell>
                                                                <TableCell>{classInfo.secondary_schedule.room_name || '-'}</TableCell>
                                                                <TableCell>{classInfo.first_name ? formatFullName(classInfo) : '-'}</TableCell>
                                                            </TableRow>
                                                        ) : (
                                                            <></>
                                                        )}
                                                    </React.Fragment>
                                                ))}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Mobile Card View */}
                    <div className='sm:hidden'>
                        <MobileViewClasses classes={classes} />
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
