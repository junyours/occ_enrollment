import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle'
import { Skeleton } from '@/Components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { formatFullName } from '@/Lib/Utils';
import { router } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import axios, { Axios } from 'axios';
import { AlertCircle, AlertTriangle, BookOpen, MoveRightIcon, Trash, UserMinus } from 'lucide-react';
import React, { useState } from 'react'

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
        } catch (error) {
            console.error(error);
        } finally {
            setRemoving(false);
        }
    };



    const [studentTomove, setStudentToMove] = useState({});

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
                                                        onClick={() => setStudentToMove(section)}
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
                        <AlertDialogCancel className="rounded-xl">
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
        </div>
    )
}

Index.layout = page => <AuthenticatedLayout>{page}</AuthenticatedLayout>