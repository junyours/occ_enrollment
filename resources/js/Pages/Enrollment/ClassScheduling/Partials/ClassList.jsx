import React from 'react'
import TimeTable from '@/Pages/ScheduleFormats/TimeTable';
import { Card, CardContent, CardHeader, CardTitle, } from "@/Components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/Components/ui/table"
import { Pencil, Trash } from 'lucide-react';
import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import { usePage } from '@inertiajs/react';

function ClassList({ scheduleType, isDownloading, classes, editing, mainScheduleConflictList, editSchedule, data, editingSecondSchedule, setClassIdToDelete, colorful, setClassType, setOpenDeleteDialog }) {
    const { courseName, yearlevel, section } = usePage().props;

    return (
        <Card id={`section-schedule`}>
            <CardHeader className="px-6 mt-4">
                <CardTitle className="text-4xl font-bold" >{courseName} - {yearlevel}{section}</CardTitle>
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
                                <TableHead className="w-14">Room</TableHead>
                                <TableHead className="w-32">Instructor</TableHead>
                                {!isDownloading && <TableHead className="w-12"></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {classes.map((classInfo) => {
                                const isEditing = editing && data.id === classInfo.id && !editingSecondSchedule;
                                const isEditingSecondary = editing && data.id === classInfo.secondary_schedule?.id && editingSecondSchedule;

                                return (
                                    <React.Fragment key={classInfo.id}>
                                        <TableRow className={`${classInfo.secondary_schedule ? 'border-b-0' : ''} ${isEditing ? 'bg-green-500 hover:bg-green-500' : ''} ${mainScheduleConflictList.includes(classInfo.id) ? 'bg-red-700 hover:bg-red-700 text-white' : ''}`}>
                                            <TableCell>{classInfo.subject.subject_code}</TableCell>
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
                                            <TableCell className="truncate max-w-32 overflow-hidden whitespace-nowrap">
                                                {classInfo.instructor ? formatFullName(classInfo.instructor.instructor_info) : "TBA"}
                                            </TableCell>
                                            {!isDownloading && (
                                                <TableCell>
                                                    <div className="flex justify-start space-x-1 h-full">
                                                        <Pencil
                                                            onClick={() => { if (!editing) editSchedule(classInfo, 'main') }}
                                                            size={15}
                                                            className={` ${editing ? 'text-transparent' : 'cursor-pointer text-green-500'}`}
                                                        />
                                                        <Trash
                                                            onClick={() => {
                                                                if (!editing) {
                                                                    setClassIdToDelete(classInfo.id);
                                                                    setClassType('main');
                                                                    setOpenDeleteDialog(true);
                                                                }
                                                            }}
                                                            size={15}
                                                            className={` ${editing ? 'text-transparent' : 'cursor-pointer text-red-500'}`}
                                                        />
                                                    </div>
                                                </TableCell>
                                            )}
                                        </TableRow>

                                        {classInfo.secondary_schedule && (
                                            <TableRow className={`border-t-0 ${isEditingSecondary ? 'bg-green-500 hover:bg-green-500' : ''} ${secondScheduleConflictList.includes(classInfo.secondary_schedule.id) ? 'bg-red-700 hover:bg-red-700 text-white' : ''}`}>
                                                <TableCell>{classInfo.subject.subject_code}</TableCell>
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
                                                <TableCell className="truncate max-w-32 overflow-hidden whitespace-nowrap">
                                                    {classInfo.instructor ? formatFullName(classInfo.instructor.instructor_info) : "TBA"}
                                                </TableCell>
                                                {!isDownloading && (
                                                    <TableCell>
                                                        <div className="flex justify-evenly space-x-1 h-full">
                                                            <Pencil
                                                                onClick={() => { if (!editing) editSchedule(classInfo, 'second') }}
                                                                size={15}
                                                                className={` ${editing ? 'text-transparent' : 'cursor-pointer text-green-500'}`}
                                                            />
                                                            <Trash
                                                                onClick={() => {
                                                                    if (!editing) {
                                                                        setClassIdToDelete(classInfo.secondary_schedule.id);
                                                                        setClassType('second');
                                                                        setOpenDeleteDialog(true);
                                                                    }
                                                                }}
                                                                size={15}
                                                                className={` ${editing ? 'text-transparent' : 'cursor-pointer text-red-500'}`}
                                                            />
                                                        </div>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        )}
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
                                <TimeTable data={transformedClasses} colorful={colorful} />
                            )
                        })()}
                    </>
                )}
            </CardContent>
        </Card>
    )
}

export default ClassList
