import PreLoader from '@/Components/preloader/PreLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Separator } from '@/Components/ui/separator';
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
            <PageTitle align="center" className='text-lg md:text-xl lg:text-2xl px-4'>
                {currentSchoolYear.start_year}-{currentSchoolYear.end_year} {currentSchoolYear.semester_name} Semester
            </PageTitle>
            <Card className="mx-2 md:mx-0">
                <CardHeader>
                    <CardTitle className="text-2xl">Class List</CardTitle>
                </CardHeader>
                <CardContent className="">
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
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
                                {error ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className='text-center'>{error}</TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {classes.map((classInfo, index) => (
                                            <TableRow key={index}>
                                                <TableCell>{classInfo.descriptive_title}</TableCell>
                                                <TableCell>{classInfo.day == "TBA" ? '-' : classInfo.day}</TableCell>
                                                <TableCell>{classInfo.start_time == 'TBA' ? '-' : `${convertToAMPM(classInfo.start_time)} - ${convertToAMPM(classInfo.end_time)}`}</TableCell>
                                                <TableCell>{classInfo.room_name || '-'}</TableCell>
                                                <TableCell>{classInfo.first_name ? formatFullName(classInfo) : '-'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden">
                        {error ? (
                            <div className="p-4 text-center text-red-600">
                                <FaExclamationTriangle className="mx-auto mb-2" size={24} />
                                <p>{error}</p>
                            </div>
                        ) : (
                            <div className="space-y-3 p-4">
                                {classes.map((classInfo, index) => (
                                    <React.Fragment key={index} >
                                        <div className="space-y-2">
                                            <div className="font-semibold text-lg leading-tight">
                                                {classInfo.descriptive_title}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <span className="">Day:</span>
                                                    <div className="">
                                                        {classInfo.day == "TBA" ? '-' : classInfo.day}
                                                    </div>
                                                </div>

                                                <div>
                                                    <span className="">Room:</span>
                                                    <div className="">
                                                        {classInfo.room_name || '-'}
                                                    </div>
                                                </div>

                                                <div className="col-span-2">
                                                    <span className="">Time:</span>
                                                    <div className="">
                                                        {classInfo.start_time == 'TBA' ? '-' : `${convertToAMPM(classInfo.start_time)} - ${convertToAMPM(classInfo.end_time)}`}
                                                    </div>
                                                </div>

                                                <div className="col-span-2">
                                                    <span className="">Instructor:</span>
                                                    <div className="">
                                                        {classInfo.first_name ? formatFullName(classInfo) : '-'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <Separator className="my-4" />
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div >
    );
};

export default ViewClasses
ViewClasses.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
