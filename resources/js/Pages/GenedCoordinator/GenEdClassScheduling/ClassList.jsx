import { Card, CardContent } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { convertToAMPM, formatFullName, identifyDayType } from '@/Lib/Utils';
import TimeTable from '@/Pages/ScheduleFormats/TimeTable';
import { Pencil } from 'lucide-react';
import React from 'react'
import useClassScheduleStore from './useClassScheduleStore'
import useScheduleStore from './useClassScheduleStore';
import axios from 'axios';

function ClassList({ classes, scheduleType, editing }) {

    const mainScheduleConflictList = useScheduleStore(state => state.mainScheduleConflictList);
    const secondScheduleConflictList = useScheduleStore(state => state.secondScheduleConflictList);

    const rooms = useScheduleStore(state => state.rooms);
    const setRooms = useScheduleStore(state => state.setRooms);
    const setInstructors = useScheduleStore(state => state.setInstructors);
    const instructors = useScheduleStore(state => state.instructors);

    const getRooms = async () => {
        if (rooms.length > 0) return
        await axios.post(route('gened-coordinator.all-rooms'))
            .then(response => {
                setRooms(response.data)
            })
    }

    const getInstructors = async () => {
        if (instructors.length > 0) return
        await axios.post(route('gened-coordinator.all-instructors'))
            .then(response => {
                setInstructors(response.data)
            })
    }

    const selectedSubject = useClassScheduleStore.getState().selectedSubject
    const setSelectedSubject = useClassScheduleStore.getState().setSelectedSubject

    const editSchedule = (subject) => {

        getRooms();
        getInstructors();
        identifyAndChangeDayType(subject.day);

        const structuredSubject = {
            class_code: subject.class_code || "",
            subject_code: subject.subject?.subject_code || "",
            subject_id: subject.subject_id || 0,
            descriptive_title: subject.subject?.descriptive_title || "",
            day: subject.day || "",
            start_time: subject.start_time || "",
            end_time: subject.end_time || "",
            id: subject.id || "",
            room_id: subject.room_id,
            faculty_id: subject.faculty_id,
        }
        setSelectedSubject(structuredSubject)
    }

    const setDayType = useClassScheduleStore.getState().setDayType


    const identifyAndChangeDayType = (day) => {
        const dayType = identifyDayType(day)

        switch (dayType) {
            case 'Alternating':
                setDayType('Alternating')
                break;
            case 'Consecutive':
                setDayType('Consecutive')
                break;
            default:
                setDayType('Single')
        }
    }

    return (
        <Card className='pt-6' id={`section-schedule`}>
            <CardContent>
                {scheduleType == "tabular" ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead className="w-36">Day</TableHead>
                                <TableHead className="w-44">Time</TableHead>
                                <TableHead className="w-16">Room</TableHead>
                                <TableHead className="w-36">Instructor</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classes.map((classInfo) => {
                                const isEditing = selectedSubject.id === classInfo.id;

                                return (
                                    <React.Fragment key={classInfo.id}>
                                        <TableRow className={`${classInfo.secondary_schedule ? 'border-b-0' : ''} ${isEditing ? 'bg-green-500 hover:bg-green-500' : ''} ${mainScheduleConflictList.includes(classInfo.id) ? 'bg-red-700 hover:bg-red-700 text-white' : ''}`}>
                                            <TableCell className="truncate max-w-48 overflow-hidden whitespace-nowrap">{classInfo.subject.descriptive_title}</TableCell>
                                            <TableCell>{classInfo.day}</TableCell>
                                            <TableCell>
                                                {classInfo.start_time !== "TBA"
                                                    ? convertToAMPM(classInfo.start_time) + ' - ' + convertToAMPM(classInfo.end_time)
                                                    : "TBA"}
                                            </TableCell>
                                            <TableCell>
                                                {classInfo.room ? classInfo.room.room_name : "TBA"}
                                            </TableCell>
                                            <TableCell className="truncate max-w-40 overflow-hidden whitespace-nowrap">
                                                {classInfo.instructor ? formatFullName(classInfo.instructor.instructor_info) : "TBA"}
                                            </TableCell>
                                            <TableCell className='w-8'>
                                                {selectedSubject.id ? (
                                                    <></>
                                                ) : (
                                                    <Pencil
                                                        onClick={() => { if (!editing) editSchedule(classInfo) }}
                                                        size={15}
                                                        className={` ${editing ? 'text-transparent' : 'cursor-pointer text-green-500'}`}
                                                    />
                                                )}
                                            </TableCell>
                                        </TableRow>

                                        {
                                            classInfo.secondary_schedule && (
                                                <TableRow className={`border-t-0 ${secondScheduleConflictList.includes(classInfo.secondary_schedule.id) ? 'bg-red-700 hover:bg-red-700 text-white' : ''}`}>
                                                    <TableCell className="truncate max-w-32 overflow-hidden whitespace-nowrap">{classInfo.subject.descriptive_title} <span className='text-xs italic'>(2nd schedule)</span></TableCell>
                                                    <TableCell>{classInfo.secondary_schedule.day}</TableCell>
                                                    <TableCell>
                                                        {classInfo.secondary_schedule.start_time !== "TBA"
                                                            ? convertToAMPM(classInfo.secondary_schedule.start_time) + ' - ' + convertToAMPM(classInfo.secondary_schedule.end_time)
                                                            : "TBA"}
                                                    </TableCell>
                                                    <TableCell>
                                                        {classInfo.secondary_schedule.room ? classInfo.secondary_schedule.room.room_name : "TBA"}
                                                    </TableCell>
                                                    <TableCell className="truncate max-w-40 overflow-hidden whitespace-nowrap">
                                                        {classInfo.instructor ? formatFullName(classInfo.instructor.instructor_info) : "TBA"}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        }
                                    </React.Fragment>
                                );
                            })}
                        </TableBody>
                    </Table>
                ) : (
                    <>
                        {(() => {
                            const transformedClasses = classes.map(cls => ({
                                id: cls.id,
                                class_code: cls.class_code,
                                day: cls.day,
                                start_time: cls.start_time,
                                end_time: cls.end_time,
                                descriptive_title: cls.subject?.descriptive_title || '',
                                first_name: cls.instructor?.instructor_info?.first_name || '',
                                last_name: cls.instructor?.instructor_info?.last_name || '',
                                room_name: cls.room?.room_name || '',
                                secondary_schedule: cls.secondary_schedule
                                    ? {
                                        id: cls.secondary_schedule.id,
                                        day: cls.secondary_schedule.day,
                                        start_time: cls.secondary_schedule.start_time,
                                        end_time: cls.secondary_schedule.end_time,
                                        room_name: cls.secondary_schedule.room?.room_name || ''
                                    }
                                    : null
                            }));

                            return (
                                <TimeTable data={transformedClasses} />
                            )
                        })()}
                    </>
                )}
            </CardContent>
        </Card >
    )
}

export default ClassList