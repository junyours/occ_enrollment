import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
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
import { AlertCircle, AlertTriangle, BookOpen, FileDown, MoveRightIcon, Trash, UserMinus } from 'lucide-react';
import React, { useMemo, useState } from 'react'
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const TableHeadTemplate = ({ children }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className='w-10'>#</TableHead>
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
                <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
            </TableRow>
            <TableRow>
                <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
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
        queryKey: ['nstp-director.component.sections.student-list', component, selectedSchoolYearEntry?.id, section],
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

    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Filtered data based on search
    const filteredData = useMemo(() => {
        if (!data) return [];
        return data.filter(student => {
            const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
            const idNo = student.user_id_no.toLowerCase();
            const sectionName = `${student.course_name_abbreviation}-${student.year_level_id}${student.section}`.toLowerCase();
            const term = search.toLowerCase();
            return fullName.includes(term) || idNo.includes(term) || sectionName.includes(term);
        });
    }, [data, search]);

    // Pagination
    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handlePrevPage = () => setCurrentPage(p => Math.max(p - 1, 1));
    const handleNextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));

    const handleDownloadExcel = () => {
        if (!filteredData || filteredData.length === 0) return;

        const exportData = filteredData.map((student, index) => ({
            No: index + 1,
            ID: student.user_id_no,
            Name: formatFullName(student),
            Section: `${student.course_name_abbreviation}-${student.year_level_id}${student.section}`,
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);

        // Approximate widths in Excel (characters, not pixels)
        ws['!cols'] = [
            { wch: 6 },
            { wch: 14 },
            { wch: 30 },
            { wch: 15 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Students');

        const name = `${component.toUpperCase()}_Section_${section}.xlsx`;
        XLSX.writeFile(wb, name);
    };

    return (
        <div className='space-y-4'>
            <Card>
                <CardHeader className="mb-2 flex flex-col sm:flex-row sm:justify-between sm:items-center">
                    <CardTitle className="text-4xl">{component.toUpperCase()} | Section {section}</CardTitle>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <div className="relative w-64">
                            <Input
                                type="text"
                                placeholder="Search students..."
                                className="w-full pr-8" // padding right for X button
                                value={search}
                                onChange={e => {
                                    setSearch(e.target.value);
                                    setCurrentPage(1); // reset page on search
                                }}
                            />
                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch('')}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        <Button
                            onClick={handleDownloadExcel}
                            className="bg-green-600 hover:bg-green-500"
                            variant=""
                        >
                            <FileDown />
                            Excel
                        </Button>
                    </div>
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
                    ) : (!paginatedData || paginatedData.length === 0) ? (
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
                        <>
                            <Card>
                                <TableHeadTemplate>
                                    {paginatedData.map((student, index) => {
                                        const idNo = student.user_id_no;
                                        const name = formatFullName(student)
                                        const sectionName = `${student.course_name_abbreviation}-${student.year_level_id}${student.section}`;
                                        return (
                                            <TableRow key={idNo}>
                                                <TableCell>{(currentPage - 1) * ITEMS_PER_PAGE + index + 1}.</TableCell>
                                                <TableCell>{idNo}</TableCell>
                                                <TableCell>{name}</TableCell>
                                                <TableCell>{sectionName}</TableCell>
                                                <TableCell className="flex justify-end gap-2">
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                onClick={() => {
                                                                    setStudentToMove(student);
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
                                                                    setOpenRemoveStudent(true);
                                                                    setStudentToReMove(student);
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
                                        );
                                    })}
                                </TableHeadTemplate>
                            </Card>
                            {/* Pagination Controls */}
                            <div className="flex justify-end items-center gap-2 mt-4">
                                <Button variant='outline' onClick={handlePrevPage} disabled={currentPage === 1}>Prev</Button>
                                <span>{currentPage} / {totalPages}</span>
                                <Button variant='outline' onClick={handleNextPage} disabled={currentPage === totalPages}>Next</Button>
                            </div>
                        </>
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
                    <div className="overflow-y-auto rounded-xl border max-h-[calc(100vh-19rem)] min-h-[calc(100vh-19rem)]">
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