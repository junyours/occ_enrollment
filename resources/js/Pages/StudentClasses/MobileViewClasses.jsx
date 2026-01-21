import React from 'react'
import { Badge } from '@/Components/ui/badge'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card'
import { convertToAMPM, formatFullName } from '@/Lib/Utils'
import { Clock, MapPin, User, BookOpen, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { Link } from '@inertiajs/react'

function MobileViewClasses({ classes, isLoading, isError, error }) {

    return (
        <div>
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
                <>
                    {classes.map((classInfo) => (
                        <React.Fragment key={classInfo.id}>
                            {/* Primary Schedule */}
                            <Card className="mb-3">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center space-x-3">
                                        <div
                                            className={`w-3 h-3 rounded-full ${classInfo.day ===
                                                new Date().toLocaleString('en-US', {
                                                    weekday: 'long',
                                                })
                                                ? 'bg-green-500'
                                                : 'bg-blue-700'
                                                }`}
                                        />
                                        <div>
                                            <CardTitle className="text-base">
                                                {classInfo.descriptive_title}
                                            </CardTitle>
                                            <CardDescription>
                                                {classInfo.type == 'nstp' ? (
                                                    <>
                                                        {
                                                            classInfo.nstp_day === 'TBA'
                                                                ? '-'
                                                                : classInfo.nstp_day
                                                        }
                                                    </>
                                                ) : (
                                                    <>
                                                        {
                                                            classInfo.day === 'TBA'
                                                                ? '-'
                                                                : classInfo.day
                                                        }
                                                    </>
                                                )}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-0">
                                    {(classInfo.type == 'nstp' && !classInfo.nstp_student_schedule_id) ? (
                                        <div className="mx-auto max-w-md rounded-2xl border bg-background p-6 shadow-sm">
                                            <h2 className="text-xl font-semibold tracking-tight">
                                                Enroll now
                                            </h2>

                                            <p className="mt-2 text-sm text-muted-foreground">
                                                Select the NSTP component you took last semester.
                                            </p>

                                            <div className="mt-6 grid gap-3">
                                                <Link href={route('nstp-enrollment', { component: 'rotc', id: classInfo.student_subject_id })} className="group">
                                                    <Button
                                                        variant="outline"
                                                        className="flex w-full items-center justify-between py-6 text-base transition-all group-hover:bg-muted"
                                                    >
                                                        ROTC
                                                        <ArrowRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-1" />
                                                    </Button>
                                                </Link>

                                                <Link href={route('nstp-enrollment', { component: 'cwts', id: classInfo.student_subject_id })} className="group">
                                                    <Button
                                                        variant="outline"
                                                        className="flex w-full items-center justify-between py-6 text-base transition-all group-hover:bg-muted"
                                                    >
                                                        CWTS
                                                        <ArrowRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-1" />
                                                    </Button>
                                                </Link>

                                                <Link href={route('nstp-enrollment', { component: 'lts', id: classInfo.student_subject_id })} className="group">
                                                    <Button
                                                        variant="outline"
                                                        className="flex w-full items-center justify-between py-6 text-base transition-all group-hover:bg-muted"
                                                    >
                                                        LTS
                                                        <ArrowRight className="h-4 w-4 opacity-70 transition-transform group-hover:translate-x-1" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="space-y-2">
                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <Clock className="w-4 h-4" />
                                                    {classInfo.type == 'nstp' ? (
                                                        <>
                                                            <span>
                                                                {classInfo.nstp_start_time === 'TBA'
                                                                    ? '-'
                                                                    : `${convertToAMPM(
                                                                        classInfo.nstp_start_time
                                                                    )} - ${convertToAMPM(
                                                                        classInfo.nstp_end_time
                                                                    )}`}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>
                                                                {classInfo.start_time === 'TBA'
                                                                    ? '-'
                                                                    : `${convertToAMPM(
                                                                        classInfo.start_time
                                                                    )} - ${convertToAMPM(
                                                                        classInfo.end_time
                                                                    )}`}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <MapPin className="w-4 h-4" />
                                                    {classInfo.type == 'nstp' ? (
                                                        <>
                                                            <span>
                                                                {classInfo.nstp_room_name || '-'}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>
                                                                {classInfo.room_name || '-'}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>

                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <User className="w-4 h-4" />
                                                    {classInfo.type == 'nstp' ? (
                                                        <>
                                                            {classInfo.type === 'nstp' ? (
                                                                <span>
                                                                    {classInfo.nstp_faculty_first_name
                                                                        ? formatFullName({
                                                                            first_name: classInfo.nstp_faculty_first_name,
                                                                            middle_name: classInfo.nstp_faculty_middle_name,
                                                                            last_name: classInfo.nstp_faculty_last_name,
                                                                        })
                                                                        : '-'}
                                                                </span>
                                                            ) : (
                                                                <span>-</span> // or whatever you want for non-NSTP
                                                            )}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span>
                                                                {classInfo.first_name
                                                                    ? formatFullName(classInfo)
                                                                    : '-'}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Secondary Schedule */}
                            {classInfo.secondary_schedule && (
                                <Card className="mb-3">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className={`w-3 h-3 rounded-full ${classInfo.secondary_schedule.day ===
                                                    new Date().toLocaleString('en-US', {
                                                        weekday: 'long',
                                                    })
                                                    ? 'bg-green-500'
                                                    : 'bg-blue-500'
                                                    }`}
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <CardTitle className="text-base">
                                                        {
                                                            classInfo.descriptive_title
                                                        }
                                                    </CardTitle>
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        2nd Schedule
                                                    </Badge>
                                                </div>
                                                <CardDescription>
                                                    {classInfo.secondary_schedule
                                                        .day === 'TBA'
                                                        ? '-'
                                                        : classInfo.secondary_schedule
                                                            .day}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="pt-0">
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                <Clock className="w-4 h-4" />
                                                <span>
                                                    {classInfo.secondary_schedule
                                                        .start_time === 'TBA'
                                                        ? '-'
                                                        : `${convertToAMPM(
                                                            classInfo
                                                                .secondary_schedule
                                                                .start_time
                                                        )} - ${convertToAMPM(
                                                            classInfo
                                                                .secondary_schedule
                                                                .end_time
                                                        )}`}
                                                </span>
                                            </div>

                                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                <MapPin className="w-4 h-4" />
                                                <span>
                                                    {classInfo.secondary_schedule
                                                        .room_name || '-'}
                                                </span>
                                            </div>

                                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                <User className="w-4 h-4" />
                                                <span>
                                                    {classInfo.first_name
                                                        ? formatFullName(classInfo)
                                                        : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </React.Fragment>
                    ))}
                </>
            )}
        </div>
    )
}

export default MobileViewClasses
