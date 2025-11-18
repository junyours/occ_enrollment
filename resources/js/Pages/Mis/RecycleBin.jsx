import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React from 'react'

function RecycleBin() {
    return (
        <div>RecycleBin</div>
    )
}

export default RecycleBin
RecycleBin.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
