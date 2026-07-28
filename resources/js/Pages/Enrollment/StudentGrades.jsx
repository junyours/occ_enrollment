import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StudentSearch from '@/Components/StudentSearch';
import StudentGrades from '../components/StudentGrades';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Search } from 'lucide-react';

export default function StudentGradesView() {
    const [student, setStudent] = useState('');

    return (
        <div className="container space-y-6">
            <div className='flex gap-4'>
                <StudentSearch onSelect={(data) => setStudent(data)} className='w-full max-w-md h-14' />
                <PageTitle align='center' className='w-full'>Academic Records</PageTitle>
            </div>

            {student ? (
                <div className='max-h-[calc(100vh-12rem)] overflow-y-auto'>
                    <StudentGrades studentId={student?.user_id_no} />
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
                    <Search className="h-12 w-12 mb-4" />
                    <p>Select a student to view their academic records.</p>
                </div>
            )}
        </div>
    );
}

StudentGradesView.layout = (page) => <AuthenticatedLayout children={page} title='Academic Records' />