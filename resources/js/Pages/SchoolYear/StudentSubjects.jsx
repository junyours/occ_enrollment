import { Card, CardContent } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import React, { useEffect, useState } from 'react'
import TimeTable from '../ScheduleFormats/TimeTable';

function StudentSubjects({ schoolYearId, studentId }) {
    const [subjects, setSubjects] = useState([])

    const getStudentSubjects = async () => {
        await axios.post(route('enrollment-record.student.subjects', { schoolYearId, studentId }))
            .then((response) => {
                setSubjects(response.data);
            })
    }

    useEffect(() => {
        getStudentSubjects();
    }, [schoolYearId, studentId]);

    const [scheduleType, setScheduleType] = useState('list');

    return (
        <div className="self-start">
            <Card className='w-min mb-2'>
                <CardContent className="p-2">
                    <div className="flex gap-2 w-min">
                        <Tabs className="w-max" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                            <TabsList className="grid max-w-max grid-cols-2">
                                <TabsTrigger className="w-28" value="list">List</TabsTrigger>
                                <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </CardContent>
            </Card>
            {scheduleType == 'list' ? (
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
                        {subjects.map((classInfo) => (
                            <React.Fragment key={classInfo.id}>
                                <TableRow>
                                    <TableCell>{classInfo.descriptive_title}</TableCell>
                                    <TableCell>{classInfo.day == "TBA" ? '-' : classInfo.day}</TableCell>
                                    <TableCell>{classInfo.start_time == 'TBA' ? '-' : `${convertToAMPM(classInfo.start_time)} - ${convertToAMPM(classInfo.end_time)}`}</TableCell>
                                    <TableCell>{classInfo.room_name || '-'}</TableCell>
                                    <TableCell>{classInfo.first_name ? formatFullName(classInfo) : '-'}</TableCell>
                                </TableRow>

                                {classInfo.secondary_schedule ? (
                                    <TableRow>
                                        <TableCell>{classInfo.descriptive_title} <span className='italic'>(2nd Schedule)</span></TableCell>
                                        <TableCell>{classInfo.secondary_schedule.day == "TBA" ? '-' : classInfo.secondary_schedule.day}</TableCell>
                                        <TableCell>{classInfo.secondary_schedule.start_time == 'TBA' ? '-' : `${convertToAMPM(classInfo.secondary_schedule.start_time)} - ${convertToAMPM(classInfo.secondary_schedule.end_time)}`}</TableCell>
                                        <TableCell>{classInfo.secondary_schedule.room_name || '-'}</TableCell>
                                        <TableCell>{classInfo.first_name ? formatFullName(classInfo) : '-'}</TableCell>
                                    </TableRow>
                                ) : (
                                    <></>
                                )}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            ) : (
                <TimeTable data={subjects} />
            )}
        </div>
    )
}

export default StudentSubjects