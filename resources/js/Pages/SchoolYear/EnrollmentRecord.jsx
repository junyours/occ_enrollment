import PreLoader from '@/Components/preloader/PreLoader';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Separator } from '@/Components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { convertToAMPM, formatFullName, formatFullNameFML } from '@/Lib/Utils';
import { Head, usePage } from '@inertiajs/react';
import html2canvas from 'html2canvas';
import { Download, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react'

function EnrollmentRecord() {
    const [loading, setLoading] = useState(true);

    const getEnrollmentRecord = async () => {
        await axios.post(route('enrollment-record'))
            .then(response => {
                setRecords(response.data);
            })
            .catch(error => {
                if (error.response && error.response.data?.error) {
                    setError(error.response.data.error);
                } else {
                    setError("An unexpected error occurred.");
                }
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        // getEnrollmentRecord();
    }, []);



    // if (loading) return <PreLoader title="Enrollment Record" />;

    return (
        <div className='space-y-4 flex items-center flex-col justify-center'>
            <Head title="Enrollment Record" />
            <PageTitle align='center' className='w-full'>ENROLLMENT RECORD</PageTitle>
            Developing
        </div>
    )
}

export default EnrollmentRecord
EnrollmentRecord.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
