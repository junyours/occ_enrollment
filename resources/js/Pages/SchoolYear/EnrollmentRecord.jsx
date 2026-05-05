import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatFullName } from '@/Lib/Utils';
import { Head } from '@inertiajs/react';
import { FileDown } from 'lucide-react';
import { useEffect, useState } from 'react';
import StudentSubjects from './StudentSubjects';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import SchoolYearPicker from '@/Components/SchoolYearPicker';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import SearchBar from '@/Components/ui/SearchBar';

function EnrollmentRecord() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const [studentList, setStudentList] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [search, setSearch] = useState('');

    const getEnrollmentRecord = async () => {
        await axios.post(
            route('enrollment-record.students', {
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
        window.open(route('subjects.students-download', {
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
            <Head title="Enrollment Record" />
            <PageTitle align='center' className='w-full'>ENROLLMENT RECORD</PageTitle>
            <div className='mt-6 flex flex-col xl:flex-row gap-4 w-full items-start xl:items-stretch'>
                <div className='flex flex-col sm:flex-row gap-4 items-stretch sm:items-center w-full xl:w-auto'>
                    {/* School Year Select */}
                    <SchoolYearPicker />

                    <Button
                        onClick={handleDownload}
                        className='bg-green-600 hover:bg-green-700 text-white flex justify-center items-center gap-2 shadow-sm h-full min-h-[44px] px-6 transition-all duration-200'
                    >
                        Download
                        <FileDown size={18} />
                    </Button>
                </div>
                <div className='flex-1 w-full flex items-center'>
                    <div className='w-full'>
                        <SearchBar
                            value={search}
                            onSearch={getEnrollmentRecord}
                            onClear={handleReset}
                            onChange={searchOnChange}
                        />
                    </div>
                </div>
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
                        <StudentSubjects schoolYearId={selectedSchoolYearEntry.id} studentId={selectedStudent.user_id_no} />
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}

export default EnrollmentRecord
EnrollmentRecord.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
