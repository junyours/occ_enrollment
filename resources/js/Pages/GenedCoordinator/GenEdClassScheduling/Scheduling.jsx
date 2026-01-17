import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, } from "@/Components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/Components/ui/toggle-group"
import { Megaphone, Check } from 'lucide-react';
import { formatFullName } from '@/Lib/Utils';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/Components/ui/command"
import { cn } from '@/Lib/Utils';
import useScheduleStore from './useClassScheduleStore';
import { detectTwoScheduleConflict } from '@/Lib/ConflictUtilities';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';

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
    { value: '17', hour: '5' },
    { value: '18', hour: '6' },
    { value: '19', hour: '7' },
    { value: '20', hour: '8' },
];

export default function Scheduling({
    refetch
}) {
    const [open, setOpen] = useState(false)

    const dayType = useScheduleStore(state => state.dayType);
    const setDayType = useScheduleStore(state => state.setDayType);

    const mainScheduleConflictList = useScheduleStore(state => state.mainScheduleConflictList);
    const setMainScheduleConflictList = useScheduleStore(state => state.setMainScheduleConflictList);
    const secondScheduleConflictList = useScheduleStore(state => state.secondScheduleConflictList);
    const setSecondScheduleConflictList = useScheduleStore(state => state.setSecondScheduleConflictList);

    const selectedSubject = useScheduleStore(state => state.selectedSubject);

    const clearSelectedSubject = useScheduleStore(state => state.clearSelectedSubject);

    const errors = useScheduleStore(state => state.errors);
    const setError = useScheduleStore(state => state.setError);
    const clearErrors = useScheduleStore(state => state.clearErrors);

    const setSelectedSubjectField = useScheduleStore(state => state.setSelectedSubjectField);

    const classes = useScheduleStore(state => state.classes);

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

    const setMeridiem = useScheduleStore(state => state.setMeridiem);
    const meridiem = useScheduleStore(state => state.meridiem);

    const meridiemChange = (value) => {

        if (!value) return;

        const [, min] = selectedSubject.start_time.split(':');

        let start;
        let end;

        switch (value) {
            case 'AM':
                setSelectedSubjectField('start_time', `07:${min}`);
                setSelectedSubjectField('end_time', `${String(Number(7) + Number(classHour)).padStart(2, '0')}:${min}`);
                start = `07:${min}`
                end = `${String(Number(7) + Number(classHour)).padStart(2, '0')}:${min}`
                break;
            default:
                setSelectedSubjectField('start_time', `12:${min}`);
                setSelectedSubjectField('end_time', `${String(Number(12) + Number(classHour)).padStart(2, '0')}:${min}`);
                start = `12:${min}`
                end = `${String(Number(12) + Number(classHour)).padStart(2, '0')}:${min}`
                break;
        };

        setMeridiem(value);

        const editingSchedule = {
            start_time: start,
            end_time: end,
            day: selectedSubject.day,
            id: selectedSubject.id,
        };

        collectConflictSchedules(editingSchedule);
    }

    const startTimeChange = (value, type) => {
        if (!value) return
        const [sHour, sMin] = selectedSubject.start_time.split(':');
        const [eHour, eMin] = selectedSubject.end_time.split(':');
        let startTime
        let endTime

        switch (type) {
            case 'hour':
                setSelectedSubjectField('start_time', `${value}:${sMin}`);
                setSelectedSubjectField('end_time', `${String(Number(value) + Number(classHour)).padStart(2, '0')}:${eMin}`);
                startTime = `${value}:${sMin}`
                endTime = `${String(Number(value) + Number(classHour)).padStart(2, '0')}:${eMin}`
                break;
            case 'min':
                setSelectedSubjectField('start_time', `${sHour}:${value}`);
                setSelectedSubjectField('end_time', `${eHour}:${value}`);
                startTime = `${sHour}:${value}`
                endTime = `${eHour}:${value}`
                break;
        }

        const editingSchedule = {
            start_time: startTime,
            end_time: endTime,
            day: selectedSubject.day,
            id: selectedSubject.id,
        }

        collectConflictSchedules(editingSchedule)
    };

    const classHour = useScheduleStore(state => state.classHour);
    const setClassHour = useScheduleStore(state => state.setClassHour);

    const classHourChange = (value) => {
        setClassHour(value);

        const [hour, min] = selectedSubject.start_time.split(':');
        const newHour = Number(hour) + Number(value);
        const newEndTime = `${String(newHour).padStart(2, '0')}:${min}`

        setSelectedSubjectField('end_time', newEndTime);

        collectConflictSchedules({
            start_time: selectedSubject.start_time,
            end_time: newEndTime,
            day: selectedSubject.day,
            id: selectedSubject.id,
        })
    };

    const instructors = useScheduleStore(state => state.instructors);
    const rooms = useScheduleStore(state => state.rooms);

    const roomConflict = useScheduleStore(state => state.roomConflict);
    const instructorConflict = useScheduleStore(state => state.instructorConflict);

    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async () => {
        clearErrors();

        let errors = {};

        if (selectedSubject.faculty_id == '') {
            errors.faculty_id = "Required"
            setError('faculty_id', true)
        };
        if (selectedSubject.room_id == '') {
            errors.room_id = "Required"
            setError('room_id', true)
        };

        if (Object.keys(errors).length > 0) {
            return;
        }

        if (mainScheduleConflictList.length > 0 || secondScheduleConflictList.length > 0 || roomConflict || instructorConflict) return toast.error("There's a conflict, please recolve!");

        setSubmitting(true);
        
        await router.post(route("gened-coordinator.update.class"), selectedSubject, {
            onSuccess: () => {
                toast.success("Class updated successfully.");
                refetch();
                setMainScheduleConflictList([]);
                setSecondScheduleConflictList([]);
                clearSelectedSubject();
            },
            preserveScroll: true,
            onFinish: () => {
                setSubmitting(false);
            }
        });

    };

    return (
        <Card className={`${(mainScheduleConflictList.length > 0 || secondScheduleConflictList.length > 0 || roomConflict || instructorConflict) ? ' border-red-600 ' : 'border-green-500'}`}>
            <CardHeader>
                <CardTitle className="text-2xl">{selectedSubject.subject_code} - {selectedSubject.descriptive_title} <span className='text-lg italic'></span></CardTitle>
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
                                    </div>
                                    <Megaphone className='self-center text-transparent' />
                                </div>
                                <div className='flex gap-2'>
                                    {(dayType === "Single" && selectedSubject.day != "TBA") && (
                                        <Select
                                            value={selectedSubject.day}
                                            onValueChange={(value) => {
                                                setSelectedSubjectField("day", value)
                                                collectConflictSchedules({
                                                    start_time: selectedSubject.start_time,
                                                    end_time: selectedSubject.end_time,
                                                    day: value,
                                                    id: selectedSubject.id,
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
                                    {selectedSubject.day == "TBA" &&
                                        <Select disabled={true} readOnly={true} value={selectedSubject.day}>
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
                                                        if (selectedSubject.day == 'TBA') {
                                                            setSelectedSubjectField('day', 'Monday')
                                                            collectConflictSchedules({
                                                                start_time: selectedSubject.start_time,
                                                                end_time: selectedSubject.end_time,
                                                                day: 'Monday',
                                                                id: selectedSubject.id,
                                                            })
                                                        } else {
                                                            setSelectedSubjectField('day', 'TBA')
                                                            setMainScheduleConflictList([])
                                                            setSecondScheduleConflictList([])
                                                        }
                                                        setDayType('Single')
                                                    }}
                                                    className={`self-center ${selectedSubject.day == 'TBA' && 'text-green-500'} cursor-pointer`} />
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
                                        const [hourValue, mins] = selectedSubject.start_time.split(":");
                                        return (
                                            <Popover>
                                                <PopoverTrigger
                                                    disabled={selectedSubject.start_time == 'TBA'}
                                                    className="w-full">
                                                    <Input
                                                        disabled={selectedSubject.start_time == 'TBA'}
                                                        label="Start Time"
                                                        type={selectedSubject.start_time == 'TBA' ? 'text' : 'time'}
                                                        readOnly={true}
                                                        value={selectedSubject.start_time}
                                                        onChange={(e) => setSelectedSubjectField("start_time", e.target.value)}
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
                                                        onValueChange={(value) => meridiemChange(value)}>
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
                                        disabled={selectedSubject.start_time == 'TBA'}
                                        value={classHour}
                                        onValueChange={(value) => classHourChange(value)}>
                                        <SelectTrigger className='w-full'>
                                            <Input
                                                disabled={selectedSubject.start_time == 'TBA'}
                                                label="End Time"
                                                type={selectedSubject.start_time == 'TBA' ? 'text' : 'time'}
                                                readOnly={true}
                                                value={selectedSubject.end_time}
                                                onChange={(e) => setSelectedSubjectField("end_time", e.target.value)}
                                                error={errors.end_time}
                                                className="border-none px-0 cursor-pointer"
                                            />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1">
                                                1hr
                                            </SelectItem>
                                            <SelectItem value="2">
                                                2hrs
                                            </SelectItem>
                                            <SelectItem value="3">
                                                3hrs
                                            </SelectItem>
                                            <SelectItem value="4">
                                                4hrs
                                            </SelectItem>
                                            <SelectItem value="5">
                                                5hrs
                                            </SelectItem>
                                            <SelectItem value="6">
                                                6hrs
                                            </SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Megaphone
                                                onClick={() => {
                                                    if (selectedSubject.start_time == 'TBA') {
                                                        setSelectedSubjectField('start_time', '07:30')
                                                        setSelectedSubjectField('end_time', `${String(7 + Number(classHour)).padStart(2, '0')}:30`);
                                                        collectConflictSchedules({
                                                            start_time: '07:30',
                                                            end_time: `${7 + Number(classHour)}:30`,
                                                            day: selectedSubject.day,
                                                            id: selectedSubject.id,
                                                        })
                                                    } else {
                                                        setSelectedSubjectField('start_time', 'TBA')
                                                        setSelectedSubjectField('end_time', 'TBA')
                                                        setMainScheduleConflictList([])
                                                        setSecondScheduleConflictList([])
                                                    }
                                                }}
                                                className={`self-center ${selectedSubject.start_time == 'TBA' && 'text-green-500'}  cursor-pointer`} />
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
                                    disabled={selectedSubject.room_id == null}
                                    value={selectedSubject.room_id}
                                    onValueChange={(value) => {
                                        setSelectedSubjectField('room_id', value)
                                        clearErrors('room_id')
                                    }}>
                                    <SelectTrigger className={`${errors.room_id && 'border-red-500'}`}>
                                        <SelectValue placeholder="Select room..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {rooms && rooms.length > 0 ? (
                                            rooms.map(room => (
                                                <SelectItem key={room.id} value={room.id}>
                                                    {room.room_name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem disabled>No rooms are available</SelectItem>
                                        )}
                                        {selectedSubject.room_id == null &&
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
                                                    if (selectedSubject.room_id == null) {
                                                        setSelectedSubjectField('room_id', '')
                                                    } else {
                                                        setSelectedSubjectField('room_id', null)
                                                        clearErrors('room_id')
                                                    }
                                                }}
                                                className={`self-center ${selectedSubject.room_id == null && 'text-green-500'}  cursor-pointer`} />
                                        </TooltipTrigger>
                                        <TooltipContent className="">
                                            <p> To Be Announce (TBA)</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                            </div>

                            <Label>Instructor</Label>
                            <div className='flex gap-2'>
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger disabled={selectedSubject.faculty_id == null} asChild>
                                        <Input
                                            placeholder="Select instructor..."
                                            readOnly
                                            value={instructors === undefined ? "Loading..." :
                                                selectedSubject.faculty_id
                                                    ? formatFullName(instructors.find((instructor) => instructor.id === selectedSubject.faculty_id) || {})
                                                    : selectedSubject.faculty_id == null ? "TBA" : "Select instructor..."}
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
                                                                    setSelectedSubjectField('faculty_id', instructor.id);
                                                                    clearErrors('faculty_id')
                                                                    setOpen(false);
                                                                }}
                                                            >
                                                                {formatFullName(instructor)}
                                                                <Check
                                                                    className={cn(
                                                                        "ml-auto",
                                                                        selectedSubject.faculty_id === instructor.id ? "opacity-100" : "opacity-0"
                                                                    )}
                                                                />
                                                            </CommandItem>
                                                        ))}
                                                    {selectedSubject.faculty_id == null &&
                                                        <CommandItem value={null} onSelect={() => setSelectedSubjectField('faculty_id', null)}>
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
                                                    if (selectedSubject.faculty_id == null) {
                                                        setSelectedSubjectField('faculty_id', '')
                                                    } else {
                                                        setSelectedSubjectField('faculty_id', null)
                                                        clearErrors('faculty_id')
                                                    }
                                                }}
                                                className={`self-center ${selectedSubject.faculty_id == null && 'text-green-500'}  cursor-pointer`}
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
                        clearSelectedSubject()
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
                    disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit"}
                </Button>
            </CardContent>
        </Card>
    )
}