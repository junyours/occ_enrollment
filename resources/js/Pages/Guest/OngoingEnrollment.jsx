import { Head } from '@inertiajs/react';
import React, { useEffect, useRef, useState } from 'react';
import { PageTitle } from '@/Components/ui/PageTitle';
import NoSchoolYear from '../President/NoSchoolYear';
import axios from 'axios';
import DepartmentCounts from '../President/DepartmentCounts';
import TotalEnrolled from '../President/TotalEnrolled';
import YearLevelCounts from '../President/YearLevelCounts';
import GenderCounts from '../President/GenderCounts';
import StudentTypes from '../President/StudentTypes';
import EnrollmentsPerDate from '../President/EnrollmentsPerDate';
import PeakDays from '../President/PeakDays';
import GuestLayout from '@/Layouts/GuestLayout';

function OngoingEnrollment({ schoolYear }) {
    const [departmentCounts, setDepartmentCounts] = useState([]);
    const [totalEnrolled, seTotalEnrolled] = useState(0);
    const [yearLevelCounts, setYearLevelCounts] = useState([]);
    const [genderCounts, setGenderCount] = useState([]);
    const [studentTypes, setStudentTypes] = useState([]);
    const [enrollmentsPerDate, setEnrollmentsPerDate] = useState([]);
    const [peakDays, setPeakDays] = useState([]);

    const cancelTokenRef = useRef(null);
    const intervalRef = useRef(null);

    if (!schoolYear) return <NoSchoolYear />;

    const getEnrollmentData = async () => {
        if (cancelTokenRef.current) {
            cancelTokenRef.current.cancel("Cancelled due to new request or unmount.");
        }

        cancelTokenRef.current = axios.CancelToken.source();

        try {
            const response = await axios.post(
                route('enrollment-data'),
                { schoolYearId: schoolYear.id },
                { cancelToken: cancelTokenRef.current.token }
            );

            setDepartmentCounts(response.data.departmenCounts);
            seTotalEnrolled(response.data.totalEnrolled);
            setYearLevelCounts(response.data.yearLevelCounts);
            setGenderCount(response.data.genderCounts);
            setStudentTypes(response.data.studentTypeCounts);
            setEnrollmentsPerDate(response.data.enrollmentsPerDate);
            setPeakDays(response.data.peakDays);
        } catch (error) {
            if (axios.isCancel(error)) {
                console.log("Request canceled", error.message);
            } else {
                console.error("Request failed", error);
            }
        }
    };

    useEffect(() => {
        if (!schoolYear) return;

        // Initial fetch
        getEnrollmentData();

        // Set interval
        intervalRef.current = setInterval(() => {
            getEnrollmentData();
        }, 300000); // 5 minutes

        // Refetch when window regains focus
        const handleFocus = () => {
            getEnrollmentData();
        };
        window.addEventListener('focus', handleFocus);

        return () => {
            clearInterval(intervalRef.current);
            if (cancelTokenRef.current) cancelTokenRef.current.cancel("Component unmounted.");
            window.removeEventListener('focus', handleFocus);
        };
    }, [schoolYear]);

    return (
        <div className='space-y-4 w-full'>
            <PageTitle align='center'>
                {schoolYear.start_year} - {schoolYear.end_year} {schoolYear.semester.semester_name} Semester
            </PageTitle>
            <Head title='Ongoing Enrollment' />
            <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full'>
                <TotalEnrolled total={totalEnrolled} />
                <DepartmentCounts data={departmentCounts} />
                <YearLevelCounts data={yearLevelCounts} />
                <GenderCounts data={genderCounts} />
                <StudentTypes data={studentTypes} />
                <PeakDays data={peakDays} />
                <EnrollmentsPerDate data={enrollmentsPerDate} />
            </div>
        </div>
    )
}

export default OngoingEnrollment
OngoingEnrollment.layout = (page) => <GuestLayout>{page}</GuestLayout>;
