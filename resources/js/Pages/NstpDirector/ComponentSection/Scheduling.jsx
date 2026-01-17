import React, { useState } from 'react'
import { useSection } from './useSection';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Label } from '@/Components/ui/label';
import { Check, Megaphone } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/Components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Input } from '@/Components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/Components/ui/toggle-group';
import { cn, formatFullName } from '@/Lib/Utils';
import { detectTwoScheduleConflict } from '@/Lib/ConflictUtilities';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/Components/ui/command"
import { router } from '@inertiajs/react';
import { toast } from 'sonner';

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

function Scheduling({ refetch }) {
    const [open, setOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false);

    const sections = useSection(state => state.sections);
    const selectedSection = useSection(state => state.selectedSection);
    const clearSelectedSection = useSection(state => state.clearSelectedSection);

    const setSelectedSection = useSection(state => state.setSelectedSection);
    const setSelectedSectionField = useSection(state => state.setSelectedSectionField);
    const editingSection = useSection(state => state.editingSection);

    const secondScheduleConflictList = useSection(state => state.secondScheduleConflictList);
    const mainScheduleConflictList = useSection(state => state.mainScheduleConflictList);
    const setSecondScheduleConflictList = useSection(state => state.setSecondScheduleConflictList);
    const setMainScheduleConflictList = useSection(state => state.setMainScheduleConflictList);

    const roomConflict = useSection(state => state.roomConflict);
    const setRoomConflict = useSection(state => state.setRoomConflict);
    const instructorConflict = useSection(state => state.instructorConflict);
    const setInstructorConflict = useSection(state => state.setInstructorConflict);

    const errors = useSection(state => state.errors);
    const setError = useSection(state => state.setError);
    const clearErrors = useSection(state => state.clearErrors);

    const dayType = useSection(state => state.dayType);
    const setMeridiem = useSection(state => state.setMeridiem);
    const meridiem = useSection(state => state.meridiem);

    const classHour = useSection(state => state.classHour);
    const setClassHour = useSection(state => state.setClassHour);

    const rooms = useSection(state => state.rooms);
    const instructors = useSection(state => state.instructors);

    const loadingRoomSchedules = useSection(state => state.loadingRoomSchedules);
    const loadingInstructorSchedules = useSection(state => state.loadingInstructorSchedules);


    const collectConflictSchedules = (editingSchedule) => {

        if (editingSchedule.day == 'TBA' || editingSchedule.start_time == 'TBA') return

        const mainSchedConflicts = [];
        const secondSchedConflicts = [];

        sections.forEach((cls) => {

            const secSched = {
                id: cls.id,
                start_time: cls.schedule.start_time,
                end_time: cls.schedule.end_time,
                day: cls.schedule.day
            }

            if (detectTwoScheduleConflict(editingSchedule, secSched) && secSched.id != editingSchedule.id) {
                mainSchedConflicts.push(cls.id);
            }
        });

        setMainScheduleConflictList(mainSchedConflicts)
        setSecondScheduleConflictList(secondSchedConflicts)
    };

    const meridiemChange = (value) => {

        if (!value) return;

        const [, min] = selectedSection.start_time.split(':');

        let start;
        let end;

        switch (value) {
            case 'AM':
                setSelectedSectionField('start_time', `07:${min}`);
                setSelectedSectionField('end_time', `${String(Number(7) + Number(classHour)).padStart(2, '0')}:${min}`);
                start = `07:${min}`
                end = `${String(Number(7) + Number(classHour)).padStart(2, '0')}:${min}`
                break;
            default:
                setSelectedSectionField('start_time', `12:${min}`);
                setSelectedSectionField('end_time', `${String(Number(12) + Number(classHour)).padStart(2, '0')}:${min}`);
                start = `12:${min}`
                end = `${String(Number(12) + Number(classHour)).padStart(2, '0')}:${min}`
                break;
        };

        setMeridiem(value);

        const editingSchedule = {
            start_time: start,
            end_time: end,
            day: selectedSection.day,
            id: selectedSection.id,
        };

        collectConflictSchedules(editingSchedule);
    }

    const startTimeChange = (value, type) => {
        if (!value) return
        const [sHour, sMin] = selectedSection.start_time.split(':');
        const [eHour, eMin] = selectedSection.end_time.split(':');
        let startTime
        let endTime

        switch (type) {
            case 'hour':
                setSelectedSectionField('start_time', `${value}:${sMin}`);
                setSelectedSectionField('end_time', `${String(Number(value) + Number(classHour)).padStart(2, '0')}:${eMin}`);
                startTime = `${value}:${sMin}`
                endTime = `${String(Number(value) + Number(classHour)).padStart(2, '0')}:${eMin}`
                break;
            case 'min':
                setSelectedSectionField('start_time', `${sHour}:${value}`);
                setSelectedSectionField('end_time', `${eHour}:${value}`);
                startTime = `${sHour}:${value}`
                endTime = `${eHour}:${value}`
                break;
        }

        const editingSchedule = {
            start_time: startTime,
            end_time: endTime,
            day: selectedSection.day,
            id: selectedSection.id,
        }

        collectConflictSchedules(editingSchedule)
    };

    const classHourChange = (value) => {
        setClassHour(value);

        const [hour, min] = selectedSection.start_time.split(':');
        const newHour = Number(hour) + Number(value);
        const newEndTime = `${String(newHour).padStart(2, '0')}:${min}`

        setSelectedSectionField('end_time', newEndTime);

        collectConflictSchedules({
            start_time: selectedSection.start_time,
            end_time: newEndTime,
            day: selectedSection.day,
            id: selectedSection.id,
        })
    };

    const handleSubmit = async () => {
        clearErrors();

        let errors = {};

        if (selectedSection.faculty_id == '') {
            errors.faculty_id = "Required"
            setError('faculty_id', true)
        };
        if (selectedSection.room_id == '') {
            errors.room_id = "Required"
            setError('room_id', true)
        };

        if (Object.keys(errors).length > 0) {
            return;
        }

        collectConflictSchedules(selectedSection)

        if (mainScheduleConflictList.length > 0 || secondScheduleConflictList.length > 0 || roomConflict || instructorConflict) return toast.error("There's a conflict, please recolve!");

        setSubmitting(true);

        await router.post(route("gened-coordinator.update.class"), selectedSection, {
            onSuccess: () => {
                toast.success("Class updated successfully.");
                refetch();
                setMainScheduleConflictList([]);
                setSecondScheduleConflictList([]);
                clearSelectedSection();
            },
            preserveScroll: true,
            onFinish: () => {
                setSubmitting(false);
            }
        });

    };

    if (!editingSection) return <></>

    return (
        <div>
            <Card className={`${(mainScheduleConflictList.length > 0 || secondScheduleConflictList.length > 0 || roomConflict || instructorConflict) ? ' border-red-600 ' : 'border-green-500'}`}>
                <CardHeader>
                    <CardTitle className="text-2xl">Section {selectedSection.section}</CardTitle>
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
                                        {(selectedSection.day != "TBA") && (
                                            <Select
                                                value={selectedSection.day}
                                                onValueChange={(value) => {
                                                    setSelectedSectionField("day", value)
                                                    collectConflictSchedules({
                                                        start_time: selectedSection.start_time,
                                                        end_time: selectedSection.end_time,
                                                        day: value,
                                                        id: selectedSection.id,
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

                                        {selectedSection.day == "TBA" &&
                                            <Select disabled={true} readOnly={true} value={selectedSection.day}>
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
                                                            if (selectedSection.day == 'TBA') {
                                                                setSelectedSectionField('day', 'Monday')
                                                                collectConflictSchedules({
                                                                    start_time: selectedSection.start_time,
                                                                    end_time: selectedSection.end_time,
                                                                    day: 'Monday',
                                                                    id: selectedSection.id,
                                                                })
                                                            } else {
                                                                setSelectedSectionField('day', 'TBA')
                                                                setMainScheduleConflictList([])
                                                                setSecondScheduleConflictList([])
                                                            }
                                                        }}
                                                        className={`self-center ${selectedSection.day == 'TBA' && 'text-green-500'} cursor-pointer`} />
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
                                            const [hourValue, mins] = selectedSection.start_time.split(":");
                                            return (
                                                <Popover>
                                                    <PopoverTrigger
                                                        disabled={selectedSection.start_time == 'TBA'}
                                                        className="w-full">
                                                        <Input
                                                            disabled={selectedSection.start_time == 'TBA'}
                                                            label="Start Time"
                                                            type={selectedSection.start_time == 'TBA' ? 'text' : 'time'}
                                                            readOnly={true}
                                                            value={selectedSection.start_time}
                                                            onChange={(e) => setSelectedSectionField("start_time", e.target.value)}
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
                                            disabled={selectedSection.start_time == 'TBA'}
                                            value={classHour}
                                            onValueChange={(value) => classHourChange(value)}>
                                            <SelectTrigger className='w-full'>
                                                <Input
                                                    disabled={selectedSection.start_time == 'TBA'}
                                                    label="End Time"
                                                    type={selectedSection.start_time == 'TBA' ? 'text' : 'time'}
                                                    readOnly={true}
                                                    value={selectedSection.end_time}
                                                    onChange={(e) => setSelectedSectionField("end_time", e.target.value)}
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
                                                        if (selectedSection.start_time == 'TBA') {
                                                            setSelectedSectionField('start_time', '07:30')
                                                            setSelectedSectionField('end_time', `${String(7 + Number(classHour)).padStart(2, '0')}:30`);
                                                            collectConflictSchedules({
                                                                start_time: '07:30',
                                                                end_time: `${7 + Number(classHour)}:30`,
                                                                day: selectedSection.day,
                                                                id: selectedSection.id,
                                                            })
                                                        } else {
                                                            setSelectedSectionField('start_time', 'TBA')
                                                            setSelectedSectionField('end_time', 'TBA')
                                                            setMainScheduleConflictList([])
                                                            setSecondScheduleConflictList([])
                                                        }
                                                    }}
                                                    className={`self-center ${selectedSection.start_time == 'TBA' && 'text-green-500'}  cursor-pointer`} />
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
                                        disabled={selectedSection.room_id == null}
                                        value={selectedSection.room_id}
                                        onValueChange={(value) => {
                                            setSelectedSectionField('room_id', value)
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
                                                <SelectItem disabled>No rooms are assigned to your department</SelectItem>
                                            )}
                                            {selectedSection.room_id == null &&
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
                                                        if (selectedSection.room_id == null) {
                                                            setSelectedSectionField('room_id', '')
                                                        } else {
                                                            setSelectedSectionField('room_id', null)
                                                            setError('room_id', false)
                                                            setRoomConflict(false)
                                                        }
                                                    }}
                                                    className={`self-center ${selectedSection.room_id == null && 'text-green-500'}  cursor-pointer`} />
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
                                        <PopoverTrigger disabled={selectedSection.faculty_id == null} asChild>
                                            <Input
                                                placeholder="Select instructor..."
                                                readOnly
                                                value={instructors === undefined ? "Loading..." :
                                                    selectedSection.faculty_id
                                                        ? formatFullName(instructors.find((instructor) => instructor.id === selectedSection.faculty_id) || {})
                                                        : selectedSection.faculty_id == null ? "TBA" : "Select instructor..."}
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
                                                                        setSelectedSectionField('faculty_id', instructor.id);
                                                                        clearErrors('faculty_id')
                                                                        setOpen(false);
                                                                    }}
                                                                >
                                                                    {formatFullName(instructor)}
                                                                    <Check
                                                                        className={cn(
                                                                            "ml-auto",
                                                                            selectedSection.faculty_id === instructor.id ? "opacity-100" : "opacity-0"
                                                                        )}
                                                                    />
                                                                </CommandItem>
                                                            ))}
                                                        {selectedSection.faculty_id == null &&
                                                            <CommandItem value={null} onSelect={() => setSelectedSectionField('faculty_id', null)}>
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
                                                        if (selectedSection.faculty_id == null) {
                                                            setSelectedSectionField('faculty_id', '')
                                                        } else {
                                                            setSelectedSectionField('faculty_id', null)
                                                            setError('faculty_id', false)
                                                            setInstructorConflict(false)
                                                        }
                                                    }}
                                                    className={`self-center ${selectedSection.faculty_id == null && 'text-green-500'}  cursor-pointer`}
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
                            clearSelectedSection()
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
                        disabled={submitting || loadingRoomSchedules || loadingInstructorSchedules}>
                        {submitting ? "Submitting..." : "Submit"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}

export default Scheduling 