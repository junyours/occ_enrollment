import React from 'react'
import { Link, router } from '@inertiajs/react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { classLink, isDropped } from './ClassesComponents/classLink';

const LINK = 'rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

// The whole row opens the class; the title link handles its own clicks.
function openRow(href) {
    return href
        ? (event) => {
            if (!event.target.closest('a')) router.visit(href);
        }
        : undefined;
}

export default function DesktopViewClasses({ classes }) {
    const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

    return (
        <Card className="mx-2 md:mx-0 border-border">
            <CardHeader>
                <CardTitle className="text-2xl">Class List</CardTitle>
                <CardDescription>Open a class to see its assignments and materials.</CardDescription>
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
                            const href = classLink(classInfo);
                            const title = classInfo.type === 'nstp' && !classInfo.nstp_student_schedule_id
                                ? 'NSTP - Select Component'
                                : `${classInfo.descriptive_title}${classInfo.component_name ? ` | ${classInfo.component_name.toUpperCase()}` : ''}`;

                            return (
                                <React.Fragment key={classInfo.id}>
                                    {/* Primary schedule row */}
                                    <TableRow
                                        className={`${isPrimaryToday ? highlightClass : "hover:bg-muted/40"} ${href ? 'cursor-pointer' : ''}`}
                                        onClick={openRow(href)}
                                    >
                                        <TableCell className="font-medium">
                                            <span className="flex items-center gap-3">
                                                {isPrimaryToday && (
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                                    </span>
                                                )}
                                                <span className={isPrimaryToday ? "text-primary font-bold" : "text-foreground"}>
                                                    {href ? <Link href={href} className={LINK}>{title}</Link> : title}
                                                </span>
                                                {isDropped(classInfo) && (
                                                    <Badge variant="outline" className="font-normal text-muted-foreground">Dropped</Badge>
                                                )}
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
                                        <TableRow
                                            className={`${isSecondaryToday ? highlightClass : "hover:bg-muted/40"} ${href ? 'cursor-pointer' : ''}`}
                                            onClick={openRow(href)}
                                        >
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
                                                            {href ? <Link href={href} className={LINK}>{classInfo.descriptive_title}</Link> : classInfo.descriptive_title}
                                                            {' '}<span className="text-[10px] font-extralight italic uppercase text-muted-foreground ml-1">2nd Schedule</span>
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
