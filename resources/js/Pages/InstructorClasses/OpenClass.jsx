import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import React, { useState } from 'react'

// Import components
import Students from './ClassComponents/Students'
import Attendance from './ClassComponents/Attendance'
import Grades from './ClassComponents/Grades'
import Assignments from './ClassComponents/Assignments'
import Materials from './ClassComponents/Materials'
import Announcements from './ClassComponents/Announcements'

function OpenClass() {
    const [tab, setTab] = useState('students')
    const [students, setStudents] = useState([])

    return (
        <div className="space-y-4">
            <div className="w-full flex justify-center">
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

            <div className="mt-4">
                {tab === 'students' && <Students students={students} setStudents={setStudents} />}
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
