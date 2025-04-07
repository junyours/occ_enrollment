import { PageTitle } from '@/Components/ui/PageTitle';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatFullNameFML } from '@/Lib/Utils';
import { usePage } from '@inertiajs/react';
import axios from 'axios';
import React from 'react'

export default function StudentSubjects() {
    const { courseName, yearlevel, section, student, schoolYear } = usePage().props

    const getStudentSubjects = async () => {
        axios.post('api/get-student-subjects', {schoolYear: schoolYear, studentId: student.user_id_no})
    }

    return (
        <div className='space-y-4'>
            <PageTitle align="center">{courseName} - {yearlevel}{section}</PageTitle>
            <div>
                <h2 className='text-3xl'>{formatFullNameFML(student)}</h2>
                <h3 className='text-xl'>{student.user_id_no}</h3>
            </div>
        </div>
    )
}

StudentSubjects.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
