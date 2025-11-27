import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import React from 'react';
import Grades from '../InstructorClasses/ClassComponents/Grades';
import { PageTitle } from '@/Components/ui/PageTitle';
import { useQuery } from '@tanstack/react-query';

export default function InstructorSubjectView({
    id,
    subjectCode,
    descriptiveTitle,
    courseSection,
    gradeStatus,
    schoolYear
}) {
    const fetchClassStudents = async () => {
        const response = await axios.post(route('class.students', { id }));
        return response.data;
    };

    const { data: students = [], isLoading, isError, refetch } = useQuery({
        queryKey: ['class-students', id],
        queryFn: fetchClassStudents,
        enabled: !!id,  // only run when id is available
    });

    if (isLoading) return <p className='text-center'>Loading students...</p>;
    if (isError) return <p className='text-center text-red-500'>Failed to load data.</p>;
    if (!students.length) return <p className='text-center text-muted'>No students found.</p>;

    return (
        <div>
            <PageTitle align='center'>
                {subjectCode} - {descriptiveTitle} | {courseSection}
            </PageTitle>
            <Grades
                students={students}
                subjectCode={subjectCode}
                descriptiveTitle={descriptiveTitle}
                courseSection={courseSection}
                yearSectionSubjectsId={id}
                gradeStatus={gradeStatus}
                getClassStudents={refetch} // now powered by React Query
                schoolYear={schoolYear}
            />
        </div>
    );
}

InstructorSubjectView.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
