import PreLoader from '@/Components/preloader/PreLoader';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { convertToAMPM } from '@/Lib/Utils';
import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import TimeTable from '../ScheduleFormats/TimeTable';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import MobileViewClasses from './MobileViewClasses';
import html2canvas from 'html2canvas';
import { ImageDown } from 'lucide-react';

const ViewClasses = () => {
    const [loading, setLaoding] = useState(true)
    const [classes, setClasses] = useState([])
    const { currentSchoolYear } = usePage().props;
    const [scheduleType, setScheduleType] = useState('tabular');

    const getFaucltyCLasses = async () => {
        await axios.post(route('get.faculty.classes'))
            .then(response => {
                setClasses(response.data)
            })
            .finally(() => {
                setLaoding(false)
            })
    }

    useEffect(() => {
        getFaucltyCLasses()
    }, [])

    if (loading) return <PreLoader title="Classes" />

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
            <PageTitle align="center" className=''>{currentSchoolYear.start_year}-{currentSchoolYear.end_year} {currentSchoolYear.semester_name} Semester</PageTitle>
            <div className='flex flex-col sm:flex-row gap-4 items-center'>
                <Card className='w-min'>
                    <CardContent className="p-2">
                        <div className="flex gap-2 w-min">
                            <Tabs className="w-max" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                                <TabsList className="grid max-w-max grid-cols-2">
                                    <TabsTrigger className="w-28" value="tabular">Tabular</TabsTrigger>
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
                <div>
                    <Card className='hidden sm:block'>
                        <CardHeader>
                            <CardTitle className="text-2xl">Class List</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Day</TableHead>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Room</TableHead>
                                        <TableHead className="w-12"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {classes.map(classInfo => (
                                        <React.Fragment key={classInfo.id}>
                                            <TableRow>
                                                <TableCell>{classInfo.day == "TBA" ? '-' : classInfo.day}</TableCell>
                                                <TableCell>{classInfo.descriptive_title}</TableCell>
                                                <TableCell>{classInfo.start_time == 'TBA' ? '-' : `${convertToAMPM(classInfo.start_time)} - ${convertToAMPM(classInfo.end_time)}`}</TableCell>
                                                <TableCell>{classInfo.room_name || '-'}</TableCell>
                                                <TableCell>
                                                    <Link href={`classes/classroom/${classInfo.hashed_year_section_subject_id}`}>
                                                        <Button className="py-0 h-auto" variant="link">open</Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                            {classInfo.secondary_schedule ? (
                                                <TableRow>
                                                    <TableCell>{classInfo.secondary_schedule.day == "TBA" ? '-' : classInfo.secondary_schedule.day}</TableCell>
                                                    <TableCell>{classInfo.descriptive_title} <span className='italic'>(2nd Schedule)</span></TableCell>
                                                    <TableCell>{classInfo.secondary_schedule.start_time == 'TBA' ? '-' : `${convertToAMPM(classInfo.secondary_schedule.start_time)} - ${convertToAMPM(classInfo.secondary_schedule.end_time)}`}</TableCell>
                                                    <TableCell>{classInfo.secondary_schedule.room?.room_name || '-'}</TableCell>
                                                    <TableCell>
                                                        <Link href={`classes/classroom/${classInfo.hashed_year_section_subject_id}`}>
                                                            <Button className="py-0 h-auto" variant="link">open</Button>
                                                        </Link>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                <></>
                                            )}
                                        </React.Fragment>
                                    ))}
                                </TableBody >
                            </Table>
                        </CardContent>
                    </Card>
                    <div className='sm:hidden'>
                        <MobileViewClasses classes={classes} />
                    </div>
                </div>
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
        </div>
    )
}

export default ViewClasses
ViewClasses.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
