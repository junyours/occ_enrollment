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
import { Download } from 'lucide-react';
import React, { useEffect, useState } from 'react'

function EnrollmentRecord() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [records, setRecords] = useState([]);
    const { user } = usePage().props.auth;

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

    const downloadImage = async (id) => {
        const record = records.find(record => record.id == id);

        try {
            // Small delay to let the UI update and show the spinner
            await new Promise(resolve => setTimeout(resolve, 100));

            const filename = `${record.year_level_name}_${record.start_year}-${record.end_year}_${record.semester_name}_Semester_${formatFullNameFML(user)}.png`;
            const element = document.getElementById(`${id}-record`);

            if (element) {
                const style = document.createElement("style");
                document.head.appendChild(style);
                style.sheet?.insertRule('body > div:last-child img { display: inline-block; }');
                style.sheet?.insertRule('td div > svg { display: none !important; }');

                const canvas = await html2canvas(element, { scale: 5 });
                const imageUrl = canvas.toDataURL("image/png");

                const link = document.createElement("a");
                link.href = imageUrl;
                link.download = filename;
                link.click();

                style.remove();
            }
        } catch (error) {
            console.error('Error downloading image:', error);
        }
    };

    if (loading) return <PreLoader title="Enrollment Record" />;

    return (
        <div className='space-y-4 flex items-center flex-col justify-center'>
            <Head title="Enrollment Record" />
            <PageTitle align='center' className='w-full'>ENROLLMENT RECORD</PageTitle>
            {records.map(record => (
                <div className='relative' key={record.id} >
                    <div className="absolute top-0 right-0 z-10">
                        <Button variant="ghost" className='rounded-none text-blue-500 hover:text-blue-500' onClick={() => downloadImage(record.id)}>
                            Download <Download />
                        </Button>
                    </div>
                    <div className='max-w-[calc(100vw-2rem)] min-w-[calc(100vw-2rem)]
                                    sm:w-auto sm:min-w-0 sm:max-w-none
                                    overflow-x-auto sm:p-0 h-[400px] sm:h-auto'
                    >
                        <Card id={`${record.id}-record`} className="mx-2 md:mx-0  w-[1000px]">
                            <CardHeader>
                                <CardTitle className="text-2xl">
                                    <div className='w-full flex justify-between gap-2'>
                                        <div className='flex gap-1'>
                                            <div className='self-start'>{record.year_level_name} |</div>
                                            <div className='self-end'>{record.start_year}-{record.end_year} {record.semester_name} Semester</div>
                                        </div>
                                        <p className='self-end underline'>{formatFullNameFML(user)}</p>
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="">
                                {/* Desktop Table View */}
                                <div className="">
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
                                <div className="hidden">
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
                    </div>
                </div>
            ))}
        </div>
    )
}

export default EnrollmentRecord
EnrollmentRecord.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
