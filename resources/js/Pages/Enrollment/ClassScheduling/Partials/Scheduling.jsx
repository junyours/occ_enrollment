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
import { RadioGroup, RadioGroupItem } from '@/Components/ui/radio-group';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@/Components/ui/command"
import { cn } from '@/Lib/Utils';

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

function Scheduling({
    dayType,
    meridiem,
    bottomRef,
    mainScheduleConflictList,
    secondScheduleConflictList,
    data,
    editingSecondSchedule,
    errors,
    classHour,
    rooms,
    instructors,
    handleSubmit,
    processing,
    dayOnchange,
    changeDayType,
    startTimeChange,
    classHourChange,
    setData,
    clearErrors,
    setMainScheduleConflictList,
    setSecondScheduleConflictList,
    cancelEditing,
    setDayType,
    collectConflictSchedules,
    roomConflict,
    instructorConflict,
}) {
    const [open, setOpen] = useState(false)

    return (
        <Card ref={bottomRef} className={`${(mainScheduleConflictList.length > 0 || secondScheduleConflictList.length > 0 || roomConflict || instructorConflict) ? ' border-red-600 ' : 'border-green-500'}`}>
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
                                        {rooms && rooms.length > 0 ? (
                                            rooms.map(room => (
                                                <SelectItem key={room.id} value={room.id}>
                                                    {room.room_name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem disabled>No rooms are assigned to your department</SelectItem>
                                        )}
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
    )
}

export default Scheduling
