import PreLoader from '@/Components/preloader/PreLoader';
import { PageTitle } from '@/Components/ui/PageTitle';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { convertToAMPM, formatFullNameFML } from '@/Lib/Utils';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/Components/ui/table"
import { CirclePlus, Loader2, Search, Trash2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { detectTwoScheduleConflict } from '@/Lib/ConflictUtilities';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import TimeTable from '../ScheduleFormats/TimeTable';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';

export default function StudentSubjects() {
    const { courseName, yearlevel, section, student, schoolYear } = usePage().props
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [addingSubject, setAddingSubject] = useState(false);
    const [deletingSubject, setDeletingSubject] = useState(false);
    const [classes, setClasses] = useState([]);
    const [scheduleType, setScheduleType] = useState('tabular');
    const [subjectCode, setSubjectCode] = useState('');
    const [gettingCLasses, setGettingCLasses] = useState(false);
    const [searchedClasses, setsearchedClasses] = useState([]);

    const getStudentSubjects = async () => {
        axios.post('/api/enrollment/get-student-subjects', { schoolYearId: schoolYear.id, studentId: student.user_id_no })
            .then(response => {
                setClasses(response.data)
            })
            .finally(() => {
                setLoading(false)
            })
    }

    useEffect(() => {
        getStudentSubjects()
    }, [])

    if (loading) return <PreLoader title='Subjects' />

    const detectOwnConflict = (schedule) => {
        if (schedule.day == "TBA" || schedule.start_time == "TBA") return false

        let conflict = false

        classes.forEach((cls) => {
            if (detectTwoScheduleConflict(schedule, cls) && cls.id != schedule.id) {
                conflict = true
                return
            }

            if (cls.secondary_schedule && cls.secondary_schedule.id != schedule.id) {
                const hasConflict = detectTwoScheduleConflict(schedule, cls.secondary_schedule);
                if (hasConflict) {
                    conflict = true
                    return
                }
            }
        });

        return conflict
    }

    const searchSubjectClasses = async () => {
        if (!subjectCode) return

        setGettingCLasses(true)
        axios.post(route('subject.classes', { schoolYearId: schoolYear.id, subjectCode: subjectCode }))
            .then(response => {
                setsearchedClasses(response.data)
            })
            .finally(() => {
                setGettingCLasses(false)
            })
            .catch(error => {
                console.log(error)
                setsearchedClasses([]);
            })
    }

    const removeSubject = async (id) => {
        setDeletingSubject(true)

        await axios.delete(route('enrollment.delete.subject', { studentSubjectId: id }))
            .then(response => {
                if (response.data.message === 'success') {
                    setDeletingSubject(false);
                    const newClasses = classes.filter(classInfo => classInfo.student_subject_id != id);
                    setClasses(newClasses)

                }
            })
            .finally(() => {
                setDeletingSubject(false);
            })
    }

    const addSubject = async (classInfo) => {
        setAddingSubject(true);

        await axios.post(route('enrollment.add.subject', { schoolYearId: schoolYear.id, studentId: student.user_id_no, classId: classInfo.id }))
            .then(response => {
                if (response.data.message === 'success') {
                    setClasses(prev => [...prev, ...response.data.class]);
                }
            })
            .finally(() => {
                setAddingSubject(false);
            })
    }

    return (
        <div className='space-y-4'>
            <Head title="Subjects" />
            <PageTitle align="center">{courseName} - {yearlevel}{section}</PageTitle>
            <PageTitle>{formatFullNameFML(student)}</PageTitle>
            <Tabs className="w-max" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                <TabsList className="grid max-w-max grid-cols-2">
                    <TabsTrigger className="w-28" value="tabular">Tabular</TabsTrigger>
                    <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                </TabsList>
            </Tabs>
            <Card>
                <CardHeader className="flex flex-row gap-2 mb-2">
                    <CardTitle className="text-2xl font-bold w-full content-center flex justify-between items-center">
                        Class List
                        <Button
                            onClick={() => setEditing(!editing)}
                            variant={`outline`}>
                            {editing ? 'cancel' : 'edit'}
                        </Button >
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {scheduleType == 'tabular' ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-32">Subject Code</TableHead>
                                    <TableHead>Descriptive Title</TableHead>
                                    <TableHead className="w-40">Day</TableHead>
                                    <TableHead className="w-40">Time</TableHead>
                                    <TableHead className="w-3">Units</TableHead>
                                    {editing && (
                                        <TableHead className="w-8"></TableHead>
                                    )}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {classes.map((classInfo) => {
                                    const mainHasConflict = detectOwnConflict(classInfo, 'main');
                                    let secondHasCOnflict = false;
                                    if (classInfo.secondary_schedule) {
                                        secondHasCOnflict = detectOwnConflict(classInfo.secondary_schedule, 'second');
                                    }

                                    return (
                                        <React.Fragment key={classInfo.id}>
                                            <TableRow>
                                                <TableCell>{classInfo.subject_code}</TableCell>
                                                <TableCell className="truncate max-w-48 overflow-hidden whitespace-nowrap">{classInfo.descriptive_title}</TableCell>
                                                <TableCell>
                                                    <div className='flex flex-col'>
                                                        <span className={`${mainHasConflict ? 'bg-red-500 text-white' : ''}`}>
                                                            {classInfo.day == 'TBA' ? '-' : classInfo.day}
                                                        </span>
                                                        <span className={`${secondHasCOnflict ? 'bg-red-500 text-white' : ''}`}>
                                                            {classInfo.secondary_schedule ? (classInfo.secondary_schedule.day === 'TBA' ? '-' : classInfo.secondary_schedule.day) : null}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className='flex flex-col'>
                                                        <span className={`${mainHasConflict ? 'bg-red-500 text-white' : ''}`}>
                                                            {classInfo.start_time !== "TBA"
                                                                ? convertToAMPM(classInfo.start_time) + ' - ' + convertToAMPM(classInfo.end_time)
                                                                : "-"}
                                                        </span>
                                                        <span className={`${secondHasCOnflict ? 'bg-red-500 text-white' : ''}`}>
                                                            {classInfo.secondary_schedule ? (classInfo.secondary_schedule.start_time !== "TBA"
                                                                ? convertToAMPM(classInfo.secondary_schedule.start_time) + ' - ' + convertToAMPM(classInfo.secondary_schedule.end_time)
                                                                : '-')
                                                                : null}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className='text-center'>{classInfo.credit_units}</TableCell>
                                                {editing && (
                                                    <TableCell>
                                                        <Trash2
                                                            onClick={() => {
                                                                if (deletingSubject) return
                                                                removeSubject(classInfo.student_subject_id)
                                                            }}
                                                            size={15}
                                                            className={`${deletingSubject ? '' : 'cursor-pointer'} text-red-500`}
                                                        />
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <TimeTable data={classes} />
                    )}
                </CardContent>
            </Card>
            {editing && (
                <Card >
                    <CardHeader>
                        <CardTitle onClick={() => console.log(classes)} className='text-2xl'>Search Classes {' '}
                            <span className="text-sm italic font-thin">
                                (A red background indicates a conflict of day and time with the added classes.)
                            </span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex w-full max-w-sm items-center space-x-2">
                            <Input
                                type="text"
                                placeholder="Subject code"
                                value={subjectCode}
                                onChange={(e) => setSubjectCode(e.target.value)}
                            />
                            <Button
                                type="Subject code"
                                onClick={searchSubjectClasses}
                                disabled={gettingCLasses}
                            >
                                <Search />
                            </Button>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Course & Section</TableHead>
                                    <TableHead>Subject code</TableHead>
                                    <TableHead>Descriptive title</TableHead>
                                    <TableHead>Students</TableHead>
                                    <TableHead>Day</TableHead>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Units</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {gettingCLasses ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="text-center border-y py-6 animate-pulse text-muted-foreground"
                                        >
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span className="font-medium">Searching for classes...</span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <>
                                        {searchedClasses.length > 0 ? (
                                            searchedClasses.map(classInfo => {
                                                let conflict = false;

                                                if (detectOwnConflict(classInfo)) {
                                                    conflict = true;
                                                } else if (classInfo.secondary_schedule) {
                                                    conflict = detectOwnConflict(classInfo.secondary_schedule)
                                                }

                                                const exist = classes.find(classItem => classItem.subject_code === classInfo.subject_code);

                                                return (
                                                    <TableRow key={classInfo.id} className={`${conflict && !exist ? 'bg-red-500 hover:bg-red-500' : ''}`}> {/* always good to add a unique key */}
                                                        <TableCell className='w-36'>{classInfo.class_code}</TableCell>
                                                        <TableCell className='w-28'>{classInfo.subject_code}</TableCell>
                                                        <TableCell className='truncate max-w-48 overflow-hidden whitespace-nowrap'>
                                                            {classInfo.descriptive_title}
                                                        </TableCell>
                                                        <TableCell className='flex gap-1 items-center'>
                                                            <Users size={14} /> {classInfo.student_count}
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className='flex flex-col'>
                                                                <span>{classInfo.day === 'TBA' ? '-' : classInfo.day}</span>
                                                                <span>{classInfo.secondary_schedule ? (classInfo.secondary_schedule.day === 'TBA' ? '-' : classInfo.secondary_schedule.day) : null}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="w-40">
                                                            <div className='flex flex-col'>
                                                                <span>
                                                                    {classInfo.start_time !== "TBA"
                                                                        ? convertToAMPM(classInfo.start_time) + ' - ' + convertToAMPM(classInfo.end_time)
                                                                        : "-"}
                                                                </span>
                                                                <span>
                                                                    {classInfo.secondary_schedule ? (classInfo.secondary_schedule.start_time !== "TBA"
                                                                        ? convertToAMPM(classInfo.secondary_schedule.start_time) + ' - ' + convertToAMPM(classInfo.secondary_schedule.end_time)
                                                                        : '-')
                                                                        : null}
                                                                </span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className='w-8'>{classInfo.credit_units}</TableCell>
                                                        <TableCell className="w-8">
                                                            <div className='flex justify-center'>
                                                                <Button
                                                                    disabled={conflict || exist || addingSubject}
                                                                    variant="icon"
                                                                    className={`p-0 h-min ${exist || conflict ? 'text-gray-500 cursor-not-allowed' : 'text-green-500 cursor-pointer'}`}
                                                                    onClick={() => { addSubject(classInfo) }}
                                                                >
                                                                    <CirclePlus
                                                                        size={15}
                                                                    />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center border-y">
                                                    No classes.
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

StudentSubjects.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
