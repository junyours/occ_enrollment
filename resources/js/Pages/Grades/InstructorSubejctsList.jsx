import SchoolYearPicker from '@/Components/SchoolYearPicker';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React from 'react'

export default function InstructorSubejctsList() {
    return (
        <div className='w-max min-h-max'>
            <SchoolYearPicker layout="vertical" />
        </div>
    )
}

InstructorSubejctsList.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
