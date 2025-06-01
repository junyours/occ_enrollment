import PreLoader from '@/Components/preloader/PreLoader';
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { FaExclamationTriangle } from 'react-icons/fa';

const ViewClasses = () => {
    const [loading, setLoading] = useState(true);
    const [classes, setClasses] = useState([]);
    const [error, setError] = useState(null);
    const { currentSchoolYear } = usePage().props;

    const getStudentClasses = async () => {
        try {
            const response = await axios.post(route('student.classes'), {
                schoolYearId: currentSchoolYear.id
            });
            setClasses(response.data);
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
        getStudentClasses();
    }, []);

    if (loading) return <PreLoader title="Classes" />;

    return (
        <div className='space-y-4'>
            <Head title="Classes" />
            <PageTitle align="center" className=''>{currentSchoolYear.start_year}-{currentSchoolYear.end_year} {currentSchoolYear.semester_name} Semester</PageTitle>
            {error ? (
                <Alert variant="destructive" className="mb-4">
                    <FaExclamationTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Class List</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Day</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Room</TableHead>
                                    <TableHead>Instructor</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {classes.map(classInfo => (
                                    <>
                                        <TableRow>
                                            <TableCell>{classInfo.day == "TBA" ? '-' : classInfo.day}</TableCell>
                                            <TableCell>{classInfo.descriptive_title}</TableCell>
                                            <TableCell>{classInfo.start_time == 'TBA' ? '-' : `${convertToAMPM(classInfo.start_time)} - ${convertToAMPM(classInfo.end_time)}`}</TableCell>
                                            <TableCell>{classInfo.room_name || '-'}</TableCell>
                                            <TableCell>{classInfo.first_name ? formatFullName(classInfo) : '-'}</TableCell>
                                        </TableRow>
                                    </>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

        </div>
    );
};


export default ViewClasses
ViewClasses.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
