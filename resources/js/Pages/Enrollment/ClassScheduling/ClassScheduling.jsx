import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import PreLoader from '@/Components/preloader/PreLoader';
import React, { useEffect, useState, useRef } from 'react'
import { formatFullName, identifyDayType } from '@/Lib/Utils';
import { Head, usePage, useForm } from '@inertiajs/react';
import { detectTwoScheduleConflict } from '../../../Lib/ConflictUtilities';
import ClassList from './Partials/ClassList';
import Scheduling from './Partials/Scheduling';
import DeletionDialog from './Partials/DeletionDialog';
import ScheduleToolbar from './Partials/ScheduleToolbar';
import Room from './Assigned/Room';
import Instructor from './Assigned/Instructor';
import { Button } from '@/Components/ui/button';
import AddSubjectDialog from './Partials/AddSubjectDialog';
import { toast } from 'sonner';

export default function ClassScheduling({ yearSectionId }) {
    const [fetching, setFetching] = useState(true);

    const bottomRef = useRef(null);

    const [editing, setEditing] = useState(false);
    const [editingSecondSchedule, setEditingSecondSchedule] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    const [colorful, setColorful] = useState(true);
    const [scheduleType, setScheduleType] = useState('tabular');

    const [dayType, setDayType] = useState('Single');
    const [meridiem, setMeridiem] = useState('AM');
    const [classHour, setClassHour] = useState('3');

    const [classes, setClasses] = useState([])
    const [rooms, setRooms] = useState([])
    const [instructors, setInstructors] = useState([])
    const [mainScheduleConflictList, setMainScheduleConflictList] = useState([])
    const [secondScheduleConflictList, setSecondScheduleConflictList] = useState([])
    const [roomConflict, setRoomConflict] = useState(false);
    const [instructorConflict, setInstructorConflict] = useState(false);

    const { data, setData, post, processing, errors, reset, setError, clearErrors } = useForm({
        id: 0,
        year_section_id: yearSectionId,
        faculty_id: 0,
        room_id: 0,

        subject_id: 0,
        class_code: "",
        descriptive_title: "",

        day: "Monday",
        start_time: "7:30",
        end_time: "10:30",
    });

    const getCLasses = async () => {
        await axios.post('/api/enrollment/get-classes', {
            yearSectionId: yearSectionId,
        })
            .then(response => {
                setClasses(response.data.classes)
            })
            .finally(() => {
                setFetching(false)
            })
    }

    useEffect(() => {
        getCLasses()
    }, [])

    const editMainSchedule = (classData) => {
        if (classData.day != 'TBA' || classData.start_time != 'TBA') {
            collectConflictSchedules({
                start_time: classData.start_time,
                end_time: classData.end_time,
                day: classData.day,
                id: classData.id,
            })
        }

        identifyAndChangeDayType(classData.day)

        setData(prevData => ({
            ...prevData,
            class_code: classData.class_code || "",
            subject_code: classData.subject?.subject_code || "",
            subject_id: classData.subject_id || 0,
            descriptive_title: classData.subject?.descriptive_title || "",
            day: classData.day || "",
            start_time: classData.start_time || "",
            end_time: classData.end_time || "",
            id: classData.id || "",
            room_id: classData.room_id,
            faculty_id: classData.faculty_id,
        }));

        const [sHour,] = classData.start_time.split(":");
        const [eHour,] = classData.end_time.split(":");
        changeMeridiem(sHour)
        if (classData.day == "TBA") {
            changeDayType('')
        }

        if (classData.subject.laboratory_hours && classData.start_time == 'TBA') {
            setClassHour('2')
        } else if (classData.start_time != 'TBA' && classData.end_time != 'TBA') {
            setClassHour(`${Number(eHour) - Number(sHour)}`)
        } else {
            setClassHour('3')
        }
    };

    const editSecondSchedule = (classData) => {
        if (classData.day != 'TBA' || classData.start_time != 'TBA') {
            collectConflictSchedules({
                start_time: classData.secondary_schedule.start_time,
                end_time: classData.secondary_schedule.end_time,
                day: classData.secondary_schedule.day,
                id: classData.secondary_schedule.id,
            })
        }

        identifyAndChangeDayType(classData.secondary_schedule.day)
        setEditingSecondSchedule(true)

        setData(prevData => ({
            ...prevData,
            class_code: classData.class_code || "",
            subject_code: classData.subject?.subject_code || "",
            subject_id: classData.subject_id || 0,
            descriptive_title: classData.subject?.descriptive_title || "",
            day: classData.secondary_schedule.day || "",
            start_time: classData.secondary_schedule.start_time || "",
            end_time: classData.secondary_schedule.end_time || "",
            id: classData.secondary_schedule.id || "",
            room_id: classData.secondary_schedule.room_id,
            faculty_id: classData.faculty_id,
        }));

        const [sHour,] = classData.secondary_schedule.start_time.split(":");
        const [eHour,] = classData.secondary_schedule.end_time.split(":");
        changeMeridiem(sHour)
        if (classData.secondary_schedule.day == "TBA") {
            changeDayType('')
        }

        if (classData.subject.laboratory_hours && classData.secondary_schedule.start_time == 'TBA') {
            setClassHour('3')
        } else if (classData.secondary_schedule.start_time != 'TBA' && classData.secondary_schedule.end_time != 'TBA') {
            setClassHour(`${Number(eHour) - Number(sHour)}`)
        } else {
            setClassHour('3')
        }
    }

    const changeMeridiem = (hour) => {
        if (hour >= 12) {
            setMeridiem('PM')
        } else {
            setMeridiem('AM')
        }
    }

    const editSchedule = (classData, type) => {
        getDepartmentRooms()
        getInstructors()
        setEditing(true);
        switch (type) {
            case 'main':
                editMainSchedule(classData)
                break;
            case 'second':
                editSecondSchedule(classData)
                break;
        }

        setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    }

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

    const [classIdToDelete, setClassIdToDelete] = useState(0);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
    const [classType, setClassType] = useState('main');


    const dayOnchange = (day) => {
        collectConflictSchedules({ day: day, start_time: data.start_time, end_time: data.end_time, id: data.id })
        setData('day', day)
    }

    const changeDayType = (type) => {
        let day
        switch (type) {
            case 'Single':
                day = "Monday"
                break;
            case 'Consecutive':
                day = "Mon-Fri"
                break;
            case 'Alternating':
                day = "Mon,Tue,Wed,Thu,Fri"
                break;
        }
        dayOnchange(day)
        setDayType(type)
    }

    const cancelEditing = () => {
        setEditing(false)
        setEditingSecondSchedule(false)
        reset()
    }

    const collectConflictSchedules = (editingSchedule) => {
        if (editingSchedule.day == 'TBA' || editingSchedule.start_time == 'TBA') return

        const mainSchedConflicts = [];
        const secondSchedConflicts = [];

        classes.forEach((cls) => {
            if (detectTwoScheduleConflict(editingSchedule, cls) && cls.id != editingSchedule.id) {
                mainSchedConflicts.push(cls.id);
            }

            if (cls.secondary_schedule && cls.secondary_schedule.id !== editingSchedule.id) {
                const hasConflict = detectTwoScheduleConflict(editingSchedule, cls.secondary_schedule);
                if (hasConflict) {
                    secondSchedConflicts.push(cls.secondary_schedule.id);
                }
            }
        });

        setMainScheduleConflictList(mainSchedConflicts)
        setSecondScheduleConflictList(secondSchedConflicts)
    };

    const startTimeChange = (value, type) => {
        if (!value) return
        const [sHour, sMin] = data.start_time.split(':');
        const [eHour, eMin] = data.end_time.split(':');
        let startTime
        let endTime

        switch (type) {
            case 'hour':
                setData('start_time', `${value}:${sMin}`);
                setData('end_time', `${String(Number(value) + Number(classHour)).padStart(2, '0')}:${eMin}`);
                startTime = `${value}:${sMin}`
                endTime = `${String(Number(value) + Number(classHour)).padStart(2, '0')}:${eMin}`
                break;
            case 'min':
                setData('start_time', `${sHour}:${value}`);
                setData('end_time', `${eHour}:${value}`);
                startTime = `${sHour}:${value}`
                endTime = `${eHour}:${value}`
                break;
            case 'meridiem':
                const { start, end } = meridiemChange(value);
                startTime = start
                endTime = end
                break;
        }

        if (data.day == 'TBA' || startTime == 'TBA') return

        const editingSchedule = {
            start_time: startTime,
            end_time: endTime,
            day: data.day,
            id: data.id,
        }
        collectConflictSchedules(editingSchedule)
    };

    const meridiemChange = (value) => {
        if (!value) return
        const [, min] = data.start_time.split(':');
        let start
        let end

        switch (value) {
            case 'AM':
                setData('start_time', `07:${min}`);
                setData('end_time', `${String(Number(7) + Number(classHour)).padStart(2, '0')}:${min}`);
                start = `07:${min}`
                end = `${String(Number(7) + Number(classHour)).padStart(2, '0')}:${min}`
                break;
            default:
                setData('start_time', `12:${min}`);
                setData('end_time', `${String(Number(12) + Number(classHour)).padStart(2, '0')}:${min}`);
                start = `12:${min}`
                end = `${String(Number(12) + Number(classHour)).padStart(2, '0')}:${min}`
                break;
        }
        setMeridiem(value)
        return { start, end };
    }

    const classHourChange = (value) => {
        setClassHour(value);

        const [hour, min] = data.start_time.split(':');
        const newHour = Number(hour) + Number(value);
        const newEndTime = `${String(newHour).padStart(2, '0')}:${min}`

        setData('end_time', newEndTime);

        const editingSchedule = {
            start_time: data.start_time,
            end_time: newEndTime,
            day: data.day,
            id: data.id,
        }
        collectConflictSchedules(editingSchedule)
    };

    const [loadingRooms, setLoadingRooms] = useState(false);
    const [loadingInstructors, setLoadingInstructors] = useState(false);

    const getDepartmentRooms = async () => {
        if (rooms.length > 0) return;

        setLoadingRooms(true);
        try {
            const response = await axios.post('/api/get-own-department-rooms');
            setRooms(response.data);
        } finally {
            setLoadingRooms(false);
        }
    };

    const getInstructors = async () => {
        if (instructors.length > 0) return;

        setLoadingInstructors(true);
        try {
            const response = await axios.post('/api/get-instructors');
            setInstructors(response.data);
        } finally {
            setLoadingInstructors(false);
        }
    };

    const handleSubmit = async () => {
        clearErrors();

        let errors = {};

        if (data.faculty_id == '') errors.faculty_id = "Required";
        if (data.room_id == '') errors.room_id = "Required";

        if (Object.keys(errors).length > 0) {
            setError(errors);
            return;
        }

        let url

        if (editing && !editingSecondSchedule) {
            url = "enrollment.update.main.class"
        } else if (editSecondSchedule) {
            url = "enrollment.update.second.class"
        }

        if (mainScheduleConflictList.length > 0 || secondScheduleConflictList.length > 0 || roomConflict || instructorConflict) return toast.error("There's a conflict, please resolve!");

        await post(route(url, data), {
            onSuccess: () => {
                reset()
                setEditing(false)
                setEditingSecondSchedule(false)
                toast.success("Class updated successfully.")
                getCLasses()
                setMainScheduleConflictList([])
                setSecondScheduleConflictList([])
            },
            preserveScroll: true,
        });
    };

    if (fetching) return <PreLoader title="Class" />

    return (
        <div className='space-y-4'>
            <Head title="Class" />

            <ScheduleToolbar scheduleType={scheduleType} isDownloading={isDownloading} colorful={colorful} setColorful={setColorful} setScheduleType={setScheduleType} setIsDownloading={setIsDownloading} />

            <ClassList
                secondScheduleConflictList={secondScheduleConflictList}
                scheduleType={scheduleType}
                isDownloading={isDownloading}
                classes={classes}
                editing={editing}
                mainScheduleConflictList={mainScheduleConflictList}
                editSchedule={editSchedule}
                data={data}
                editingSecondSchedule={editingSecondSchedule}
                setClassIdToDelete={setClassIdToDelete}
                colorful={colorful}
                setClassType={setClassType}
                setOpenDeleteDialog={setOpenDeleteDialog}
                getCLasses={getCLasses}
            />

            {(editing) &&
                <Scheduling
                    dayType={dayType}
                    meridiem={meridiem}
                    bottomRef={bottomRef}
                    mainScheduleConflictList={mainScheduleConflictList}
                    secondScheduleConflictList={secondScheduleConflictList}
                    data={data}
                    editingSecondSchedule={editingSecondSchedule}
                    errors={errors}
                    classHour={classHour}
                    rooms={rooms}
                    instructors={instructors}
                    handleSubmit={handleSubmit}
                    processing={processing}
                    dayOnchange={dayOnchange}
                    changeDayType={changeDayType}
                    startTimeChange={startTimeChange}
                    classHourChange={classHourChange}
                    setData={setData}
                    clearErrors={clearErrors}
                    setMainScheduleConflictList={setMainScheduleConflictList}
                    setSecondScheduleConflictList={setSecondScheduleConflictList}
                    cancelEditing={cancelEditing}
                    setDayType={setDayType}
                    collectConflictSchedules={collectConflictSchedules}
                    roomConflict={roomConflict}
                    instructorConflict={instructorConflict}
                    loadingRooms={loadingRooms}
                    loadingInstructors={loadingInstructors}
                />
            }

            {!editing && (
                <AddSubjectDialog yearSectionId={yearSectionId} getCLasses={getCLasses} />
            )}

            < DeletionDialog
                openDeleteDialog={openDeleteDialog}
                setOpenDeleteDialog={setOpenDeleteDialog}
                classType={classType}
                classIdToDelete={classIdToDelete}
                getCLasses={getCLasses}
                setClassIdToDelete={setClassIdToDelete}
            />

            <div className='flex gap-4'>
                {(data.room_id && rooms.length > 0) ? (
                    <Room
                        data={data}
                        roomId={data.room_id}
                        yearSectionId={yearSectionId}
                        roomName={rooms.find(room => room.id == data.room_id)?.room_name}
                        editingSecondSchedule={editingSecondSchedule}
                        setRoomConflict={setRoomConflict}
                        day={data.day}
                        start_time={data.start_time}
                        end_time={data.end_time}
                        setLoadingRooms={setLoadingRooms}
                    />
                ) : (
                    <></>
                )}

                {(data.faculty_id && instructors.length > 0) ? (
                    <>
                        {(() => {
                            const instructor = instructors.find(instructor => instructor.id == data.faculty_id)

                            return (
                                <Instructor
                                    data={data}
                                    instructorId={data.faculty_id}
                                    yearSectionId={yearSectionId}
                                    instructorName={formatFullName(instructor)}
                                    setInstructorConflict={setInstructorConflict}
                                    day={data.day}
                                    start_time={data.start_time}
                                    end_time={data.end_time}
                                    setLoadingInstructors={setLoadingInstructors}
                                />
                            )
                        })()}
                    </>
                ) : (
                    <></>
                )}
            </div>
        </div >
    )
}

ClassScheduling.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
