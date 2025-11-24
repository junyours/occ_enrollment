import SchoolYearPicker from '@/Components/SchoolYearPicker';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React from 'react'

export default function InstructorRequests() {
    return (
        <div>
            <div className='w-max min-h-max'>
                <SchoolYearPicker layout="horizontal" />
            </div>
        </div>
    )
}

InstructorRequests.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
