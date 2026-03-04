import React, { useState, useMemo, useEffect } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Head, Link, router } from '@inertiajs/react';
import { formatFullName, formatFullNameFML } from '@/Lib/Utils';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader } from '@/Components/ui/card';
import {
    MoveRightIcon,
    UserMinus,
    Search,
    ChevronLeft,
    ChevronRight,
    X,
    Loader2,
    Users
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip';
import StudentActions from './StudentActions';
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/Components/ui/dialog';
import { Table, TableBody, TableCell, TableRow, TableHeader, TableHead } from '@/Components/ui/table';
import { Input } from '@/Components/ui/input';
import { Skeleton } from "@/Components/ui/skeleton";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CopyButton from '@/Components/ui/CopyButton';

export default function EnrolledStudentList({
    hashedCourseId,
    courseId,
    yearlevel,
    section,
    yearSectionId,
    courseName,
    forSchoolYear = false,
    schoolYear,
    semester
}) {
    const { toast } = useToast();
    const queryClient = useQueryClient();

    // --- SEARCH & UI STATE ---
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Debounce search input to improve performance
    useEffect(() => {
        const handler = setTimeout(() => setDebouncedSearch(searchTerm), 300);
        return () => clearTimeout(handler);
    }, [searchTerm]);

    // Reset pagination on search
    useEffect(() => {
        setCurrentPage(1);
    }, [debouncedSearch]);

    // --- DATA FETCHING (TanStack Query) ---
    const { data: students = [], isLoading, isError, refetch } = useQuery({
        queryKey: ['enrolledStudents', courseId, yearlevel, yearSectionId],
        queryFn: async () => {
            const response = await axios.post(route('get.enrolled.student.list', {
                id: courseId,
                yearlevel: yearlevel,
                yearSectionId: yearSectionId
            }));
            return response.data;
        },
    });

    const yearLevelName = useMemo(() => {
        const levels = { 1: 'First Year', 2: 'Second Year', 3: 'Third Year', 4: 'Fourth Year' };
        return levels[yearlevel] || '';
    }, [yearlevel]);

    // --- FILTER & PAGINATION LOGIC ---
    const filteredStudents = useMemo(() => {
        // 1. Clean and split the search term into individual keywords
        const keywords = debouncedSearch
            .trim()
            .toLowerCase()
            .normalize("NFD")             // Breakdown accented characters (e.g., ñ -> n + ~)
            .replace(/[\u0300-\u036f]/g, "") // Remove the accent marks
            .split(/\s+/);                // Split by spaces

        if (keywords.length === 0 || keywords[0] === "") return students;

        return students.filter(student => {
            // 2. Prepare student data for searching (Normalized)
            const studentId = (student.user_id_no || "").toLowerCase();
            const firstName = (student.first_name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const lastName = (student.last_name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const middleName = (student.middle_name || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

            // Combine all searchable text into one string for this student
            const searchableStack = `${studentId} ${firstName} ${lastName} ${middleName}`;

            // 3. Logic: Every keyword must be found somewhere in the searchableStack (AND logic)
            return keywords.every(word => searchableStack.includes(word));
        });
    }, [students, debouncedSearch]);

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

    // --- SKELETON RENDERER ---
    const renderSkeletonRows = Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={`skeleton-${i}`}>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-40" /></TableCell>
            <TableCell><Skeleton className="h-4 w-48" /></TableCell>
            <TableCell><Skeleton className="h-4 w-12 mx-auto" /></TableCell>
            <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
        </TableRow>
    ));

    // --- ACTIONS LOGIC (Unenroll) ---
    const [studentToUnenroll, setStudentToUnenroll] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const openUnenrollModal = (id) => {
        const student = students.find(s => s.id === id);
        setStudentToUnenroll(student);
        setShowModal(true);
    };

    const unEnrollStudent = async (id) => {
        await router.delete(route('enrollment.unenroll', id), {
            preserveScroll: true,
            onSuccess: () => {
                queryClient.invalidateQueries(['enrolledStudents']);
                setShowModal(false);
                toast({ description: "Student Unenrolled.", variant: "success" });
            },
        });
    };

    // --- ACTIONS LOGIC (Move) ---
    const [sections, setSections] = useState([]);
    const [studentToMove, setstudentToMove] = useState({});
    const [movingStudent, setMovingStudent] = useState(false);
    const [processing, setProcessing] = useState(false);

    const openMoveStudentModal = async (student) => {
        setstudentToMove(student);
        setMovingStudent(true);
        if (sections.length === 0) {
            const response = await axios.post(route('yearlevel.sections', { yearSectionId: yearSectionId }));
            setSections(response.data);
        }
    }

    const moveStudent = async (id) => {
        setProcessing(true);
        axios.post(route('move.student', { enrolledStudentId: studentToMove.id, yearSectionId: id }))
            .then(response => {
                if (response.data.message === 'success') {
                    toast({ description: "Moving success.", variant: "success" });
                    queryClient.invalidateQueries(['enrolledStudents']);
                }
            })
            .finally(() => {
                setstudentToMove({});
                setMovingStudent(false);
                setProcessing(false);
            })
    }

    return (
        <div className='space-y-4'>
            <Head title='Students' />
            <PageTitle align="center">{courseName} - {yearlevel}{section}</PageTitle>

            <Card>
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Enhanced Search Bar */}
                        <div className="relative w-full max-w-md group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="Search by student ID or name..."
                                className="pl-10 pr-10 focus-visible:ring-1 focus-visible:ring-primary shadow-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                                {searchTerm && !isLoading && (
                                    <button onClick={() => setSearchTerm("")} className="p-0.5 rounded-full">
                                        <X className="h-4 w-4 text-muted-foreground" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Result Counter */}
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-3 py-1.5 rounded-lg">
                            <Users className="h-4 w-4" />
                            <span>{filteredStudents.length} Students found</span>
                        </div>
                    </div>
                </CardHeader>

                <CardContent>
                    <div className="rounded-md border border-muted/40 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="">
                                    <TableHead className="w-32 font-bold">Student ID</TableHead>
                                    <TableHead className="w-52 font-bold">Name</TableHead>
                                    <TableHead className="font-bold">Email</TableHead>
                                    <TableHead className="text-center font-bold">Subjects</TableHead>
                                    <TableHead className="text-right font-bold">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {(() => {
                                    if (isLoading) return renderSkeletonRows;

                                    if (isError) return (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    <span className="text-destructive font-medium">Unable to load students.</span>
                                                    <Button variant="outline" size="sm" onClick={() => refetch()}>Try Again</Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );

                                    if (!paginatedStudents.length) return (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                                No students match your criteria.
                                            </TableCell>
                                        </TableRow>
                                    );

                                    return paginatedStudents.map((student) => (
                                        <TableRow key={student.id} className="transition-colors">
                                            <TableCell className="font-mono font-semibold flex gap-1 w-40 justify-start items-center"><CopyButton text={student.user_id_no} size='xs' /> {student.user_id_no} </TableCell>
                                            <TableCell className="font-medium">{formatFullName(student)}</TableCell>
                                            <TableCell className="text-muted-foreground">{student.email_address}</TableCell>
                                            <TableCell className="text-center">
                                                <span className="text-primary px-2 py-0.5 rounded text-xs font-bold">
                                                    {student.total_subjects}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1 items-center">
                                                    <Link href={`${route('enrollment.view.student.subjects', { id: hashedCourseId, yearlevel: yearLevelName ? yearLevelName.replace(/\s+/g, '-') : 'First-Year' })}?section=${encodeURIComponent(section)}&id-no=${student.user_id_no}`}>
                                                        <Button className="text-green-600 h-auto py-1 px-2 hover:bg-green-50" variant="link">Subjects</Button>
                                                    </Link>

                                                    <Link
                                                        href={forSchoolYear
                                                            ? `${route('school-year.view.student.cor', {
                                                                schoolyear: `${schoolYear.start_year}-${schoolYear.end_year}`,
                                                                semester: semester,
                                                                hashedCourseId: hashedCourseId,
                                                                yearlevel: yearLevelName ? yearLevelName.replace(/\s+/g, '-') : 'First-Year'
                                                            })}?section=${encodeURIComponent(section)}&id-no=${student.user_id_no}`
                                                            : `${route('enrollment.view.student.cor', {
                                                                id: hashedCourseId,
                                                                yearlevel: yearLevelName ? yearLevelName.replace(/\s+/g, '-') : 'First-Year'
                                                            })}?section=${encodeURIComponent(section)}&id-no=${student.user_id_no}`
                                                        }
                                                    >
                                                        <Button className="text-blue-600 h-auto py-1 px-2 hover:bg-blue-50" variant="link">COR</Button>
                                                    </Link>

                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button onClick={() => openMoveStudentModal(student)} variant="ghost" size="icon" className="text-yellow-600 h-8 w-8 hover:text-yellow-700 hover:bg-yellow-50">
                                                                <MoveRightIcon className="h-4 w-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Move student</TooltipContent>
                                                    </Tooltip>

                                                    {!forSchoolYear && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button onClick={() => openUnenrollModal(student.id)} variant="ghost" size="icon" className="text-destructive h-8 w-8 hover:bg-destructive/10">
                                                                    <UserMinus className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Unenroll student</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ));
                                })()}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Pagination */}
                    <div className="flex items-center justify-between space-x-2 py-4">
                        <div className="text-xs text-muted-foreground italic">
                            Showing {Math.min(startIndex + 1, filteredStudents.length)} to {Math.min(startIndex + itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
                        </div>
                        <div className="flex items-center space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage === 1}>
                                <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                            </Button>
                            <div className="text-xs font-bold px-3">Page {currentPage} of {totalPages || 1}</div>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>
                                Next <ChevronRight className="h-4 w-4 ml-1" />
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Modals */}
            {studentToUnenroll && (
                <StudentActions
                    show={showModal}
                    setShowModal={setShowModal}
                    onCancel={() => setShowModal(false)}
                    onConfirm={() => unEnrollStudent(studentToUnenroll.id)}
                    student={studentToUnenroll}
                />
            )}

            <Dialog open={movingStudent} onOpenChange={setMovingStudent}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Transfer Student Section</DialogTitle>
                        <DialogDescription className="font-medium text-primary">
                            {formatFullNameFML(studentToMove)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="border rounded-md max-h-72 overflow-y-auto">
                        <Table>
                            <TableBody>
                                {sections.map((sectionDetails) => (
                                    <TableRow key={sectionDetails.id} className="group">
                                        <TableCell className="py-3 font-medium">
                                            {sectionDetails.year_level_id}-{sectionDetails.section}
                                        </TableCell>
                                        <TableCell className="py-3 text-right">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                disabled={processing || (sectionDetails.section == section && sectionDetails.year_level_id == yearlevel)}
                                                onClick={() => moveStudent(sectionDetails.id)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground hover:bg-primary/90"
                                            >
                                                Move
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <DialogFooter>
                        <Button className='w-full' variant="ghost" onClick={() => setMovingStudent(false)}>Cancel</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

EnrolledStudentList.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;