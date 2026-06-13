import BackButton from '@/Components/ui/BackButton';
import { Card, CardContent } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { formatName } from '@/Lib/InfoUtils';
import { Head } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import React from 'react'
import SubjectListTable from './SubjectListTable';

export default function FacultySubjects({ schoolYear, faculty }) {

    const fetchFacultySubjects = async () => {
        const response = await axios.get(route('nstp.faculty-submitted-subjects', { schoolYearId: schoolYear.id, facultyId: faculty.id }));
        return response.data;
    };

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['grades.faculty.subjects', schoolYear?.id, faculty?.id],
        queryFn: fetchFacultySubjects,
        enabled: !!faculty?.id && !!schoolYear?.id,
    });

    return (
        <div className='space-y-4'>
            <Head title='Instructor Subjects' />
            <div className='flex gap-2'>
                <BackButton />
                <Card className='w-max'>
                    <CardContent className='px-4 py-2'>
                        <h1>{formatName(faculty, { casing: 'upper' })}</h1>
                    </CardContent>
                </Card>
            </div>
            <SubjectListTable subjects={data} schoolYear={schoolYear} facultyId={faculty.user_id_no} isLoading={isLoading} isError={isError} />
        </div>
    )
}

FacultySubjects.layout = page => <AuthenticatedLayout children={page} />