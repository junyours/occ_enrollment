import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';

export default function DesktopViewClasses({ classes }) {
    const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

    return (
        <Card className="mx-2 md:mx-0 border-border">
            <CardHeader>
                <CardTitle className="text-2xl">Class List</CardTitle>
            </CardHeader>
            <CardContent>
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
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
