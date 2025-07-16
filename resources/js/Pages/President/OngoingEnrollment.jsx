import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import React, { useEffect, useState } from 'react'
import { PageTitle } from '@/Components/ui/PageTitle';
import NoSchoolYear from './NoSchoolYear';
import axios from 'axios';
import DepartmentCounts from './DepartmentCounts';
import TotalEnrolled from './TotalEnrolled';
import YearLevelCounts from './YearLevelCounts';
import GenderCounts from './GenderCounts';
import StudentTypes from './StudentTypes';
import EnrollmentsPerDate from './EnrollmentsPerDate';

function OngoingEnrollment({ schoolYear }) {
    const [departmentCounts, setDepartmentCounts] = useState([]);
    const [totalEnrolled, seTotalEnrolled] = useState(0);
    const [yearLevelCounts, setYearLevelCounts] = useState([]);
    const [genderCounts, setGenderCount] = useState([]);
    const [studentTypes, setStudentTypes] = useState([]);
    const [enrollmentsPerDate, setEnrollmentsPerDate] = useState([]);

    if (!schoolYear) return <NoSchoolYear />

    useEffect(() => {
        if (!schoolYear) return;

        let cancelToken;

        const getEnrollmentData = async () => {
            if (cancelToken) {
                cancelToken.cancel("Operation canceled due to new request.");
            }

            cancelToken = axios.CancelToken.source();

            try {
                const response = await axios.post(
                    route('president.enrollment-data'),
                    { schoolYearId: schoolYear.id },
                    { cancelToken: cancelToken.token }
                );
                setDepartmentCounts(response.data.departmenCounts);
                seTotalEnrolled(response.data.totalEnrolled);
                setYearLevelCounts(response.data.yearLevelCounts);
                setGenderCount(response.data.genderCounts);
                setStudentTypes(response.data.studentTypeCounts)
                setEnrollmentsPerDate(response.data.enrollmentsPerDate)
            } catch (error) {
                if (axios.isCancel(error)) {
                    console.log("Request canceled", error.message);
                } else {
                    console.error("Request failed", error);
                }
            }
        };

        // Initial fetch
        getEnrollmentData();

        const interval = setInterval(() => {
            getEnrollmentData();
        }, 300000);

        return () => {
            clearInterval(interval);
            if (cancelToken) cancelToken.cancel("Component unmounted.");
        };
    }, [schoolYear]);

    return (
        <div className='space-y-4'>
            <PageTitle align='center'>{schoolYear.start_year} - {schoolYear.end_year} {schoolYear.semester.semester_name} Semester</PageTitle>
            <Head title='Ongoing Enrollment' />
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full'>
                <TotalEnrolled total={totalEnrolled} />
                <DepartmentCounts data={departmentCounts} />
                <YearLevelCounts data={yearLevelCounts} />
                <GenderCounts data={genderCounts} />
                <StudentTypes data={studentTypes} />
                <EnrollmentsPerDate data={enrollmentsPerDate} />
            </div>
        </div>
    )
}

export default OngoingEnrollment
OngoingEnrollment.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
