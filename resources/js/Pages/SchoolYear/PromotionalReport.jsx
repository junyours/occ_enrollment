import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatFullName } from '@/Lib/Utils';
import { Head } from '@inertiajs/react';
import { FileDown, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import StudentSubjects from './StudentSubjects';
import StudentSubjectsGrades from './StudentSubjectsGrades';

function PromotionalReport({ schoolYears }) {
    const uniqueSchoolYears = Array.from(
        new Set(schoolYears.map((sy) => `${sy.start_year}-${sy.end_year}`))
    );

    const [selectedSchoolYear, setSelectedSchoolYear] = useState(uniqueSchoolYears[0] || '');

    const getSemestersForYear = (year) =>
        schoolYears
            .filter((sy) => `${sy.start_year}-${sy.end_year}` === year)
            .map((sy) => sy.semester_name);

    const [selectedSemester, setSelectedSemester] = useState(() => {
        const semesters = getSemestersForYear(selectedSchoolYear);
        return semesters.includes('First') ? 'First' : semesters[0] || '';
    });

    const handleSchoolYearChange = (value) => {
        setSelectedSchoolYear(value);
        const available = getSemestersForYear(value);
        setSelectedSemester(available.includes('First') ? 'First' : available[0] || '');
    };

    const handleSemesterChange = (value) => {
        setSelectedSemester(value);
    };

    const allSemesters = ['First', 'Second', 'Summer'];
    const availableSemesters = getSemestersForYear(selectedSchoolYear);

    // 🔥 FINAL: Find the exact object matching both selected school year AND semester
    const selectedSchoolYearEntry = schoolYears.find(
        (sy) =>
            `${sy.start_year}-${sy.end_year}` === selectedSchoolYear &&
            sy.semester_name === selectedSemester
    );

    const [studentList, setStudentList] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [search, setSearch] = useState('');

    const getEnrollmentRecord = async () => {
        await axios.post(
            route('promotional-report.students', {
                schoolYearId: selectedSchoolYearEntry.id,
                page: page,
                search: search
            })
        ).then(response => {
            setStudentList(response.data.data); // "data" inside paginator
            setLastPage(response.data.last_page); // store last page for controls
        });
    };

    useEffect(() => {
        if (selectedSchoolYearEntry?.id) {
            getEnrollmentRecord();
        }
    }, [selectedSchoolYearEntry?.id, page]); // refetch when page changes

    const handleReset = async () => {
        setSearch('');
        await axios.post(
            route('enrollment-record.students', {
                schoolYearId: selectedSchoolYearEntry.id,
                page: page,
                search: ''
            })
        ).then(response => {
            setStudentList(response.data.data); // "data" inside paginator
            setLastPage(response.data.last_page); // store last page for controls
        });
    };

    const searchOnChange = (e) => {
        setSearch(e.target.value);
    }

    const handleDownload = () => {
        window.open(route('subjects.grades.students-download', {
            schoolYearId: selectedSchoolYearEntry.id,
        }), '_blank');
    };


    const [selectedStudent, setSelectedStudent] = useState([]);
    const [open, setOpen] = useState(false);

    const handleOpen = () => {
        setOpen(!open);
        setSelectedStudent([]);
    }

    return (
        <div className='space-y-4'>
            <Head title="Promotional Report" />
            <PageTitle align='center' className='w-full'>PROMOTIONAL REPORT</PageTitle>
            <div className='mt-2 flex justify-between'>
                <div className='flex gap-2 w-max'>
                    {/* School Year Select */}
                    <div className="flex items-center gap-2">
                        <Select value={selectedSchoolYear} onValueChange={handleSchoolYearChange}>
                            <SelectTrigger className='w-36'>
                                <SelectValue placeholder="Select School Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {uniqueSchoolYears.map((year) => (
                                    <SelectItem key={year} value={year}>
                                        {year}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Semester Select */}
                    <div className="flex items-center gap-2">
                        <Select value={selectedSemester} onValueChange={handleSemesterChange}>
                            <SelectTrigger className='w-28' >
                                <SelectValue placeholder="Select Semester" />
                            </SelectTrigger>
                            <SelectContent >
                                {allSemesters.map((sem) => (
                                    <SelectItem key={sem} value={sem} disabled={!availableSemesters.includes(sem)}>
                                        {sem}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={handleDownload}
                        size='lg'
                        className={`bg-green-600 hover:bg-green-500`}
                    >
                        Download
                        <FileDown />
                    </Button>
                </div>
                <form
                    className='flex gap-2'
                    onSubmit={(e) => {
                        e.preventDefault(); // stops page reload
                        getEnrollmentRecord();
                    }}
                >
                    <Input
                        className='w-56'
                        value={search}
                        placeholder='search'
                        onChange={searchOnChange}
                    />
                    <Button type="submit">
                        <Search />
                    </Button>
                    {search && (
                        <Button type="button" onClick={handleReset} variant="outline">
                            Reset
                        </Button>
                    )}
                </form>
            </div>
            <div className='flex gap-4 w-full'>
                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>Students</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>STUDENT ID</TableHead>
                                    <TableHead>NAME</TableHead>
                                    <TableHead>COURSE & SECTION</TableHead>
                                    <TableHead className='text-center'>SUBJECTS</TableHead>
                                    <TableHead>DATE ENROLLED</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {studentList.length > 0 ? (
                                    <>
                                        {studentList.map((student) => (
                                            <TableRow
                                                key={student.user_id_no}
                                                className='cursor-pointer'
                                                onClick={() => {
                                                    setSelectedStudent(student)
                                                    setOpen(true);
                                                }}
                                            >
                                                <TableCell>{student.user_id_no}</TableCell>
                                                <TableCell>{formatFullName(student)}</TableCell>
                                                <TableCell>{student.course_name_abbreviation}-{student.year_level_id}{student.section}</TableCell>
                                                <TableCell className='text-center'>{student.total_subjects}</TableCell>
                                                <TableCell>{student.date_enrolled}</TableCell>
                                            </TableRow>
                                        ))}
                                    </>
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className='text-center'>No data</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                        <div className="flex justify-center items-center gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(prev => prev - 1)}
                                className="px-3 py-1 border rounded"
                            >
                                Prev
                            </button>

                            <span>Page {page} of {lastPage}</span>

                            <button
                                disabled={page === lastPage}
                                onClick={() => setPage(prev => prev + 1)}
                                className="px-3 py-1 border rounded"
                            >
                                Next
                            </button>
                        </div>
                    </CardFooter>
                </Card>
            </div>

            {selectedStudent.length !== 0 && (
                <Dialog open={open} onOpenChange={() => handleOpen()} className='gap-0'>
                    <DialogContent
                        className="sm:max-w-4xl overflow-y-auto mt-4 
                                    max-h-[calc(100vh-19rem)]
                                    overflow-x-auto gap-0"
                    >
                        <DialogHeader className='gap-0'>    
                            <DialogTitle>{formatFullName(selectedStudent)}</DialogTitle>
                            <DialogDescription>
                                {selectedStudent.user_id_no} - {selectedStudent.course_name_abbreviation}-{selectedStudent.year_level_id}{selectedStudent.section}
                            </DialogDescription>
                        </DialogHeader>
                        <StudentSubjectsGrades schoolYearId={selectedSchoolYearEntry.id} studentId={selectedStudent.user_id_no} />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}

export default PromotionalReport
PromotionalReport.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
