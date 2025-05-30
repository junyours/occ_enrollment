import React, { useEffect, useState } from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PreLoader from '@/Components/preloader/PreLoader';
import { cn, expandAlternatingDays, expandConsecutiveDays, identifyDayType } from '@/Lib/Utils';
import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Button } from '@/Components/ui/button';
import { Check, FileDown, ImageDown } from 'lucide-react';
import { Switch } from '@/Components/ui/switch';
import { Label } from '@/Components/ui/label';
import TimeTable from '@/Pages/ScheduleFormats/TimeTable';
import TabularSchedule from '@/Pages/ScheduleFormats/TabularSchedule';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Input } from '@/Components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/Components/ui/command';

export default function SubjectsSchedules() {
    const [subjects, setSubjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [colorful, setColorful] = useState(true);
    const [selectedSubject, setSelectedSubject] = useState("All");
    const [scheduleType, setScheduleType] = useState('timetable');
    const [openSubjectPopover, setOpenSubjectPopover] = useState(false);

    const getEnrollmentSubjectsSchedules = async () => {
        axios.post("api/get-enrollment-subjects-schedules")
            .then(response => {
                const sortedSubjects = response.data.map(subject => {
                    let schedLength = 0;

                    const sortedSchedules = subject.schedules.sort((a, b) => {
                        const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

                        // Sort by day
                        const dayComparison = daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
                        if (dayComparison !== 0) return dayComparison;

                        // Sort by descriptive title
                        const titleComparison = a.descriptive_title.localeCompare(b.descriptive_title);
                        if (titleComparison !== 0) return titleComparison;

                        // Sort by start time
                        return a.start_time.localeCompare(b.start_time);
                    });

                    sortedSchedules.forEach(sched => {
                        let initialSchedlength = 0; // Initialize counter

                        const day = sched.day ? sched.day.trim() : "TBA"; // Ensure valid day value
                        const dayType = identifyDayType(day);

                        // Handle primary schedule
                        if (day !== "TBA") {
                            initialSchedlength = initialSchedlength + countDays(dayType, day)
                        } else {
                            initialSchedlength++; // Count TBA schedules
                        }

                        // Handle secondary schedule if it exists
                        if (sched.secondary_schedule) {
                            const secDay = sched.secondary_schedule.day ? sched.secondary_schedule.day.trim() : "TBA";
                            const secDayType = identifyDayType(secDay);

                            if (secDay !== "TBA") {
                                initialSchedlength = initialSchedlength + countDays(secDayType, secDay)
                            } else {
                                initialSchedlength++;
                            }
                        }

                        schedLength += initialSchedlength; // Add computed value to total schedLength
                    });

                    return {
                        ...subject,
                        schedules: sortedSchedules,
                        schedLength // Store the total computed length
                    };
                });

                setSubjects(sortedSubjects);
            })
            .finally(() => {
                setLoading(false);
            })
    }

    const countDays = (dayType, day) => {
        switch (dayType) {
            case "Single":
                return 1;
            case "Consecutive":
                return expandConsecutiveDays(day).length;
            case "Alternating":
                return expandAlternatingDays(day).length;
            default:
                break;
        }
    }

    useEffect(() => {
        getEnrollmentSubjectsSchedules();
    }, []);

    if (loading) return <PreLoader title="Subject schedules" />;
    return (
        <div className='space-y-4'>
            <Head title="Subject schedules" />
            <Card>
                <CardContent className="p-2">
                    <div className="flex gap-2 w-min">
                        <Tabs className="w-max" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                            <TabsList className="grid max-w-max grid-cols-2">
                                <TabsTrigger className="w-28" value="tabular">Tabular</TabsTrigger>
                                <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <Popover open={openSubjectPopover} onOpenChange={setOpenSubjectPopover}>
                            <PopoverTrigger asChild>
                                {(() => {
                                    const selectedSubjectObj = subjects.find(subject => subject.id === selectedSubject);
                                    return (
                                        <Input
                                            placeholder=""
                                            readOnly
                                            value={selectedSubjectObj
                                                ? `${selectedSubjectObj.descriptive_title} (${selectedSubjectObj.schedLength})`
                                                : "All"}
                                            className="cursor-pointer text-start border w-60 truncate overflow-hidden"
                                        />
                                    );
                                })()}
                            </PopoverTrigger>

                            <PopoverContent className="w-60 p-0">
                                <Command>
                                    <CommandInput placeholder="Search subject..." className="h-9 border-0 outline-none p-0" />
                                    <CommandList>
                                        <CommandEmpty>No subject found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                key="all-subjects"
                                                value="All"
                                                onSelect={() => {
                                                    setSelectedSubject("All");
                                                    setOpenSubjectPopover(false);
                                                }}
                                            >
                                                All
                                            </CommandItem>
                                            {subjects.map(subject => (
                                                <CommandItem
                                                    key={`subject-${subject.id}`}
                                                    value={subject.id}
                                                    onSelect={() => {
                                                        setSelectedSubject(subject.id);
                                                        setOpenSubjectPopover(false);
                                                    }}
                                                >
                                                    {subject.descriptive_title} ({subject.schedLength})

                                                    <Check
                                                        className={cn(
                                                            "ml-auto",
                                                            selectedSubject == subject.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        {/* <Button className="bg-green-600 hover:bg-green-500" variant="">
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
                        </div> */}
                    </div>
                </CardContent>
            </Card>

            {subjects.length > 0 ? (
                <div className="space-y-4">
                    {subjects
                        .filter((subject) => subject.id == selectedSubject || selectedSubject == "All")
                        .map((subject) => (
                            <Card className="w-full" key={subject.id}>
                                <CardHeader>
                                    <CardTitle className="text-4xl">{subject.descriptive_title} <span className="italic font-thin">({subject.schedLength})</span></CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {scheduleType == "timetable" ? (
                                        <TimeTable data={subject.schedules} colorful={colorful} />
                                    ) : (
                                        <TabularSchedule data={subject.schedules} type="subject" />
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                </div>
            ) : (
                <p className="text-center text-gray-500">No room schedules available.</p>
            )}
        </div>
    )
}


SubjectsSchedules.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
