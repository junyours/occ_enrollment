import { Button } from '@/Components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import { detectTwoScheduleConflict } from '@/Lib/ConflictUtilities';
import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import TimeTable from '@/Pages/ScheduleFormats/TimeTable';
import axios from 'axios';
import { Check, CircleX } from 'lucide-react';
import React, { useState } from 'react'
import { toast } from 'sonner';

function NstpEnrollment({ data, setErollingStudent, component }) {
    const { selectedSchoolYearEntry } = useSchoolYearStore();
    const [selectedSection, setSelectedSection] = useState({});
    const [studentID, setStudentID] = useState('');
    const [studentInfo, setStudentInfo] = useState([]);
    const [studentClasses, setStudentClasses] = useState([]);
    const [errorMessage, setErrorMessage] = useState('');
    const [searchingStudent, setSearchingStudent] = useState(false);
    const [typingTimeout, setTypingTimeout] = useState(null);
    const [conflicts, setConflicts] = useState([])
    const [scheduleType, setScheduleType] = useState('tabular');

    const handleStudentIdChange = (e) => {
        const value = e.target.value;

        if (value.includes(' ')) return;

        setStudentID(value);

        if (!value) {
            setStudentClasses([]);
            setStudentInfo([]);
            setErrorMessage('');
            setConflicts([]);
            return;
        }
        if (typingTimeout) {
            clearTimeout(typingTimeout);
        }

        const newTimeout = setTimeout(() => {
            setStudentInfo([]);
            setStudentClasses([]);
            if (value.length < 5) return;
            getStudentInfo(value);
            setConflicts([]);
        }, 1000);

        setTypingTimeout(newTimeout);
    }

    const getStudentInfo = async (value) => {
        setSearchingStudent(true)
        setErrorMessage('');
        await axios.post(route('nstp-director.component.student-with-nstp', { component }), { schoolYearId: selectedSchoolYearEntry.id, studentId: value })
            .then(response => {
                if (response.data.message === 'success') {
                    setStudentInfo(response.data.studentInfo);
                    setStudentID(response.data.studentInfo.user_id_no)
                    setStudentClasses(response.data.classes)

                    response.data.classes.forEach((cls) => {
                        collectConflictSchedules({
                            start_time: cls.start_time,
                            end_time: cls.end_time,
                            day: cls.day,
                        })
                        if (cls.secondary_schedule && cls.secondary_schedule.id !== cls.id) {
                            collectConflictSchedules(
                                {
                                    start_time: cls.secondary_schedule.start_time,
                                    end_time: cls.secondary_schedule.end_time,
                                    day: cls.secondary_schedule.day,
                                }
                            );
                        }
                    });
                }
            })
            .finally(() => {
                setSearchingStudent(false);
                setErrorMessage('');
            })
            .catch(error => {
                console.log(error);
                const message = error.response.data.message;
                setStudentClasses([]);
                if (message) {
                    toast.error(message);
                    setErrorMessage(message);
                }
            })
    }

    const collectConflictSchedules = (editingSchedule) => {
        if (editingSchedule.day == 'TBA' || editingSchedule.start_time == 'TBA') return

        const conflicts = [];

        data.forEach((nstp) => {
            const nstpScheds = {
                start_time: nstp.schedule.start_time,
                end_time: nstp.schedule.end_time,
                day: nstp.schedule.day,
            }

            if (detectTwoScheduleConflict(editingSchedule, nstpScheds)) {
                conflicts.push(nstp.id);
                if (selectedSection.id === nstp.id) setSelectedSection({})

            }

        });

        setConflicts(prev => [...prev, ...conflicts]);
    };

    const [enrolling, setEnrolling] = useState(false);

    const enroll = async () => {
        if (!selectedSection.id) return
        setEnrolling(true);
        const studentNstpSubjectId = studentClasses.find(studClass => studClass.type == 'nstp');
        console.log(studentNstpSubjectId);

        await axios.post(route('nstp-director.component.enroll-student', { component }), { nstpSectionScheduleId: selectedSection.id, studentNstpSubjectId: studentNstpSubjectId.student_subject_id })
            .then(() => {
                toast.success("Enrolled successfully")
            })
            .finally(() => {
                setEnrolling(false);
                setErollingStudent(false);
                setStudentClasses([]);
                setStudentInfo([]);
                setErrorMessage('')
                setConflicts([]);
            })
    }

    if (!data) return <></>

    return (
        <div className='space-y-4'>
            <Button variant="destructive" className='w-full' onClick={() => setErollingStudent(false)}><CircleX /> Close Enrollment</Button>
            <Card>
                <CardHeader className="mb-2">
                    <CardTitle className="text-2xl">{component.toUpperCase()} Sections</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className='py-2 h-max'>Section</TableHead>
                                <TableHead className='py-2 h-max'>Students</TableHead>
                                <TableHead className='py-2 h-max'>Day</TableHead>
                                <TableHead className='py-2 h-max'>Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((section) => {
                                const sectionName = section.section || '-';
                                const day = section.schedule.day == 'TBA' ? '-' : section.schedule.day;
                                const start_time = section.schedule.start_time == 'TBA' ? '' : section.schedule.start_time;
                                const end_time = section.schedule.end_time == 'TBA' ? '' : section.schedule.end_time;
                                const time = start_time ? `${convertToAMPM(start_time)} – ${convertToAMPM(end_time)}` : '-';

                                const maxStudents = section.max_students || 0;
                                const students = section.students_count || 0;
                                const studentCountTextColor = students > maxStudents
                                    ? "text-red-600 font-bold" // Overload
                                    : students == maxStudents
                                        ? "text-green-600 font-bold" // Complete
                                        : students + 5 >= maxStudents
                                        && "text-orange-400 font-bold"

                                return (
                                    <TableRow key={section.id} className={`${conflicts.includes(section.id) ? 'bg-red-700 hover:bg-red-700 text-white' : ''}`}>
                                        <TableCell className='py-1'>{sectionName}</TableCell>
                                        <TableCell className={`border-r py-1 ${studentCountTextColor}`}>
                                            <p>{students}/{maxStudents}</p>
                                        </TableCell>
                                        <TableCell className='py-1'>{day}</TableCell>
                                        <TableCell className='py-1'>{time}</TableCell>
                                        <TableCell className="py-1">
                                            {conflicts.includes(section.id) ? (
                                                <p>Conflict</p>
                                            ) : (
                                                <>
                                                    {selectedSection.id === section.id ? (
                                                        <div className="flex items-center gap-2 text-green-600 font-medium">
                                                            <Check className="h-4 w-4" />
                                                            Selected
                                                        </div>
                                                    ) : (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => setSelectedSection(section)}
                                                            className="h-6"
                                                        >
                                                            Select
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className='text-3xl'>Search student</CardTitle>
                </CardHeader>
                <CardContent className='space-y-2'>
                    <div>
                        <Label>Student ID no.</Label>
                        <div className='flex gap-2'>
                            <Input
                                value={studentID}
                                className={`w-40`}
                                onChange={handleStudentIdChange}
                            />
                            {searchingStudent && <p className="text-blue-400 text-2xl">Searching Student 🔍</p>}
                            {(studentInfo.id && !errorMessage) ? (
                                <p className="text-2xl font-semibold">
                                    Student: <span className="underline font-normal">{formatFullName(studentInfo)}</span> {' '}
                                </p>
                            ) : <></>}
                            {errorMessage ? (
                                <p className="text-2xl text-red-500">{errorMessage}</p>
                            ) : <></>}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="mx-2 md:mx-0 hidden md:block space-y-4">
                <CardHeader>
                    <CardTitle className="text-2xl flex justify-between">
                        <div className='flex gap-4'>
                            <p>Student Classes</p>
                            <Tabs className="w-max" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="tabular" >
                                <TabsList className="grid max-w-max grid-cols-2">
                                    <TabsTrigger className="w-28" value="tabular">Tabular</TabsTrigger>
                                    <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                        <Button disabled={!selectedSection.id || enrolling} onClick={enroll}>Enroll</Button>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Card>
                        {scheduleType == 'tabular' ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Subject</TableHead>
                                        <TableHead>Day</TableHead>
                                        <TableHead>Time</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {studentClasses.map((classInfo) => {

                                        return (
                                            <React.Fragment key={classInfo.id}>
                                                {/* Primary schedule row */}
                                                <TableRow className={``}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-3">
                                                            <span>
                                                                {classInfo.type === 'nstp' && !classInfo.nstp_student_schedule_id
                                                                    ? 'NSTP - Select Component'
                                                                    : classInfo.descriptive_title} {classInfo.component_name ? `| ${classInfo.component_name.toUpperCase()}` : ''}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {classInfo.day === 'TBA' ? '-' : classInfo.day}
                                                    </TableCell>
                                                    <TableCell className={`tabular-nums`}>
                                                        {classInfo.start_time === 'TBA' ? '-' : `${convertToAMPM(classInfo.start_time)} – ${convertToAMPM(classInfo.end_time)}`}
                                                    </TableCell>
                                                </TableRow>

                                                {/* Secondary schedule */}
                                                {classInfo.secondary_schedule && (
                                                    <TableRow>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex flex-col">
                                                                    <span>
                                                                        {classInfo.descriptive_title} <span className="text-[10px] font-extralight italic uppercase opacity-60">2nd Schedule</span>
                                                                    </span>

                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            {classInfo.secondary_schedule.day}
                                                        </TableCell>
                                                        <TableCell className={`tabular-nums`}>
                                                            {convertToAMPM(classInfo.secondary_schedule.start_time)} – {convertToAMPM(classInfo.secondary_schedule.end_time)}
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </React.Fragment>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <TimeTable data={studentClasses} />
                        )}
                    </Card>
                </CardContent>
            </Card>
        </div>
    )
}

export default NstpEnrollment