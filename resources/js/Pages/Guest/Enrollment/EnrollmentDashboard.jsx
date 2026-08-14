import { Head } from '@inertiajs/react';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query'; // Import useQuery
import { PageTitle } from '@/Components/ui/PageTitle';
import NoSchoolYear from './NoSchoolYear';
import axios from 'axios';
import DepartmentCounts from './Partials/DepartmentCounts';
import TotalEnrolled from './Partials/TotalEnrolled';
import YearLevelCounts from './Partials/YearLevelCounts';
import GenderCounts from './Partials/GenderCounts';
import StudentTypes from './Partials/StudentTypes';
import EnrollmentsPerDate from './Partials/EnrollmentsPerDate';
import ProgramCounts from './Partials/ProgramCounts';
import EnrollmentDashboardSkeleton from './EnrollmentDashboardSkeleton';

export default function EnrollmentDashboard({ schoolYear }) {
    console.log(schoolYear);
    
    if (!schoolYear) return <NoSchoolYear />;

    const { data, isLoading, isError } = useQuery({
        queryKey: ['enrollmentData', schoolYear.id],
        queryFn: async ({ signal }) => {
            const response = await axios.post(
                route('enrollment-data'),
                { schoolYearId: schoolYear.id },
                { signal }
            );
            return response.data;
        },
        refetchInterval: 300000,
    });

    if (isLoading) return <EnrollmentDashboardSkeleton />
    if (isError) return <div className="p-6 text-red-500">Failed to load data.</div>;

    const {
        departmenCounts = [],
        totalEnrolled = 0,
        yearLevelCounts = [],
        genderCounts = [],
        studentTypeCounts = [],
        enrollmentsPerDate = [],
        courses = [],
    } = data || {};

    return (
        <div>
            <Head title='Enrollment' />
            
            {/* <PageTitle align='center'>
                {schoolYear.start_year} - {schoolYear.end_year} {schoolYear.semester_name} Semester
            </PageTitle> */}

            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full'>
                <TotalEnrolled total={totalEnrolled} />
                <DepartmentCounts data={departmenCounts} />
                <ProgramCounts data={courses} departmentCounts={departmenCounts} />
                <YearLevelCounts data={yearLevelCounts} />
                <StudentTypes data={studentTypeCounts} />
                <GenderCounts data={genderCounts} />
                <EnrollmentsPerDate data={enrollmentsPerDate} />
            </div>
        </div>
    );
}