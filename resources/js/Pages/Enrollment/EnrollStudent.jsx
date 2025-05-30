import React, { useEffect, useRef, useState } from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import { Head, usePage } from '@inertiajs/react';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Select, SelectContent, SelectTrigger, SelectValue, SelectItem } from '@/Components/ui/select';
import { Label } from '@/Components/ui/label';
import { Input } from '@/Components/ui/input';
import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import PreLoader from '@/Components/preloader/PreLoader';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import TimeTable from '../ScheduleFormats/TimeTable';
import { CircleMinus, CirclePlus, ListRestart } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/Components/ui/button';
import { detectTwoScheduleConflict } from '@/Lib/ConflictUtilities';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import Checkbox from '@/Components/Checkbox';

export default function EnrollStudent() {
    const { yearSectionId, courseName, yearlevel, section, schoolYear } = usePage().props;

    const [studentType, setstudentType] = useState('');
    const [studentID, setStudentID] = useState('');
    const [subjectCode, setSubjectCode] = useState('');

    const [studentAlreadyEnrrolled, setStudentAlreadyEnrrolled] = useState(false);
    const [searchingStudent, setSearchingStudent] = useState(false);
    const [gettingCLasses, setGettingCLasses] = useState(false);
    const [addingSubject, setAddingSubject] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [studentFound, setStudentFound] = useState(true);
    const [loading, setLoading] = useState(true);

    const [errors, setErrors] = useState([]);
    const [classes, setClasses] = useState([]);
    const [defaultClasses, setDefaultClasses] = useState([]);
    const [studentInfo, setStudentInfo] = useState([]);
    const [searchedClasses, setSearchedClasses] = useState([]);

    const topRef = useRef(null);

    const totalUnits = classes.reduce((acc, classInfo) => acc + (classInfo?.credit_units || 0), 0);

    const { toast } = useToast();

    const [scheduleType, setScheduleType] = useState('tabular');

    const getCLasses = async () => {
        await axios.post('/api/enrollment/get-classes', {
            yearSectionId: yearSectionId,
        })
            .then(response => {

                const getCLass = response.data.classes;

                const transformedClasses = getCLass.map(cls => ({
                    id: cls.id,
                    class_code: cls.class_code,
                    subject_code: cls.subject.subject_code,
                    day: cls.day,
                    start_time: cls.start_time,
                    end_time: cls.end_time,
                    descriptive_title: cls.subject?.descriptive_title || '',
                    credit_units: cls.subject?.credit_units || '',
                    // first_name: cls.instructor?.instructor_info?.first_name || '',
                    // last_name: cls.instructor?.instructor_info?.last_name || '',
                    // room_name: cls.room?.room_name || '',
                    secondary_schedule: cls.secondary_schedule
                        ? {
                            id: cls.secondary_schedule.id,
                            day: cls.secondary_schedule.day,
                            start_time: cls.secondary_schedule.start_time,
                            end_time: cls.secondary_schedule.end_time,
                            // room_name: cls.secondary_schedule.room?.room_name || ''
                        }
                        : null
                }));
                setClasses(transformedClasses)
                setDefaultClasses(transformedClasses)
            })
            .finally(() => {
                setLoading(false)
            })
    }

    useEffect(() => {
        getCLasses();
    }, [])

    const [typingTimeout, setTypingTimeout] = useState(null);

    const handleStudentIdChange = (e) => {
        const value = e.target.value;
        setStudentAlreadyEnrrolled(false);

        if (value.includes(' ')) return;

        if (value !== "") {
            setErrors(prevErrors => ({
                ...prevErrors,
                studentID: false
            }));
        }

        setStudentID(value);

        if (!value) return setStudentInfo([]);

        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        const newTimeout = setTimeout(() => {
            setStudentInfo([]);
            if (value.length < 5) return;
            getStudentInfo(value);
        }, 1000);

        setTypingTimeout(newTimeout);
    }

    const getStudentInfo = async (value) => {
        setSearchingStudent(true)
        setStudentFound(true);
        await axios.post(route('enrollment.student.info', { schoolYearId: schoolYear.id, studentID: value }))
            .then(response => {
                if (response.data.message === 'success') {
                    setStudentFound(true);
                    setStudentInfo(response.data.student);
                    setStudentAlreadyEnrrolled(response.data.enrolled);
                    setStudentID(response.data.student.user_id_no)
                }
                if (response.data.enrolled) {
                    alreadyEnrolledAlert();
                }
            })
            .finally(() => {
                setSearchingStudent(false);
            })
            .catch(error => {
                if (error.response?.data?.message === 'no student found') {
                    setStudentFound(false);
                } else {
                    console.log(error);
                }
            })
    }

    const handleSubjectCodehange = (e) => {
        const value = e.target.value;

        if (value.includes(' ')) return;
        setSubjectCode(value);
        if (!value) return setSearchedClasses([]);

        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        const newTimeout = setTimeout(() => {
            setStudentInfo([]);
            if (value.length < 3) return;
            searchSubjectClasses(value);
        }, 1000);

        setTypingTimeout(newTimeout);
    }

    const searchSubjectClasses = async (value) => {
        if (!subjectCode) return

        setGettingCLasses(true)
        axios.post(route('subject.classes', { schoolYearId: schoolYear.id, subjectCode: value }))
            .then(response => {
                setSearchedClasses(response.data)
            })
            .finally(() => {
                setGettingCLasses(false)
            })
            .catch(error => {
                if (error.response.data.message == 'no classes found') {
                    setSearchedClasses([]);
                }
            })
    }

    const removeSubject = (id) => {
        const newClasses = classes.filter(classInfo => classInfo.id != id);
        setClasses(newClasses);
    }

    const alreadyEnrolledAlert = () => {
        toast({
            description: "Student already enrolled!",
            variant: "warning",
        })
    }

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

    const enrollStudent = async () => {
        setSubmitting(true);
        if (studentAlreadyEnrrolled) {
            setSubmitting(false);
            alreadyEnrolledAlert();
            topRef.current?.scrollIntoView({ behavior: "smooth" });
            return
        }

        const errors = {};

        if (!studentType) errors.studentType = true;
        if (!studentInfo.id) errors.studentID = true;

        if (Object.keys(errors).length > 0) {
            setErrors(errors);
            topRef.current?.scrollIntoView({ behavior: "smooth" });
            toast({
                description: "Student info incomplete!",
                variant: "destructive",
            })
            setSubmitting(false);
            return;
        }
        const classID = classes.map(cls => cls.id);

        await axios.post(`/enrollment/enroll-student/${studentInfo.id}/${yearSectionId}/${studentType}/${schoolYear.start_date}`, {
            classID: classID
        })
            .then(response => {
                if (response.data.message == 'success') {
                    toast({
                        description: "Student enrolled successfully",
                        variant: "success",
                    })
                    setClasses(defaultClasses);
                    setstudentType('');
                    setStudentInfo([]);
                    setStudentID('')
                }
            })
            .finally(() => {
                setSubmitting(false);
                topRef.current?.scrollIntoView({ behavior: "smooth" });
            })
    }

    if (loading) return <PreLoader title="Enroll" />

    return (
        <div className='space-y-4' >
            <Head title='Enroll' />
            <PageTitle ref={topRef} align="center" >{courseName} - {yearlevel}{section}</PageTitle>
            <Card>
                <CardHeader>
                    <CardTitle className='text-3xl'>Student info <span className='text-sm italic font-normal'>(Add student details if freshman or transferee to create ID)</span></CardTitle>
                </CardHeader>
                <CardContent className='space-y-2'>
                    <div>
                        <Label>Student type</Label>
                        <Select
                            value={studentType}
                            onValueChange={(value) => {
                                setstudentType(value)
                                if (value !== "") {
                                    setErrors(prevErrors => ({
                                        ...prevErrors,
                                        studentType: false
                                    }));
                                }

                            }}
                        >
                            <SelectTrigger className={`p-2 rounded-md text-sm w-40 MB-2 ${errors.studentType ? 'border-red-500' : ''}`}>
                                <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                                {[
                                    { value: 1, name: 'Freshman' },
                                    { value: 2, name: 'Transferee' },
                                    { value: 3, name: 'Old' },
                                    { value: 4, name: 'Returnee' },
                                ].map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Student ID no.</Label>
                        <div className='flex gap-2'>
                            <Input
                                value={studentID}
                                className={`w-40 ${errors.studentID ? 'border-red-500' : ''}`}
                                onChange={handleStudentIdChange}
                            />
                            {searchingStudent && <p className="text-blue-400 text-2xl">Searching Student 🔍</p>}
                            {studentInfo.user_id ? (
                                <p className="text-2xl font-semibold">
                                    Student: <span className="underline font-normal">{formatFullName(studentInfo)}</span> {' '}
                                    {studentAlreadyEnrrolled && (
                                        <span className="text-orange-500">is enrolled already!</span>
                                    )}
                                </p>
                            ) : !studentFound && <p className="text-red-500 text-2xl">Student not found!</p>}
                        </div>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className='text-3xl flex justify-between'>Student classes
                        <div className='flex gap-2'>
                            <ListRestart
                                size={38}
                                onClick={() => setClasses(defaultClasses)}
                                className="cursor-pointer hover:text-blue-500 transition-colors"
                            />
                            <Tabs className="w-max mb-2" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                                <TabsList className="grid max-w-max grid-cols-2">
                                    <TabsTrigger className="w-28" value="tabular">Tabular</TabsTrigger>
                                    <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </CardTitle>

                </CardHeader>
                <CardContent>
                    {scheduleType == "tabular" ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {/* <TableHead>Class Code</TableHead> */}
                                    <TableHead className="w-28">Subject Code</TableHead>
                                    <TableHead>Descriptive Title</TableHead>
                                    <TableHead className="w-36">Day</TableHead>
                                    <TableHead className="w-40">Time</TableHead>
                                    {/* <TableHead className="w-14">Room</TableHead> */}
                                    {/* <TableHead className="w-32">Instructor</TableHead> */}
                                    <TableHead className="w-12 text-center">Units</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {classes.map((classInfo) => {

                                    return (
                                        <React.Fragment key={classInfo.id}>
                                            <TableRow>
                                                <TableCell>{classInfo.subject_code}</TableCell>
                                                <TableCell className="truncate max-w-48 overflow-hidden whitespace-nowrap">{classInfo.descriptive_title}</TableCell>
                                                <TableCell>{classInfo.day == 'TBA' ? '-' : classInfo.day}</TableCell>
                                                <TableCell>
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
                                                {/* <TableCell>
                                                    {classInfo.room ? classInfo.room_name : "-"}
                                                </TableCell> */}
                                                {/* <TableCell className="truncate max-w-32 overflow-hidden whitespace-nowrap">
                                                    {classInfo.first_name ? formatFullName(classInfo) : "-"}
                                                </TableCell> */}
                                                <TableCell className='text-center'>
                                                    {classInfo.credit_units}
                                                </TableCell>
                                                <TableCell>
                                                    <button
                                                        onClick={() => removeSubject(classInfo.id)}
                                                        className="disabled:cursor-not-allowed p-0 h-max text-red-500">
                                                        <CircleMinus
                                                            size={15}
                                                        />
                                                    </button>
                                                </TableCell>
                                            </TableRow>
                                        </React.Fragment>
                                    );
                                })}
                                <TableRow>
                                    <TableCell colSpan={4} className='text-end'>total units:</TableCell>
                                    <TableCell colSpan={1} className='text-center'>{totalUnits}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    ) : (
                        <TimeTable data={classes} />
                    )}
                    <Button
                        disabled={classes.length < 1 || submitting}
                        className="disabled:cursor-not-allowed mt-2"
                        onClick={enrollStudent}
                    >
                        Enroll Student
                    </Button>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className='text-3xl'>Search classes <span className='text-sm italic'>(A red background indicates a conflict of day and time with the added classes.)</span></CardTitle>
                </CardHeader>
                <CardContent>
                    <Label>Subject code</Label>
                    <Input
                        value={subjectCode}
                        className='w-40'
                        onChange={handleSubjectCodehange}
                    />
                    <Table className='mt-2'>
                        <TableBody>
                            {gettingCLasses ? (
                                <TableRow>
                                    <TableCell className="text-center border-y">searching...</TableCell>
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
                                                    <TableCell className='w-28'>{classInfo.class_code}</TableCell>
                                                    <TableCell className='w-28'>{classInfo.subject_code}</TableCell>
                                                    <TableCell className='truncate max-w-48 overflow-hidden whitespace-nowrap'>
                                                        {classInfo.descriptive_title}
                                                    </TableCell>
                                                    <TableCell className="w-36">
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
                                                                onClick={() => { setClasses(prev => [...prev, classInfo]); }}
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
        </div>
    )
}

EnrollStudent.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
