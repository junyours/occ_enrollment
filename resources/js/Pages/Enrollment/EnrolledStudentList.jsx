import React from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DemoPage from './EnrolledStudentList/Page';

export default function EnrolledStudentList() {
    return (
        <DemoPage/>
    )
}

EnrolledStudentList.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
