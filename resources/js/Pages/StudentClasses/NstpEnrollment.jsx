import { PageTitle } from '@/Components/ui/PageTitle'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { AlertCircle, AlertTriangle, BookOpen, Info, Loader2 } from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import SectionSkeleton from '../NstpDirector/ComponentSection/SectionSkeleton'
import { convertToAMPM, formatFullName } from '@/Lib/Utils'
import { Button } from '@/Components/ui/button'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog'
import { Progress } from '@/Components/ui/progress'
import { detectTwoScheduleConflict } from '@/Lib/ConflictUtilities'
import { Card, CardContent } from '@/Components/ui/card'

const semesterDisplayMap = {
    First: <div>1<sup>st</sup> Sem</div>,
    Second: <div>2<sup>nd</sup> Sem</div>,
    Summer: 'Summer Term',
}

const ENROLL_DELAY = 3000

const TableHeadTemplate = ({ children }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    {/* <TableHead>Room</TableHead> */}
                    {/* <TableHead>Instructor</TableHead> */}
                    <TableHead />
                </TableRow>
            </TableHeader>
            <TableBody>
                {children}
            </TableBody>
        </Table>
    );
};

export default function NstpEnrollment({ component, studentSubjectId, schoolYear, enrolled = false }) {
    const [alreadyEnrolled, setAlreadyEnrolled] = useState(enrolled)

    const getComponentSections = async () => {
        const response = await axios.post('', {
            schoolYearId: schoolYear.id,
        })
        return response.data;
    }

    const { data, isError, isLoading, refetch } = useQuery({
        queryKey: ['nstp-enrollment', component, studentSubjectId, schoolYear?.id],
        queryFn: getComponentSections,
    });

    const fetchStudentClasses = async () => {
        const response = await axios.post(route('student.classes'), {
            schoolYearId: schoolYear.id,
        });
        return response.data;
    };

    const { data: classes, error, isLoading: classesLoading, isError: classesIsError } = useQuery({
        queryKey: ['studentClasses-nstp-enrollment', schoolYear?.id],
        queryFn: fetchStudentClasses,
        enabled: !!schoolYear?.id,
        retry: 1,
    });

    const [open, setOpen] = useState(false)
    const [cancelButtonDisabled, setCancelButtonDisabled] = useState(false)
    const [enrolling, setEnrolling] = useState(false)
    const timerRef = useRef(null)

    const startEnroll = (id) => {
        setOpen(true)
        setEnrolling(true)

        timerRef.current = setTimeout(async () => {
            setCancelButtonDisabled(true);
            await axios.post(route("nstp-enrollment.enroll"), {
                nstpSectionScheduleId: id,
                studentSubjectId: studentSubjectId
            })
                .then((response) => {
                    refetch()
                    if (response.data.message == 'success') {
                        toast.success("Enrolled successfully")
                        setAlreadyEnrolled(true);
                    }
                })
                .catch((error) => {
                    const message =
                        error.response?.data?.message ||
                        "Enrollment failed. Please try again.";

                    toast.error(message);
                    refetch();
                })
                .finally(() => {
                    setProgress(100)
                    setTimeout(() => {
                        setEnrolling(false)
                        setOpen(false)
                    }, 150)
                    setCancelButtonDisabled(false);
                })
        }, ENROLL_DELAY)
    }

    const cancelEnroll = () => {
        clearTimeout(timerRef.current)
        setEnrolling(false)
        setOpen(false)
        toast("Enrollment canceled")
    }

    const [progress, setProgress] = useState(0)

    useEffect(() => {
        if (!open || !enrolling) return

        setProgress(0)
        const start = Date.now()

        const interval = setInterval(() => {
            const elapsed = Date.now() - start
            const value = Math.min((elapsed / ENROLL_DELAY) * 100, 100)
            setProgress(value)

            if (value === 100) clearInterval(interval)
        }, 50)

        return () => clearInterval(interval)
    }, [open, enrolling])

    const [conflicts, setConflicts] = useState([])

    const collectConflictSchedules = (editingSchedule) => {
        if (editingSchedule.day == 'TBA' || editingSchedule.start_time == 'TBA') return

        const conflicts = [];

        data.forEach((cls) => {
            const nstpScheds = {
                start_time: cls.schedule.start_time,
                end_time: cls.schedule.end_time,
                day: cls.schedule.day,
            }
            if (detectTwoScheduleConflict(editingSchedule, nstpScheds)) {
                conflicts.push(cls.id);
            }
        });

        setConflicts(conflicts)
    };

    const [detectingConflict, setDetectingConflict] = useState(true);

    useEffect(() => {
        if (!!classes) {
            classes.forEach((cls) => {
                collectConflictSchedules({
                    start_time: cls.start_time,
                    end_time: cls.end_time,
                    day: cls.day,
                })
            });
            setDetectingConflict(false);
        }
    }, [classes])

    return (
        <div className='space-y-4'>
            <PageTitle align='center'><div className='flex justify-center'><div className='font-extrabold'>{component.toUpperCase()}</div>  <div className='flex ml-2 font-thin'><span>|  {schoolYear.start_year}–{schoolYear.end_year}</span>  <span className='ml-2'>{semesterDisplayMap[schoolYear.semester.semester_name]}</span> </div></div></PageTitle>
            {alreadyEnrolled && (
                <Card className="bg-blue-50 border-blue-600 border-l-4">
                    <CardContent className="flex items-center gap-2">
                        <Info className="w-5 h-5 text-blue-600" />
                        <span className="text-blue-800 font-medium text-sm">
                            You are already registered for this NSTP schedule.
                        </span>
                    </CardContent>
                </Card>
            )}
            {(isLoading || detectingConflict) ? (
                <SectionSkeleton />
            ) : isError ? (
                <div className="flex flex-col items-center justify-center py-12 text-destructive">
                    <AlertCircle className="w-8 h-8 mb-3" />
                    <p className="text-sm font-medium">Failed to load sections</p>
                    <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
                </div>
            ) : (!data || data.length == 0) ? ( // <-- check for undefined safely
                <TableHeadTemplate>
                    <TableRow>
                        <TableCell colSpan={6}>
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                                <p className="text-sm font-medium">No sections</p>
                                <p className="text-xs mt-1">
                                    Check back later or contact administration
                                </p>
                            </div>
                        </TableCell>
                    </TableRow>
                </TableHeadTemplate>
            ) : (
                <TableHeadTemplate>
                    {data.map((section) => {
                        const sectionName = section.section || '-';
                        const day = section.schedule.day == 'TBA' ? '-' : section.schedule.day;
                        const start_time = section.schedule.start_time == 'TBA' ? '' : section.schedule.start_time;
                        const end_time = section.schedule.end_time == 'TBA' ? '' : section.schedule.end_time;
                        const time = start_time ? `${convertToAMPM(start_time)} – ${convertToAMPM(end_time)}` : '-';
                        const room = section.schedule.room?.room_name || '-';
                        const instructor = section.schedule.instructor?.instructor_info ? formatFullName(section.schedule.instructor?.instructor_info) : '-';

                        const maxStudents = section.max_students || 0;
                        const students = section.students_count || 0;
                        return (
                            <TableRow key={section.id} className={`${conflicts.includes(section.id) ? 'bg-red-700 hover:bg-red-700 text-white' : ''}`}>
                                <TableCell>{sectionName}</TableCell>
                                <TableCell><p>{students}/{maxStudents}</p></TableCell>
                                <TableCell>{day}</TableCell>
                                <TableCell>{time}</TableCell>
                                {/* <TableCell>{room}</TableCell> */}
                                {/* <TableCell>{instructor}</TableCell> */}
                                <TableCell>
                                    <Button
                                        className={`${conflicts.includes(section.id) ? 'hidden' : ''}`}
                                        disabled={enrolling || alreadyEnrolled || conflicts.includes(section.id) || (students == maxStudents || students > maxStudents)}
                                        onClick={() => startEnroll(section.schedule.id)}
                                    >
                                        Enroll
                                    </Button>
                                    {conflicts.includes(section.id) ? (
                                        <>Conflict</>
                                    ) : (
                                        <></>
                                    )}
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableHeadTemplate>
            )}

            <Card className="bg-red-50 border-red-600 border-l-4">
                <CardContent className="flex items-center gap-2 mt-6">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-red-800 font-medium text-sm">
                        Please double-check your schedule for any conflicts.
                    </span>
                </CardContent>
            </Card>

            <AlertDialog open={open}>
                <AlertDialogContent className="w-11/12">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            <div className="flex items-center gap-3">
                                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">
                                    Preparing enrollment…
                                </span>
                            </div>
                        </AlertDialogTitle>

                        <AlertDialogDescription className="space-y-4">
                            <Progress value={progress} />
                            <span className="text-xs text-muted-foreground">
                                Finalizing in {Math.ceil((100 - progress) / 33)}s
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={cancelButtonDisabled} onClick={cancelEnroll}>
                            Cancel
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

NstpEnrollment.layout = page => <AuthenticatedLayout>{page}</AuthenticatedLayout>