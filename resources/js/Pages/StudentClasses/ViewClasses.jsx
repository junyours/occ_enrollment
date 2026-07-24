import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import axios from 'axios';
import React, { useState } from 'react'
import MobileViewClasses from './MobileViewClasses';
import { AlertCircle, BookOpen, ImageDown, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import EnrollmentSchedule from './EnrollmentSchedule';
import DownloadableTimetable from './ClassesComponents/DownloadableTimetable';
import { Separator } from '@/Components/ui/separator';
import { PageTitle } from '@/Components/ui/PageTitle';

const DAY_ORDER = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
    TBA: 99,
};

const ViewClasses = ({ currentSchoolYear }) => {
    const [scheduleType, setScheduleType] = useState('tabular');

    if (!currentSchoolYear) {
        return (
            <section className="flex items-center justify-center rounded-md shadow-sm p-8 text-muted-foreground">
                Current School Year not set yet
            </section>
        );
    }

    const toMinutes = (time) => {
        if (!time || time === 'TBA') return Number.MAX_SAFE_INTEGER;
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const sortClasses = (classes) => {
        return [...classes].sort((a, b) => {
            const dayDiff =
                (DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99);

            if (dayDiff !== 0) return dayDiff;

            return toMinutes(a.start_time) - toMinutes(b.start_time);
        });
    };

    const fetchStudentClasses = async ({ queryKey }) => {
        const [, schoolYearId] = queryKey;

        const response = await axios.post(route('student.classes'), {
            schoolYearId,
        });

        return sortClasses(response.data);
    };

    const { data: classes, error, isLoading, isError } = useQuery({
        queryKey: ['studentClasses', currentSchoolYear.id],
        queryFn: fetchStudentClasses,
        enabled: !!currentSchoolYear?.id,
        retry: 1,
    });

    const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());
    const schoolYear = currentSchoolYear.start_year + '-' + currentSchoolYear.end_year + ' ' + currentSchoolYear.semester_name + ' Semester';

    return (
        <main className='space-y-6'>
            <PageTitle align="center" className='text-lg md:text-xl lg:text-2xl px-4'>
                {schoolYear}
            </PageTitle>

            {classes?.length > 0 && (
                <header className='flex flex-col sm:flex-row gap-4 items-center'>
                    <Card className='w-min'>
                        <CardContent className="p-2">
                            <nav className="flex gap-2 w-min">
                                <Tabs className="w-max" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                                    <TabsList className="grid max-w-max grid-cols-2">
                                        <TabsTrigger className="w-28" value="tabular">List</TabsTrigger>
                                        <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </nav>
                        </CardContent>
                    </Card>
                </header>
            )}

            {scheduleType == 'tabular' ? (
                <>
                    {/* Desktop Table View */}
                    <Card className="mx-2 md:mx-0 hidden md:block border-border">
                        <CardHeader>
                            <CardTitle className="text-2xl">Class List</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <article className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                                    <p className="text-sm">Loading classes...</p>
                                </article>
                            ) : isError ? (
                                <article className="flex flex-col items-center justify-center py-12 text-destructive">
                                    <AlertCircle className="w-8 h-8 mb-3" />
                                    <p className="text-sm font-medium">Failed to load classes</p>
                                    <p className="text-xs text-muted-foreground mt-1">{error.response?.data?.error ?? 'Please try again later'}</p>
                                </article>
                            ) : classes?.length === 0 ? (
                                <article className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                                    <p className="text-sm font-medium">No classes</p>
                                    <p className="text-xs mt-1">Check back later or contact administration</p>
                                </article>
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
                                                <TableCell colSpan={5} className="text-center text-destructive">
                                                    {error.response?.data?.error ?? 'Unable to load classes.'}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            <>
                                                {classes.map((classInfo) => {
                                                    const isPrimaryToday = classInfo.day === today;
                                                    const isSecondaryToday = classInfo.secondary_schedule?.day === today;
                                                    const highlightClass = "bg-primary/[0.04] dark:bg-primary/[0.08] relative after:absolute after:left-0 after:top-1 after:bottom-1 after:w-1 after:bg-primary after:rounded-r-full after:shadow-[2px_0_10px_rgba(var(--primary),0.4)]";

                                                    return (
                                                        <React.Fragment key={classInfo.id}>
                                                            {/* Primary schedule row */}
                                                            <TableRow className={`${isPrimaryToday ? highlightClass : "hover:bg-muted/40"}`}>
                                                                <TableCell className="font-medium">
                                                                    <span className="flex items-center gap-3">
                                                                        {isPrimaryToday && (
                                                                            <span className="relative flex h-2 w-2">
                                                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                                                            </span>
                                                                        )}
                                                                        <span className={isPrimaryToday ? "text-primary font-bold" : "text-foreground"}>
                                                                            {classInfo.type === 'nstp' && !classInfo.nstp_student_schedule_id
                                                                                ? 'NSTP - Select Component'
                                                                                : classInfo.descriptive_title} {classInfo.component_name ? `| ${classInfo.component_name.toUpperCase()}` : ''}
                                                                        </span>
                                                                    </span>
                                                                </TableCell>

                                                                {classInfo.type === 'nstp' && !classInfo.nstp_student_schedule_id ? (
                                                                    <TableCell colSpan={4}>
                                                                        <span className='font-semibold'>Visit nstp office for scheduling</span>
                                                                    </TableCell>
                                                                ) : (
                                                                    <>
                                                                        <TableCell className={isPrimaryToday ? "text-primary font-bold" : ""}>
                                                                            {classInfo.day === 'TBA' ? '-' : classInfo.day}
                                                                        </TableCell>
                                                                        <TableCell className={`tabular-nums ${isPrimaryToday ? "text-primary font-medium" : ""}`}>
                                                                            {classInfo.start_time === 'TBA' ? '-' : `${convertToAMPM(classInfo.start_time)} – ${convertToAMPM(classInfo.end_time)}`}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            <span className={`px-2 py-0.5 rounded text-xs font-medium tracking-wide`}>
                                                                                {classInfo.room_name || 'TBA'}
                                                                            </span>
                                                                        </TableCell>
                                                                        <TableCell rowSpan={classInfo.secondary_schedule ? 2 : 1} className="border-l border-border">
                                                                            {classInfo.first_name ? formatFullName(classInfo) : '-'}
                                                                        </TableCell>
                                                                    </>
                                                                )}
                                                            </TableRow>

                                                            {/* Secondary schedule */}
                                                            {classInfo.secondary_schedule && (
                                                                <TableRow className={`${isSecondaryToday ? highlightClass : ""}`}>
                                                                    <TableCell className="font-medium">
                                                                        <span className="flex items-center gap-3">
                                                                            {isSecondaryToday && (
                                                                                <span className="relative flex h-2 w-2">
                                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                                                                </span>
                                                                            )}
                                                                            <span className="flex flex-col">
                                                                                <span className={isSecondaryToday ? "text-primary font-bold" : ""}>
                                                                                    {classInfo.descriptive_title} <span className="text-[10px] font-extralight italic uppercase text-muted-foreground ml-1">2nd Schedule</span>
                                                                                </span>
                                                                            </span>
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className={isSecondaryToday ? "text-primary font-bold" : ""}>
                                                                        {classInfo.secondary_schedule.day}
                                                                    </TableCell>
                                                                    <TableCell className={`tabular-nums ${isSecondaryToday ? "text-primary font-medium" : ""}`}>
                                                                        {convertToAMPM(classInfo.secondary_schedule.start_time)} – {convertToAMPM(classInfo.secondary_schedule.end_time)}
                                                                    </TableCell>
                                                                    <TableCell>
                                                                        <span className={`px-2 py-0.5 rounded text-xs font-medium tracking-wide`}>
                                                                            {classInfo.secondary_schedule.room_name || 'TBA'}
                                                                        </span>
                                                                    </TableCell>
                                                                </TableRow>
                                                            )}
                                                        </React.Fragment>
                                                    );
                                                })}
                                            </>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>

                    {/* Mobile Card View */}
                    <aside className='sm:hidden'>
                        <MobileViewClasses classes={classes} isLoading={isLoading} isError={isError} error={error} />
                    </aside>
                </>
            ) : (
                <div>
                    <DownloadableTimetable classes={classes} schoolYear={schoolYear} />
                </div>
            )}

            <Separator />

            {/* Recreated Enrollment Schedule using native Shadcn styling */}
            <EnrollmentSchedule />
        </main>
    );
};

export default ViewClasses
ViewClasses.layout = (page) => <AuthenticatedLayout title="Classes" children={page} />;