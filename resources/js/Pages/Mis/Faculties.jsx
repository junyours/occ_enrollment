import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React from 'react'

function Faculties() {
    return (
        <div>Faculties</div>
    )
}

export default Faculties
Faculties.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
