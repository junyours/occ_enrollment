import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle'
import { Skeleton } from '@/Components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import { router } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import axios, { Axios } from 'axios';
import { AlertCircle, AlertTriangle, BookOpen, MoveRightIcon, Trash, UserMinus } from 'lucide-react';
import React, { useState } from 'react'
import { toast } from 'sonner';

const TableHeadTemplate = ({ children }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>NAME</TableHead>
                    <TableHead>SECTION</TableHead>
                    <TableHead></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {children}
            </TableBody>
        </Table>
    );
};

const SkeletonLoading = () => {
    return (
        <TableHeadTemplate>
            <TableRow>
                <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell>
            </TableRow>
        </TableHeadTemplate>
    );
};

export default function Index({ component, section }) {

    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const getStudents = async () => {
        const response = await axios.post('', {
            schoolYearId: selectedSchoolYearEntry.id,
        })
        return (response.data)
    }

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['nstp-director.component.sections.student-list', component, selectedSchoolYearEntry?.idm, section],
        queryFn: getStudents,
        enabled: !!selectedSchoolYearEntry?.id && !!component && !!section,
    });

    const [studentToRemove, setStudentToReMove] = useState({});
    const [openRemoveStudent, setOpenRemoveStudent] = useState(false);
    const [removing, setRemoving] = useState(false);

    const removeStudent = async () => {
        if (!studentToRemove?.id) return;

        setRemoving(true);

        try {
            await router.post(
                route('nstp-director.component.sections.student-list.remove-student', { component: component, section: section }),
                { id: studentToRemove.id }
            );

            await refetch();
            setOpenRemoveStudent(false);
            setStudentToReMove(null);
            toast.success('Student removed successfully');
        } catch (error) {
            console.error(error);
        } finally {
            setRemoving(false);
        }
    };

    const [nstpComponentSections, setNstpComponentSections] = useState({
        rotc: [],
        cwts: [],
        lts: [],
    });

    const getAllNstpSections = async () => {
        const response = await axios.post(
            route('nstp-director.school-year-components-sections'),
            { schoolYearId: selectedSchoolYearEntry.id }
        );

        const grouped = {
            rotc: [],
            cwts: [],
            lts: [],
        };

        response.data.forEach(section => {
            const key = section.component_name?.toLowerCase();
            if (grouped[key]) {
                grouped[key].push(section);
            }
        });

        setNstpComponentSections(grouped);
    };



    const [studentTomove, setStudentToMove] = useState({});
    const [openMoveStudent, setOpenMoveStudent] = useState(false);
    const [moving, setMoving] = useState(false);

    const moveStudent = async (id) => {
        if (!studentTomove?.id) return;

        setMoving(true);

        try {
            await router.post(
                route('nstp-director.component.sections.student-list.move-student',
                    {
                        component: component,
                        section: section
                    }),
                {
                    studentSubejctNstpSchedId: studentTomove.id,
                    nstpSectionSchedId: id
                }
            );

            await refetch();
            setOpenMoveStudent(false);
            setStudentToMove(null);
            toast.success('Student moved successfully');
        } catch (error) {
            const message =
                error.response?.data?.message ||
                "Moving failed. Please try again.";

            toast.error(message);
            console.error(error);
        } finally {
            setMoving(false);
        }
    };

    return (
        <div className='space-y-4'>
            <PageTitle align='center'>{component.toUpperCase()} | Section {section}</PageTitle>

            <Card>
                <CardHeader className="mb-2">
                    <CardTitle className="text-2xl">Students</CardTitle>
                </CardHeader>
                <CardContent>
                    {!selectedSchoolYearEntry?.id ? (
                        <></>
                    ) : isLoading ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <SkeletonLoading />
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center py-12 text-destructive">
                            <AlertCircle className="w-8 h-8 mb-3" />
                            <p className="text-sm font-medium">Failed to load students</p>
                            <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
                        </div>
                    ) : (!data || data.length == 0) ? (
                        <TableHeadTemplate>
                            <TableRow>
                                <TableCell colSpan={6}>
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                                        <p className="text-sm font-medium">No students</p>
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
                                const idNo = section.user_id_no;
                                const name = formatFullName(section);
                                const sectionName = `${section.course_name_abbreviation}-${section.year_level_id}${section.section}`;
                                return (
                                    <TableRow key={idNo}>
                                        <TableCell>{idNo}</TableCell>
                                        <TableCell>{name}</TableCell>
                                        <TableCell>{sectionName}</TableCell>

                                        <TableCell className='flex justify-end'>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        onClick={() => {
                                                            setStudentToMove(section);
                                                            setOpenMoveStudent(true);
                                                            getAllNstpSections();
                                                        }}
                                                        variant="icon"
                                                        className="text-yellow-500 py-0 h-min"
                                                    >
                                                        <MoveRightIcon className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Move student</TooltipContent>
                                            </Tooltip>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button
                                                        onClick={() => {
                                                            setOpenRemoveStudent(true)
                                                            setStudentToReMove(section)
                                                        }}
                                                        variant="icon"
                                                        className="text-red-500 py-0 h-min"
                                                    >
                                                        <UserMinus className="h-4 w-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>Remove student</TooltipContent>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableHeadTemplate>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={openRemoveStudent} onOpenChange={setOpenRemoveStudent}>
                <AlertDialogContent className="w-11/12 max-w-md rounded-2xl">
                    <AlertDialogHeader className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                                <AlertTriangle className="h-5 w-5 text-red-600" />
                            </div>
                            <AlertDialogTitle className="text-lg font-semibold">
                                Remove student?
                            </AlertDialogTitle>
                        </div>

                        <AlertDialogDescription className="text-sm text-muted-foreground leading-relaxed">
                            This action will permanently remove the student from this class.
                            <span className="block mt-2 font-medium text-foreground">
                                This cannot be undone.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel>
                            Cancel
                        </AlertDialogCancel>

                        <Button
                            variant="destructive"
                            className="rounded-xl"
                            onClick={removeStudent}
                            disabled={removing}
                        >
                            Yes, remove student
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={openMoveStudent} onOpenChange={setOpenMoveStudent}>
                <AlertDialogContent className="w-11/12 max-w-2xl rounded-2xl">
                    <AlertDialogHeader className="space-y-2">
                        <AlertDialogTitle className="text-lg font-semibold">
                            Move Student to Another Section
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-muted-foreground">
                            Select a section below. Scroll if needed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {/* Scroll container */}
                    <div className="overflow-y-auto rounded-xl border
                                    max-h-[calc(100vh-19rem)] min-h-[calc(100vh-19rem)]">
                        <Table className="w-full text-sm">
                            <TableHeader className="sticky top-0 bg-background z-10">
                                <TableRow className="border-b">
                                    <TableHead className="text-left font-medium">Component</TableHead>
                                    <TableHead className="text-left font-medium">Schedule</TableHead>
                                    <TableHead className="text-center font-medium">Students</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {Object.entries(nstpComponentSections).map(([component, sections]) =>
                                    sections.map(section => {
                                        const start_time = section.schedule.start_time == 'TBA' ? '' : section.schedule.start_time;
                                        const end_time = section.schedule.end_time == 'TBA' ? '' : section.schedule.end_time;
                                        const time = start_time ? `${convertToAMPM(start_time)} – ${convertToAMPM(end_time)}` : '-';

                                        const maxStudents = section.max_students || 0;
                                        const students = section.students_count || 0;

                                        const sectionName = section.section || '-';

                                        return (
                                            <TableRow
                                                className='border-b group'
                                                key={section.id}
                                            >
                                                <TableCell className="capitalize">
                                                    {component} - {sectionName}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {section.schedule?.day} ·{" "}
                                                    {time}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {students}/{maxStudents}
                                                </TableCell>
                                                <TableCell className="text-right w-24">
                                                    <Button
                                                        disabled={moving || students == maxStudents || students > maxStudents}
                                                        onClick={() => moveStudent(section.schedule.id)}
                                                        className="py-1 h-min disabled:cursor-not-allowed hidden group-hover:table-cell"
                                                    >
                                                        Move
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel>
                            Cancel
                        </AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

Index.layout = page => <AuthenticatedLayout>{page}</AuthenticatedLayout>