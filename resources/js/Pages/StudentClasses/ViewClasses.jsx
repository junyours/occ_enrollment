import PreLoader from '@/Components/preloader/PreLoader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

const ViewClasses = () => {
    const [loading, setLaoding] = useState(true)
    const [classes, setClasses] = useState([])

    const getStudentCLasses = async () => {
        await axios.post(route('get.student.classes'))
            .then(response => {
                setClasses(response.data)
            })
            .finally(() => {
                setLaoding(false)
            })
    }

    useEffect(() => {
        getStudentCLasses()
    }, [])

    if (loading) return <PreLoader title="Classes" />

    return (
        <div>
            <Head title="Classes" />
        </div>
    )
}

export default ViewClasses
ViewClasses.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
