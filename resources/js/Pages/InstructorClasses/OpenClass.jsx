import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import React, { useState } from 'react'

import Students from './ClassComponents/Students'
import Attendance from './ClassComponents/Attendance'
import Grades from './ClassComponents/Grades'
import Grading from './ClassComponents/Grading'
import Materials from './ClassComponents/Materials'
import Announcements from './ClassComponents/Announcements'

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select'

import NavigationTabs from '@/Components/ui/NavigationTabs'

import {
    Users,
    CalendarDays,
    ChartNoAxesColumnIncreasing,
    ClipboardList,
    FolderOpen,
    Megaphone,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'


const navigationTabs = [
    {
        value: 'students',
        label: 'Students',
        icon: Users,
    },
    {
        value: 'attendance',
        label: 'Attendance',
        icon: CalendarDays,
    },
    {
        value: 'grades',
        label: 'Grades',
        icon: ChartNoAxesColumnIncreasing,
    },
    {
        value: 'grading',
        label: 'Grading',
        icon: ClipboardList,
    },
    {
        value: 'materials',
        label: 'Materials',
        icon: FolderOpen,
    },
    {
        value: 'announcements',
        label: 'Announcements',
        icon: Megaphone,
    },
]

export default function OpenClass({
    subjectCode,
    descriptiveTitle,
    id,
    courseSection,
    gradeStatus,
    schoolYear,
}) {
    const [tab, setTab] = useState('students')
    const [currentPage, setCurrentPage] = useState(1)

    const getClassStudents = async () => {
        try {
            const response = await axios.post(
                route('class.students', { id })
            )

            return response.data
        } catch (err) {
            console.error(err)
        }
    }

    const { data: students = [], isLoading } = useQuery({
        queryKey: ['class.students', id],
        queryFn: getClassStudents
    })

    const section = `${subjectCode} - ${descriptiveTitle} | ${courseSection}`


    return (
        <div className="flex flex-col gap-4">
            {/* <PageTitle align="center">
                {section}
            </PageTitle> */}

            {/* Desktop navigation */}
            <div className="hidden md:block">
                <NavigationTabs
                    value={tab}
                    onValueChange={setTab}
                    items={navigationTabs}
                />
            </div>

            {/* Mobile navigation */}
            <div className="block w-full md:hidden">
                <Select
                    value={tab}
                    onValueChange={setTab}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Select Section" />
                    </SelectTrigger>

                    <SelectContent>
                        {navigationTabs.map((item) => (
                            <SelectItem
                                key={item.value}
                                value={item.value}
                            >
                                {item.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div>
                {tab === 'students' && (
                    <Students
                        getClassStudents={getClassStudents}
                        students={students}
                        currentPage={currentPage}
                        setPage={setCurrentPage}
                        isLoading={isLoading}
                        nameClass={section}
                    />
                )}

                {tab === 'attendance' && (
                    <Attendance />
                )}

                {tab === 'grades' && (
                    <Grades
                        students={students}
                        subjectCode={subjectCode}
                        descriptiveTitle={descriptiveTitle}
                        courseSection={courseSection}
                        yearSectionSubjectsId={id}
                        gradeStatus={gradeStatus}
                        getClassStudents={getClassStudents}
                        schoolYear={schoolYear}
                    />
                )}

                {tab === 'grading' && (
                    <Grading classId={id} />
                )}

                {tab === 'materials' && (
                    <Materials />
                )}

                {tab === 'announcements' && (
                    <Announcements />
                )}
            </div>
        </div>
    )
}

OpenClass.layout = (page) => {
    const {
        subjectCode,
        descriptiveTitle,
        courseSection,
    } = page.props

    const section = `${subjectCode} - ${descriptiveTitle} | ${courseSection}`

    return (
        <AuthenticatedLayout title={section}>
            {page}
        </AuthenticatedLayout>
    )
}