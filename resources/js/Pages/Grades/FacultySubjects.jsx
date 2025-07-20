import { Card, CardContent } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import React, { useState } from 'react'
import FacultySubjectListCard from './FacultySubjectListCard';

function FacultySubjects({ faculty, schoolYear, subjects }) {
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
            <FacultySubjectListCard subjects={subjects} schoolYear={schoolYear} facultyId={faculty.user_id_no} />
        </div>
    )
}

export default FacultySubjects
FacultySubjects.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
