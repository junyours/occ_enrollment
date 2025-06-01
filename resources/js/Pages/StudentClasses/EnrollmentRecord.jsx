import PreLoader from '@/Components/preloader/PreLoader';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import React, { useEffect, useState } from 'react'

function EnrollmentRecord() {
    const [loading, setLoading] = useState(true);

    const [records, setRecords] = useState([]);

    const getStudentEnrollmentRecord = async () => {
        try {
            const response = await axios.post(route('enrollment-record'));
            setRecords(response.data);
        } catch (error) {
            if (error.response && error.response.data?.error) {
                setError(error.response.data.error);
            } else {
                setError("An unexpected error occurred.");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        getStudentEnrollmentRecord();
    }, []);

    if (loading) return <PreLoader title="Enrollment Record" />;

    return (
        <div>
            <Head title="Enrollment Record" />
            EnrollmentRecord
        </div>
    )
}

export default EnrollmentRecord
EnrollmentRecord.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
