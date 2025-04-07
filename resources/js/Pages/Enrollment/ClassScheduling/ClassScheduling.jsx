import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import PreLoader from '@/Components/preloader/PreLoader';
import TimeTable from '@/Pages/ScheduleFormats/TimeTable';
import React, { useEffect, useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, } from "@/Components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, } from "@/Components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/Components/ui/toggle-group"
import { Pencil, Trash, Megaphone, Check, FileDown, ImageDown, } from 'lucide-react';
import { convertToAMPM, formatFullName, identifyDayType } from '@/Lib/Utils';
import { Head, usePage, useForm } from '@inertiajs/react';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/Components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/Components/ui/command"
import { cn } from '@/Lib/Utils';
import { useToast } from '@/hooks/use-toast';
import { detectTwoScheduleConflict } from '../../../Lib/ConflictUtilities';
import { Switch } from '@/Components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const dayNumber = {
    'Mon': 1,
    'Tue': 2,
    'Wed': 3,
    'Thu': 4,
    'Fri': 5,
    'Sat': 6,
    'Sun': 7,
}

const dayAccToCom = {
    'Mon': "Monday",
    'Tue': "Tuesday",
    'Wed': "Wednesday",
    'Thu': "Thursday",
    'Fri': "Friday",
    'Sat': "Saturday",
    'Sun': "Sunday",
}

const hours = [
    { value: '07', hour: '7' },
    { value: '08', hour: '8' },
    { value: '09', hour: '9' },
    { value: '10', hour: '10' },
    { value: '11', hour: '11' },
    { value: '12', hour: '12' },
    { value: '13', hour: '1' },
    { value: '14', hour: '2' },
    { value: '15', hour: '3' },
    { value: '16', hour: '4' },
    { value: '17', hour: '5' }
];

export default function ClassScheduling() {
    const { toast } = useToast()

    const [fetching, setFetching] = useState(true);
    const { yearSectionId, courseName, yearlevel, section } = usePage().props;

    const bottomRef = useRef(null);

    const [editing, setEditing] = useState(false);
    const [editingSecondSchedule, setEditingSecondSchedule] = useState(false);

    const [open, setOpen] = React.useState(false)

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

    const deleteSecondSchedule = (id) => {

    }

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

    const getDepartmentRooms = async () => {
        if (rooms.length > 0) return
        await axios.post('/api/get-own-department-rooms')
            .then(response => {
                setRooms(response.data)
            })
    }

    const getInstructors = async () => {
        if (instructors.length > 0) return
        await axios.post('/api/get-instructors')
            .then(response => {
                console.log(response.data)
                setInstructors(response.data)
            })
    }

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

        await post(route(url, data), {
            onSuccess: () => {
                reset()
                setEditing(false)
                setEditingSecondSchedule(false)
                toast({
                    description: "Class updated successfully.",
                    variant: "success",
                })
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
            <Card>
                <CardContent className="p-2">
                    <div className="flex gap-2 w-min">
                        <Tabs className="w-max" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                            <TabsList className="grid max-w-max grid-cols-2">
                                <TabsTrigger className="w-28" value="tabular">Tabular</TabsTrigger>
                                <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <Button className="bg-green-600 hover:bg-green-500" variant="">
                            <FileDown />
                            Excel
                        </Button>
                        <Button className="bg-blue-700 hover:bg-blue-600" variant="">
                            <ImageDown />
                            Image
                        </Button>

                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={colorful}
                                onCheckedChange={(value) => setColorful(value)}
                                id="color"
                            />
                            <Label htmlFor="airplane-mode">Color</Label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
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
                                    <TableHead className="w-12"></TableHead>
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
                                                <TableCell>
                                                    <div className="flex justify-start space-x-1 h-full">
                                                        <Pencil
                                                            onClick={() => { if (!editing) editSchedule(classInfo, 'main') }}
                                                            size={15}
                                                            className={` ${editing ? 'text-transparent' : 'cursor-pointer text-green-500'}`}
                                                        />
                                                    </div>
                                                </TableCell>
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
                                                    <TableCell>
                                                        <div className="flex justify-evenly space-x-1 h-full">
                                                            <Pencil
                                                                onClick={() => { if (!editing) editSchedule(classInfo, 'second') }}
                                                                size={15}
                                                                className={` ${editing ? 'text-transparent' : 'cursor-pointer text-green-500'}`}
                                                            />
                                                            <Trash
                                                                onClick={() => { if (!editing) deleteSecondSchedule(classInfo.secondary_schedule.id) }}
                                                                size={15}
                                                                className={` ${editing ? 'text-transparent' : 'cursor-pointer text-red-500'}`} />
                                                        </div>
                                                    </TableCell>
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

            {editing &&
                <Card ref={bottomRef} className={`${mainScheduleConflictList.length > 0 || secondScheduleConflictList.length > 0 ? ' border-red-600 ' : 'border-green-500'}`}>
                    <CardHeader>
                        <CardTitle className="text-2xl">{data.subject_code} - {data.descriptive_title} <span className='text-lg italic'>{editingSecondSchedule && '(2nd schedule)'}</span></CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex gap-4">
                            <Card className="w-full p-0">
                                <CardHeader className="m-0 px-2 pt-2" >
                                    <CardTitle className="text-xl">Schedule</CardTitle>
                                </CardHeader>
                                <CardContent className="pb-4 px-2">
                                    <div>
                                        <div className='flex gap-2'>
                                            <div className='flex justify-between w-full'>
                                                <Label htmlFor="text-end">Day</Label>
                                                {/* {schoolYear.semester_id == 3 && */}
                                                    <RadioGroup
                                                        disabled={data.day == 'TBA'}
                                                        value={dayType}
                                                        defaultValue={dayType}
                                                        onValueChange={(value) => changeDayType(value)}
                                                        className="flex">
                                                        <div className="flex items-center space-x-2">
                                                            <RadioGroupItem value="Single" id="r1" />
                                                            <Label htmlFor="r1">Single</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <RadioGroupItem value="Consecutive" id="r2" />
                                                            <Label htmlFor="r2">Consecutive</Label>
                                                        </div>
                                                        <div className="flex items-center space-x-2">
                                                            <RadioGroupItem value="Alternating" id="r3" />
                                                            <Label htmlFor="r3">Alternating</Label>
                                                        </div>
                                                    </RadioGroup>
                                                 {/* } */}
                                            </div>
                                            <Megaphone className='self-center text-transparent' />
                                        </div>
                                        <div className='flex gap-2'>
                                            {(dayType === "Single" && data.day != "TBA") && (
                                                <Select
                                                    value={data.day}
                                                    onValueChange={(value) => {
                                                        setData("day", value)
                                                        collectConflictSchedules({
                                                            start_time: data.start_time,
                                                            end_time: data.end_time,
                                                            day: value,
                                                            id: data.id,
                                                        })
                                                    }}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a day" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                                                            <SelectItem key={day} value={day}>
                                                                {day}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}

                                            {(dayType === "Consecutive" && data.day != "TBA") && (() => {
                                                const [start, end] = data.day.split("-");
                                                const startDay = dayNumber[start];
                                                const endDay = dayNumber[end];

                                                return (
                                                    <div className="relative flex items-center w-full gap-1">
                                                        {/* Start Day Select */}
                                                        <Select value={start} onValueChange={(value) => dayOnchange(`${value}-${end}`)}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a day" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {days.map((day) => (
                                                                    <SelectItem key={day} value={day} disabled={dayNumber[day] >= endDay}>
                                                                        {dayAccToCom[day]}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>

                                                        <span className="text-2xl">-</span>

                                                        {/* End Day Select */}
                                                        <Select value={end} onValueChange={(value) => dayOnchange(`${start}-${value}`)}>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select a day" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {days.map((day) => (
                                                                    <SelectItem key={day} value={day} disabled={dayNumber[day] <= startDay}>
                                                                        {dayAccToCom[day]}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                );
                                            })()}

                                            {(dayType === 'Alternating' && data.day != "TBA") && (() => {
                                                const dayChangeAlternating = (value) => {
                                                    const daysValue = value
                                                        .filter(day => day) // Remove empty strings or falsy values
                                                        .sort((a, b) => days.indexOf(a) - days.indexOf(b)) // Sort based on daysOrder
                                                        .join(","); // Join without spaces
                                                    dayOnchange(daysValue)
                                                }

                                                return (
                                                    <ToggleGroup
                                                        onValueChange={(value) => {
                                                            if (value.length <= 1) return
                                                            dayChangeAlternating(value)
                                                        }}
                                                        value={data.day.split(',').map(day => day.trim())}
                                                        type="multiple"
                                                        variant="outline"
                                                        className="w-full flex justify-start"
                                                    >
                                                        {days.map((day) => (
                                                            <ToggleGroupItem
                                                                key={day}
                                                                value={day}
                                                                aria-label="Toggle bold"
                                                                className=" w-14 data-[state=on]:bg-[hsl(var(--toggle-active-bg))] data-[state=on]:text-[hsl(var(--toggle-active-text))]"
                                                            >
                                                                {day}
                                                            </ToggleGroupItem>
                                                        ))}
                                                    </ToggleGroup>
                                                )
                                            })()}
                                            {data.day == "TBA" &&
                                                <Select disabled={true} readOnly={true} value={data.day}>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="TBA" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="TBA">
                                                            TBA
                                                        </SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            }
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Megaphone
                                                            onClick={() => {
                                                                if (data.day == 'TBA') {
                                                                    setData('day', 'Monday')
                                                                    collectConflictSchedules({
                                                                        start_time: data.start_time,
                                                                        end_time: data.end_time,
                                                                        day: 'Monday',
                                                                        id: data.id,
                                                                    })
                                                                } else {
                                                                    setData('day', 'TBA')
                                                                    setMainScheduleConflictList([])
                                                                    setSecondScheduleConflictList([])
                                                                }
                                                                setDayType('Single')
                                                            }}
                                                            className={`self-center ${data.day == 'TBA' && 'text-green-500'} cursor-pointer`} />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="">
                                                        <p> To Be Announce (TBA)</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>

                                    <Label>Time</Label>
                                    <div className='flex gap-2'>
                                        <div className='flex gap-1 w-full items-center'>
                                            {(() => {
                                                const [hourValue, mins] = data.start_time.split(":");
                                                return (
                                                    <Popover>
                                                        <PopoverTrigger
                                                            disabled={data.start_time == 'TBA'}
                                                            className="w-full">
                                                            <Input
                                                                disabled={data.start_time == 'TBA'}
                                                                label="Start Time"
                                                                type={data.start_time == 'TBA' ? 'text' : 'time'}
                                                                readOnly={true}
                                                                value={data.start_time}
                                                                onChange={(e) => setData("start_time", e.target.value)}
                                                                error={errors.start_time}
                                                            />
                                                        </PopoverTrigger>
                                                        <PopoverContent className="p-2 w-min flex flex-row gap-2">
                                                            <ToggleGroup
                                                                type="single"
                                                                variant="outline"
                                                                className="flex flex-col w-min"
                                                                value={hourValue} onValueChange={(value) => startTimeChange(value, 'hour')}
                                                            >
                                                                {hours.filter(hour => (meridiem === 'PM' ? hour.value >= 12 : hour.value < 12)) // Filter correctly
                                                                    .map(hour => (
                                                                        <ToggleGroupItem
                                                                            className="data-[state=on]:bg-[hsl(var(--toggle-active-bg))] data-[state=on]:text-[hsl(var(--toggle-active-text))]"
                                                                            key={hour.value}
                                                                            value={hour.value}>
                                                                            {hour.hour}
                                                                        </ToggleGroupItem>
                                                                    ))}
                                                            </ToggleGroup>
                                                            <ToggleGroup
                                                                type="single"
                                                                variant="outline"
                                                                className="flex flex-col w-min justify-start"
                                                                value={mins}
                                                                onValueChange={(value) => startTimeChange(value, 'min')}>
                                                                <ToggleGroupItem className="data-[state=on]:bg-[hsl(var(--toggle-active-bg))] data-[state=on]:text-[hsl(var(--toggle-active-text))]" value='00'>
                                                                    00
                                                                </ToggleGroupItem>
                                                                <ToggleGroupItem className="data-[state=on]:bg-[hsl(var(--toggle-active-bg))] data-[state=on]:text-[hsl(var(--toggle-active-text))]" value='30'>
                                                                    30
                                                                </ToggleGroupItem>
                                                            </ToggleGroup>
                                                            <ToggleGroup
                                                                type="single"
                                                                variant="outline"
                                                                className="flex flex-col w-min justify-start"
                                                                value={meridiem}
                                                                onValueChange={(value) => startTimeChange(value, 'meridiem')}>
                                                                <ToggleGroupItem className="data-[state=on]:bg-[hsl(var(--toggle-active-bg))] data-[state=on]:text-[hsl(var(--toggle-active-text))]" value='AM'>
                                                                    AM
                                                                </ToggleGroupItem>
                                                                <ToggleGroupItem className="data-[state=on]:bg-[hsl(var(--toggle-active-bg))] data-[state=on]:text-[hsl(var(--toggle-active-text))]" value='PM'>
                                                                    PM
                                                                </ToggleGroupItem>
                                                            </ToggleGroup>
                                                        </PopoverContent>
                                                    </Popover>
                                                )
                                            })()}
                                            <span className="text-2xl">-</span>
                                            <Select
                                                disabled={data.start_time == 'TBA'}
                                                value={classHour}
                                                onValueChange={(value) => classHourChange(value)}>
                                                <SelectTrigger className='w-full'>
                                                    <Input
                                                        disabled={data.start_time == 'TBA'}
                                                        label="End Time"
                                                        type={data.start_time == 'TBA' ? 'text' : 'time'}
                                                        readOnly={true}
                                                        value={data.end_time}
                                                        onChange={(e) => setData("end_time", e.target.value)}
                                                        error={errors.end_time}
                                                        className="border-none px-0 cursor-pointer"
                                                    />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="2">
                                                        2hrs
                                                    </SelectItem>
                                                    <SelectItem value="3">
                                                        3hrs
                                                    </SelectItem>
                                                    <SelectItem value="5">
                                                        5hrs
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Megaphone
                                                        onClick={() => {
                                                            if (data.start_time == 'TBA') {
                                                                setData('start_time', '07:30')
                                                                setData('end_time', `${String(7 + Number(classHour)).padStart(2, '0')}:30`);
                                                                collectConflictSchedules({
                                                                    start_time: '07:30',
                                                                    end_time: `${7 + Number(classHour)}:30`,
                                                                    day: data.day,
                                                                    id: data.id,
                                                                })
                                                            } else {
                                                                setData('start_time', 'TBA')
                                                                setData('end_time', 'TBA')
                                                                setMainScheduleConflictList([])
                                                                setSecondScheduleConflictList([])
                                                            }
                                                        }}
                                                        className={`self-center ${data.start_time == 'TBA' && 'text-green-500'}  cursor-pointer`} />
                                                </TooltipTrigger>
                                                <TooltipContent className="">
                                                    <p> To Be Announce (TBA)</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="w-full p-0">
                                <CardHeader className="m-0 px-2 pt-2" >
                                    <CardTitle className="text-xl">Assign</CardTitle>
                                </CardHeader>
                                <CardContent className="pb-4 px-2">
                                    <Label>Room</Label>
                                    <div className='flex gap-2'>
                                        <Select
                                            disabled={data.room_id == null}
                                            value={data.room_id}
                                            onValueChange={(value) => {
                                                setData('room_id', value)
                                                clearErrors('room_id')
                                            }}>
                                            <SelectTrigger className={`${errors.room_id && 'border-red-500'}`}>
                                                <SelectValue placeholder="Select room..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {rooms.map(room => (
                                                    <SelectItem key={room.id} value={room.id}>
                                                        {room.room_name}
                                                    </SelectItem>
                                                ))}
                                                {data.room_id == null &&
                                                    <SelectItem value={null}>
                                                        TBA
                                                    </SelectItem>
                                                }
                                            </SelectContent>
                                        </Select>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Megaphone
                                                        onClick={() => {
                                                            if (data.room_id == null) {
                                                                setData('room_id', '')
                                                            } else {
                                                                setData('room_id', null)
                                                                clearErrors('room_id')
                                                            }
                                                        }}
                                                        className={`self-center ${data.room_id == null && 'text-green-500'}  cursor-pointer`} />
                                                </TooltipTrigger>
                                                <TooltipContent className="">
                                                    <p> To Be Announce (TBA)</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>

                                    <Label>Instructor {editingSecondSchedule && <span className='text-xs font-normal italic'>(unable to edit instructor when editing 2nd schedule)</span>}</Label>
                                    <div className='flex gap-2'>
                                        <Popover open={open} onOpenChange={setOpen}>
                                            <PopoverTrigger disabled={data.faculty_id == null || editingSecondSchedule} asChild>
                                                <Input
                                                    placeholder="Select instructor..."
                                                    readOnly
                                                    value={instructors === undefined ? "Loading..." :
                                                        data.faculty_id
                                                            ? formatFullName(instructors.find((instructor) => instructor.id === data.faculty_id) || {})
                                                            : data.faculty_id == null ? "TBA" : "Select instructor..."}
                                                    className={`cursor-pointer text-start border ${errors.faculty_id && 'border-red-500'}`}
                                                />
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[200px] p-0">
                                                <Command>
                                                    <CommandInput placeholder="Search instructor..." className="h-9 border-0 outline-none p-0" />
                                                    <CommandList>
                                                        <CommandEmpty>No instructor found.</CommandEmpty>
                                                        <CommandGroup>
                                                            {Array.isArray(instructors) &&
                                                                instructors.map((instructor) => (
                                                                    <CommandItem
                                                                        key={instructor.id}
                                                                        value={instructor.id}
                                                                        onSelect={() => {
                                                                            setData('faculty_id', instructor.id);
                                                                            clearErrors('faculty_id')
                                                                            setOpen(false);
                                                                        }}
                                                                    >
                                                                        {formatFullName(instructor)}
                                                                        <Check
                                                                            className={cn(
                                                                                "ml-auto",
                                                                                data.faculty_id === instructor.id ? "opacity-100" : "opacity-0"
                                                                            )}
                                                                        />
                                                                    </CommandItem>
                                                                ))}
                                                            {data.faculty_id == null &&
                                                                <CommandItem value={null} onSelect={() => setData('faculty_id', null)}>
                                                                    TBA
                                                                </CommandItem>
                                                            }
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>

                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Megaphone
                                                        onClick={() => {
                                                            if (editingSecondSchedule) return
                                                            if (data.faculty_id == null) {
                                                                setData('faculty_id', '')
                                                            } else {
                                                                setData('faculty_id', null)
                                                                clearErrors('faculty_id')
                                                            }
                                                        }}
                                                        className={`self-center ${data.faculty_id == null && 'text-green-500'}  cursor-pointer`}
                                                    />
                                                </TooltipTrigger>
                                                <TooltipContent className="">
                                                    <p> To Be Announce (TBA)</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <Button
                            onClick={() => {
                                cancelEditing()
                                clearErrors()
                                setMainScheduleConflictList([])
                                setSecondScheduleConflictList([])
                            }}
                            variant="secondary">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            className="ml-2"
                            type="submit"
                            disabled={processing}>
                            {processing ? "Submitting..." : "Submit"}
                        </Button>
                    </CardContent>
                </Card>
            }
        </div >
    )
}

ClassScheduling.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
