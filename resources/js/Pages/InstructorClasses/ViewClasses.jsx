import PreLoader from '@/Components/preloader/PreLoader';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { convertToAMPM } from '@/Lib/Utils';
import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

const ViewClasses = () => {
    const [loading, setLaoding] = useState(true)
    const [classes, setClasses] = useState([])
    const { currentSchoolYear } = usePage().props;

    const getFaucltyCLasses = async () => {
        await axios.post(route('get.faculty.classes'))
            .then(response => {
                setClasses(response.data)
            })
            .finally(() => {
                setLaoding(false)
            })
    }

    useEffect(() => {
        getFaucltyCLasses()
    }, [])

    if (loading) return <PreLoader title="Classes" />

    if (!currentSchoolYear) {
        return (
            <div className="flex items-center justify-center rounded-md shadow-sm">
                Current School Year not set yet
            </div>
        );
    }

    return (
        <div className='space-y-4 container mx-auto max-w-6xl'>
            <Head title="Classes" />
            <PageTitle align="center" className=''>{currentSchoolYear.start_year}-{currentSchoolYear.end_year} {currentSchoolYear.semester_name} Semester</PageTitle>
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Class List</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Day</TableHead>
                                <TableHead>Subject</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Room</TableHead>
                                <TableHead className="w-12"></TableHead>
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
                                        <TableCell>
                                            <Link href={`classes/classroom/${classInfo.hashed_year_section_subject_id}`}>
                                                <Button className="py-0 h-auto" variant="link">open</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                </>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}

export default ViewClasses
ViewClasses.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
