import PreLoader from '@/Components/preloader/PreLoader';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Separator } from '@/Components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import { Head } from '@inertiajs/react';
import React, { useEffect, useState } from 'react'

function EnrollmentRecord() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [records, setRecords] = useState([]);

    const getStudentEnrollmentRecord = async () => {
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
        getStudentEnrollmentRecord();
    }, []);

    if (loading) return <PreLoader title="Enrollment Record" />;

    return (
        <div className='space-y-4'>
            <Head title="Enrollment Record" />
            {records.map(record => (
                <Card key={record.id} className="mx-2 md:mx-0">
                    <CardHeader>
                        <CardTitle className="text-lg md:text-xl lg:text-2xl">
                            <div className='w-full flex flex-col md:flex-row md:justify-between gap-2'>
                                <div>{record.year_level_name}</div>
                                <div className="text-sm md:text-base lg:text-lg">{record.start_year}-{record.end_year} {record.semester_name} Semester</div>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="">
                        {/* Desktop Table View */}
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Instructor</TableHead>
                                        <TableHead>Subject Code</TableHead>
                                        <TableHead>Descriptive Title</TableHead>
                                        <TableHead>Final Grade</TableHead>
                                        <TableHead>Remarks</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {error ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className='text-center'>{error}</TableCell>
                                        </TableRow>
                                    ) : (
                                        <>
                                            {record.subjects.map(classInfo => (
                                                <TableRow key={classInfo.id}>
                                                    <TableCell>{classInfo.first_name ? formatFullName(classInfo) : '-'}</TableCell>
                                                    <TableCell>{classInfo.subject_code}</TableCell>
                                                    <TableCell>{classInfo.descriptive_title}</TableCell>
                                                    <TableCell>
                                                        {classInfo.midterm_grade === 0.0 || classInfo.final_grade === 0.0 ? (
                                                            <span className="text-red-500 font-medium">DROPPED</span>
                                                        ) : classInfo.midterm_grade && classInfo.final_grade ? (
                                                            ((+classInfo.midterm_grade + +classInfo.final_grade) / 2).toFixed(1)
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        {
                                                            classInfo.midterm_grade === 0.0 || classInfo.final_grade === 0.0 ? (
                                                                <span className="text-red-500 font-medium">DROPPED</span>
                                                            ) : classInfo.midterm_grade && classInfo.final_grade ? (
                                                                ((+classInfo.midterm_grade + +classInfo.final_grade) / 2).toFixed(1) > 3 ? (
                                                                    <span className="text-red-500 font-medium">FAILED</span>
                                                                ) : (
                                                                    <span className="text-green-600 font-medium">PASSED</span>
                                                                )
                                                            ) : (
                                                                '-'
                                                            )
                                                        }
                                                    </TableCell>
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
                                    {record.subjects.map((classInfo, index) => (
                                        <React.Fragment key={classInfo.id}>
                                            <div className="space-y-2">
                                                <div className="font-semibold text-lg leading-tight">
                                                    {classInfo.descriptive_title}
                                                </div>
                                                <div className="text-sm font-medium text-gray-600">
                                                    {classInfo.subject_code}
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <div>
                                                        <span className="">Instructor:</span>
                                                        <div className="">
                                                            {classInfo.first_name ? formatFullName(classInfo) : '-'}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <span className="">Final Grade:</span>
                                                        <div className="font-semibold">
                                                            {classInfo.midterm_grade === 0.0 || classInfo.final_grade === 0.0 ? (
                                                                <span className="text-red-500 font-medium">DROPPED</span>
                                                            ) : classInfo.midterm_grade && classInfo.final_grade ? (
                                                                ((+classInfo.midterm_grade + +classInfo.final_grade) / 2).toFixed(1)
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="col-span-2">
                                                        <span className="">Remarks:</span>
                                                        <div className="">
                                                            {classInfo.midterm_grade === 0.0 || classInfo.final_grade === 0.0 ? (
                                                                <span className="text-red-500 font-medium">DROPPED</span>
                                                            ) : classInfo.midterm_grade && classInfo.final_grade ? (
                                                                ((+classInfo.midterm_grade + +classInfo.final_grade) / 2).toFixed(1) > 3 ? (
                                                                    <span className="text-red-500 font-medium">FAILED</span>
                                                                ) : (
                                                                    <span className="text-green-600 font-medium">PASSED</span>
                                                                )
                                                            ) : (
                                                                '-'
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            {index < record.subjects.length - 1 && <Separator className="my-4" />}
                                        </React.Fragment>
                                    ))}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

export default EnrollmentRecord
EnrollmentRecord.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
