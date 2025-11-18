import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React from 'react'

function Students() {
    return (
        <div>Student</div>
    )
}

export default Students
Students.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
