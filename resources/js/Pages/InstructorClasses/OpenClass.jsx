import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs'
import React, { useEffect, useState } from 'react'

// Import components
import Students from './ClassComponents/Students'
import Attendance from './ClassComponents/Attendance'
import Grades from './ClassComponents/Grades'
import Assignments from './ClassComponents/Assignments'
import Materials from './ClassComponents/Materials'
import Announcements from './ClassComponents/Announcements'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { Head, usePage } from '@inertiajs/react'
import { PageTitle } from '@/Components/ui/PageTitle'

function OpenClass() {
    const [tab, setTab] = useState('students')
    const { subjectCode, descriptiveTitle, id } = usePage().props;
    const [students, setStudents] = useState({
        data: [],
        current_page: 1,
        last_page: 1
    });

    const [currentPage, setCurrentPage] = useState(1);

    const getClassStudents = async (page = 1) => {
        try {
            const response = await axios.post(route('class.students', { id }), { page });
            setStudents(response.data);
            setCurrentPage(response.data.current_page);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        getClassStudents(currentPage);
    }, []);

    return (
        <div className="space-y-4">
            <Head title={subjectCode} />
            <PageTitle align='center'>{subjectCode} - {descriptiveTitle}</PageTitle>
            <div className="w-full flex justify-center">
                {/* Tabs for md and up */}
                <div className="hidden md:flex">
                    <Tabs value={tab} onValueChange={setTab} className="w-max">
                        <TabsList className="flex flex-wrap justify-start gap-2">
                            <TabsTrigger className="w-32" value="students">Students</TabsTrigger>
                            <TabsTrigger className="w-32" value="attendance">Attendance</TabsTrigger>
                            <TabsTrigger className="w-32" value="grades">Grades</TabsTrigger>
                            <TabsTrigger className="w-32" value="assignments">Assignments</TabsTrigger>
                            <TabsTrigger className="w-32" value="materials">Materials</TabsTrigger>
                            <TabsTrigger className="w-32" value="announcements">Announcements</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

                {/* Select for mobile only */}
                <div className="block md:hidden w-full">
                    <Select value={tab} onValueChange={setTab}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Section" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="students">Students</SelectItem>
                            <SelectItem value="attendance">Attendance</SelectItem>
                            <SelectItem value="grades">Grades</SelectItem>
                            <SelectItem value="assignments">Assignments</SelectItem>
                            <SelectItem value="materials">Materials</SelectItem>
                            <SelectItem value="announcements">Announcements</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="mt-4">
                {tab === 'students' && <Students getClassStudents={getClassStudents} students={students} setStudents={setStudents} currentPage={currentPage} setPage={setCurrentPage} />}
                {tab === 'attendance' && <Attendance />}
                {tab === 'grades' && <Grades />}
                {tab === 'assignments' && <Assignments />}
                {tab === 'materials' && <Materials />}
                {tab === 'announcements' && <Announcements />}
            </div>
        </div>
    )
}

export default OpenClass

OpenClass.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>
