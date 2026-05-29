import PreLoader from '@/components/preloader/PreLoader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { convertToAMPM } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import axios from 'axios';
import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query';
import TimeTable from '../ScheduleFormats/TimeTable';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import MobileViewClasses from './MobileViewClasses';
import html2canvas from 'html2canvas';
import { ImageDown, BookOpen, Clock, MapPin, Users, ArrowRight, GraduationCap, Calendar, Loader2, AlertCircle } from 'lucide-react';
import SchoolYearPicker from '@/components/SchoolYearPicker';
import { useSchoolYearStore } from '@/components/useSchoolYearStore';

const CellData = ({ icon, value }) => (
    <div className="flex items-center gap-2">
        {icon}
        <span className="font-medium">
            {value}
        </span>
    </div>
)

const ViewClasses = ({ schoolYears }) => {
    const [scheduleType, setScheduleType] = useState('tabular');
    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const fetchFacultyClasses = async () => {
        const response = await axios.post(route('get.faculty.classes', {
            schoolYearId: selectedSchoolYearEntry.id
        }));

        const yearSectionsSched = response.data.yearSectionsSched;
        const nstpSched = response.data.nstpSched;

        const normalizedNstp = nstpSched.map(sched => ({
            ...sched,
            descriptive_title: `NSTP-${sched.component_name.toUpperCase()}`,
            class_code: `SECTION ${sched.section}`,
        }));

        const mergedSchedules = [
            ...yearSectionsSched,
            ...normalizedNstp,
        ];

        // 1. Create a dictionary to map days to numbers
        const dayOrder = {
            "Monday": 1,
            "Tuesday": 2,
            "Wednesday": 3,
            "Thursday": 4,
            "Friday": 5,
            "Saturday": 6,
            "Sunday": 7
        };

        // 2. Sort the array
        mergedSchedules.sort((a, b) => {
            // Compare by day first
            const dayDifference = dayOrder[a.day] - dayOrder[b.day];

            // If the days are different, sort by the day
            if (dayDifference !== 0) {
                return dayDifference;
            }

            // If the days are the same, sort by start_time ascending
            return a.start_time.localeCompare(b.start_time);
        });

        return mergedSchedules;
    };

    const { data: classes = [], isLoading, isError } = useQuery({
        queryKey: ['get.faculty-classes', selectedSchoolYearEntry?.id],
        queryFn: fetchFacultyClasses,
        enabled: !!selectedSchoolYearEntry?.id,
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    const downloadImage = async () => {
        try {
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

            <div className='flex flex-col sm:flex-row gap-4 items-center'>
                <div className='self-start'>
                    <SchoolYearPicker />
                </div>

                <div className='flex flex-col sm:flex-row gap-4 items-center sm:self-end'>
                    <Card className='w-min'>
                        <CardContent className="p-2">
                            <div className="flex gap-2 w-min">
                                <Tabs
                                    className="w-max"
                                    value={scheduleType}
                                    onValueChange={(value) => setScheduleType(value)}
                                >
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
                        className={`bg-blue-700 hover:bg-blue-600 self-end ${scheduleType == 'timetable' ? '' : 'hidden'}`}
                        onClick={downloadImage}
                    >
                        Download
                        <ImageDown />
                    </Button>
                </div>
            </div>

            {scheduleType == 'tabular' ? (
                <div>
                    {/* Desktop View - Enhanced Card */}
                    <Card className='hidden sm:block shadow-sm border-border/40'>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-xl flex items-center gap-2">
                                <BookOpen className="w-5 h-5" />
                                Class Schedule
                            </CardTitle>
                            <CardDescription>
                                {classes.length > 0 && `${classes.length} class${classes.length !== 1 ? 'es' : ''} scheduled`}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                                    <p className="text-sm">Loading subjects...</p>
                                </div>
                            ) : isError ? (
                                <div className="flex flex-col items-center justify-center py-12 text-destructive">
                                    <AlertCircle className="w-8 h-8 mb-3" />
                                    <p className="text-sm font-medium">Failed to load subjects</p>
                                    <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
                                </div>
                            ) : classes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                                    <p className="text-sm font-medium">No subjects assigned</p>
                                    <p className="text-xs mt-1">Check back later or contact administration</p>
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="hover:bg-transparent">
                                                <TableHead className="font-semibold">Day</TableHead>
                                                <TableHead className="font-semibold">Subject</TableHead>
                                                <TableHead className="font-semibold">Time</TableHead>
                                                <TableHead className="font-semibold">Room</TableHead>
                                                <TableHead className="font-semibold">Section</TableHead>
                                                <TableHead className="w-12 font-semibold">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {classes.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-12">
                                                        <div className="flex flex-col items-center text-muted-foreground">
                                                            <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                                                            <p className="text-sm font-medium">No classes scheduled</p>
                                                            <p className="text-xs mt-1">Check back later or contact administration</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                classes.map((classInfo) => {
                                                    const day = classInfo.day == "TBA" ? '-' : classInfo.day;
                                                    const subject = classInfo.descriptive_title || '-';
                                                    const time = classInfo.start_time == 'TBA' ? '-' : `${convertToAMPM(classInfo.start_time)} - ${convertToAMPM(classInfo.end_time)}`;
                                                    const room = classInfo.room_name || '-';
                                                    const section = classInfo.class_type == 'nstp' ? `${classInfo.component_name}-${classInfo.section}` : `${classInfo.course_name_abbreviation}-${classInfo.year_level_id}${classInfo.section}`;
                                                    const openClassLink = classInfo.class_type != 'nstp' ? `/classes/classroom/${classInfo.hashed_year_section_subject_id}` : `/classes/nstp-classroom/${classInfo.hashed_nstp_sections_id}`;

                                                    return (
                                                        <React.Fragment key={classInfo.id}>
                                                            <TableRow
                                                                className={`group hover:bg-muted/50 transition-colors ${classInfo.secondary_schedule ? "border-b-0" : ""}`}
                                                            >
                                                                <TableCell>
                                                                    <CellData icon={<Calendar className="w-4 h-4 text-muted-foreground" />} value={day} />
                                                                </TableCell>
                                                                <TableCell className="font-medium">
                                                                    {subject}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <CellData icon={<Clock className="w-4 h-4 text-muted-foreground" />} value={time} />
                                                                </TableCell>
                                                                <TableCell>
                                                                    <CellData icon={<MapPin className="w-4 h-4 text-muted-foreground" />} value={room} />
                                                                </TableCell>
                                                                <TableCell rowSpan={classInfo.secondary_schedule ? 2 : 1}>
                                                                    <CellData icon={<Users className="w-4 h-4 text-muted-foreground" />} value={section.toUpperCase()} />
                                                                </TableCell>
                                                                <TableCell rowSpan={classInfo.secondary_schedule ? 2 : 1} className="align-middle text-center">
                                                                    <Link href={openClassLink}>
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="group/btn hover:bg-primary hover:text-primary-foreground transition-all"
                                                                        >
                                                                            Open
                                                                            <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                                                                        </Button>
                                                                    </Link>
                                                                </TableCell>
                                                            </TableRow>

                                                            {(() => {
                                                                if (!classInfo.secondary_schedule) return null;
                                                                const day = classInfo.secondary_schedule.day == "TBA" ? '-' : classInfo.secondary_schedule.day;
                                                                const time = classInfo.secondary_schedule.start_time == 'TBA' ? '-' : `${convertToAMPM(classInfo.secondary_schedule.start_time)} - ${convertToAMPM(classInfo.secondary_schedule.end_time)}`;
                                                                const room = classInfo.secondary_schedule.room_name || '-';

                                                                return (
                                                                    <TableRow className="group hover:bg-muted/50 transition-colors">
                                                                        <TableCell>
                                                                            <CellData icon={<GraduationCap className="w-4 h-4 text-muted-foreground" />} value={day} />
                                                                        </TableCell>

                                                                        <TableCell className="font-medium">
                                                                            {subject}
                                                                            <span className='italic text-muted-foreground text-sm'>
                                                                                (2nd Schedule)
                                                                            </span>
                                                                        </TableCell>

                                                                        <TableCell>
                                                                            <CellData icon={<Clock className="w-4 h-4 text-muted-foreground" />} value={time} />
                                                                        </TableCell>

                                                                        <TableCell>
                                                                            <CellData icon={<MapPin className="w-4 h-4 text-muted-foreground" />} value={room} />
                                                                        </TableCell>
                                                                    </TableRow>
                                                                );
                                                            })()}
                                                        </React.Fragment>
                                                    )
                                                })
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Mobile View - Keep original */}
                    <div className='sm:hidden'>
                        <MobileViewClasses classes={classes} />
                    </div>
                </div>
            ) : (
                <div className='max-w-[calc(100vw-2rem)] min-w-[calc(100vw-2rem)] max-h-[calc(100vh-19rem)] min-h-[calc(100vh-19rem)] sm:w-auto sm:min-w-0 sm:max-w-none sm:h-auto sm:min-h-0 sm:max-h-none overflow-x-auto sm:p-0'
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