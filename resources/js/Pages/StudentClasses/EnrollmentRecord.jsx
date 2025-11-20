import PreLoader from '@/Components/preloader/PreLoader';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatFullName, formatFullNameFML } from '@/Lib/Utils';
import { Head, usePage } from '@inertiajs/react';
import html2canvas from 'html2canvas';
import { Download, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import FillUpPrompt from './CollectStudentData/FillUpPrompt';

function EnrollmentRecord({ need_fill_up }) {
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

    const [downloadingId, setDownloadingId] = useState(null);

    const downloadImage = async (id) => {
        setDownloadingId(id); // Start loading

        const record = records.find(record => record.id == id);

        try {
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
        } finally {
            setDownloadingId(null); // Done loading
        }
    };

    if (need_fill_up) return <FillUpPrompt />

    if (loading) return <PreLoader title="Enrollment Record" />;

    return (
        <div className='space-y-4 flex items-center flex-col justify-center'>
            <Head title="Enrollment Record" />
            <PageTitle align='center' className='w-full'>ENROLLMENT RECORD</PageTitle>
            {records.map(record => (
                <div className='relative mb-4' key={record.id} >
                    <div className="absolute top-0 right-0 z-10">
                        <div className="absolute top-0 right-0 z-10">
                            <Button
                                variant="ghost"
                                className='rounded-none text-blue-500 hover:text-blue-500'
                                onClick={() => downloadImage(record.id)}
                                disabled={downloadingId === record.id}
                            >
                                {downloadingId === record.id ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Downloading...
                                    </>
                                ) : (
                                    <>
                                        Download <Download className="ml-1" />
                                    </>
                                )}
                            </Button>
                        </div>

                    </div>
                    <div className='max-w-[calc(100vw-2rem)] min-w-[calc(100vw-2rem)]
                                    sm:w-auto sm:min-w-0 sm:max-w-none
                                    overflow-x-auto sm:p-0 h-min sm:h-auto'
                    >
                        <Card id={`${record.id}-record`} className="md:mx-0  w-[1150px]">
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
                                                <TableHead className='w-48'>Instructor</TableHead>
                                                <TableHead className='w-32'>Subject Code</TableHead>
                                                <TableHead>Descriptive Title</TableHead>
                                                <TableHead className='w-24'>Midterm</TableHead>
                                                <TableHead className='w-24'>Final</TableHead>
                                                <TableHead className='w-24'>Final Grade</TableHead>
                                                <TableHead className='w-24'>Remarks</TableHead>
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
                                                                {classInfo.midterm_grade === 0.0 ? (
                                                                    <span className="text-red-500 font-medium">DROPPED</span>
                                                                ) : classInfo.midterm_grade ? (
                                                                    classInfo.midterm_grade?.toFixed(1)
                                                                ) : (
                                                                    '-'
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {classInfo.final_grade === 0.0 ? (
                                                                    <span className="text-red-500 font-medium">DROPPED</span>
                                                                ) : classInfo.final_grade ? (
                                                                    classInfo.final_grade?.toFixed(1)
                                                                ) : (
                                                                    '-'
                                                                )}
                                                            </TableCell>
                                                            <TableCell>
                                                                {classInfo.midterm_grade === 0.0 || classInfo.final_grade === 0.0 ? (
                                                                    <span className="text-red-500 font-medium">DROPPED</span>
                                                                ) : classInfo.midterm_grade && classInfo.final_grade ? (
                                                                    (() => {
                                                                        const avg = (+classInfo.midterm_grade + +classInfo.final_grade) / 2;
                                                                        const finalRating = avg >= 3.05 ? 5.0 : +avg;
                                                                        return <>{(Math.round(finalRating * 10) / 10).toFixed(1)}</>;
                                                                    })()
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
