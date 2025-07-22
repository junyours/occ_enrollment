import { Card, CardContent } from '@/Components/ui/card'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head } from '@inertiajs/react'
import React from 'react'
import FacultyVerifiedSubjectListCard from './FacultyVerifiedSubjectListCard'

function VerifiedFacultySubjects({ faculty, schoolYear, subjects }) {
    return (
        <div className='space-y-4'>
            <Head title='Instructor Subjects' />
            <div className='flex gap-2'>
                <Card className='w-max'>
                    <CardContent className='px-4 py-2'>
                        <h1>{faculty.name.toUpperCase()}</h1>
                    </CardContent>
                </Card>
            </div>
            <FacultyVerifiedSubjectListCard subjects={subjects} schoolYear={schoolYear} facultyId={faculty.user_id_no} />
        </div>
    )
}

export default VerifiedFacultySubjects
VerifiedFacultySubjects.layout = (page) => <AuthenticatedLayout >{page}</AuthenticatedLayout>;
