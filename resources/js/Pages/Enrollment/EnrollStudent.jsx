import React from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import { usePage } from '@inertiajs/react';
import { PageTitle } from '@/Components/ui/PageTitle';

export default function EnrollStudent() {
    const { yearSectionId, courseName, yearlevel, section } = usePage().props;

    const getYearLevelSectionSectionSubjects = async () => {

        await axios.post(`get-year-level-section-section-subjects/${courseid}/${yearLevelNumber}/${section}`)
            .then(response => {
                if (response.data.message === 'success') {
                    setClasses(response.data.classes);
                    console.log(response.data.classes);
                    setDefaultClasses(response.data.classes);
                    setStudentType(response.data.studentType);
                    setYearSectionId(response.data.yearSectionId);
                }
            })
            .finally(() => {
                setFetching(false);
            })
    }

    return (
        <>
            <PageTitle align="center" >{courseName} - {yearlevel}{section}</PageTitle>
        </>
    )
}

EnrollStudent.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
