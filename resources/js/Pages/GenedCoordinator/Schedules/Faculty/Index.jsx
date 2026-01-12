import React, { useEffect, useState } from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PreLoader from '@/Components/preloader/PreLoader';
import { Head } from '@inertiajs/react';
import { expandAlternatingDays, expandConsecutiveDays, formatFullName, identifyDayType } from '@/Lib/Utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Switch } from '@/Components/ui/switch';
import { Label } from '@/Components/ui/label';
import TimeTable from '@/Pages/ScheduleFormats/TimeTable';
import TabularSchedule from '@/Pages/ScheduleFormats/TabularSchedule';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Input } from '@/Components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/Components/ui/command';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import { useQuery } from '@tanstack/react-query';
import TimeTableSkeleton from '../TimTableSckeleton';

export default function Index() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const [colorful, setColorful] = useState(true);
    const [selectedFaculty, setSelectedFaculty] = useState("All");
    const [scheduleType, setScheduleType] = useState('timetable');
    const [openFacultyPopover, setOpenFacultyPopover] = useState(false);

    const getFacultiesSchedules = async () => {
        const response = await axios.post(route("gened-coordinator.faculties-schedules"), { schoolYearId: selectedSchoolYearEntry.id });

        const sortedFaculties = response.data.map(faculty => {
            let schedLength = 0;
            const sortedSchedules = faculty.schedules.sort((a, b) => {
                const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                const dayComparison = daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
                if (dayComparison !== 0) return dayComparison;
                const titleComparison = a.descriptive_title.localeCompare(b.descriptive_title);
                if (titleComparison !== 0) return titleComparison;
                return a.start_time.localeCompare(b.start_time);
            });

            sortedSchedules.forEach(sched => {
                let initialSchedlength = 0;
                const day = sched.day ? sched.day.trim() : "TBA";
                const dayType = identifyDayType(day);

                if (day !== "TBA") {
                    initialSchedlength += countDays(dayType, day);
                } else {
                    initialSchedlength++;
                }

                if (sched.secondary_schedule) {
                    const secDay = sched.secondary_schedule.day ? sched.secondary_schedule.day.trim() : "TBA";
                    const secDayType = identifyDayType(secDay);
                    if (secDay !== "TBA") {
                        initialSchedlength += countDays(secDayType, secDay);
                    } else {
                        initialSchedlength++;
                    }
                }

                schedLength += initialSchedlength;
            });

            return {
                ...faculty,
                schedules: sortedSchedules,
                schedLength
            };
        });

        return sortedFaculties; // make sure this is returned from the async function
    };


    const { data, error, isLoading, refetch } = useQuery({
        queryKey: ['gened-coordinator.faculties-schedules'],
        queryFn: getFacultiesSchedules,
        staleTime: 60 * 60 * 1000,
    });


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

    if (isLoading) return <TimeTableSkeleton />
    
    return (
        <div className='space-y-4'>
            <Head title="Faculty schedules" />
            <Card>
                <CardContent className="p-2">
                    <div className="flex gap-2 w-min">
                        <Tabs className="w-max" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                            <TabsList className="grid max-w-max grid-cols-2">
                                <TabsTrigger className="w-28" value="tabular">Tabular</TabsTrigger>
                                <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <Popover open={openFacultyPopover} onOpenChange={setOpenFacultyPopover}>
                            <PopoverTrigger asChild>
                                {(() => {
                                    const selectedFacultyObj = data.find(faculty => faculty.id === selectedFaculty);
                                    return (
                                        <Input
                                            placeholder=""
                                            readOnly
                                            value={selectedFacultyObj
                                                ? `${formatFullName(selectedFacultyObj)} | ${selectedFacultyObj.schedules.reduce((acc, sched) => { return acc + sched.lecture_hours + sched.laboratory_hours; }, 0)} hr`
                                                : "All"}
                                            className="cursor-pointer text-start border w-60 truncate overflow-hidden"
                                        />
                                    );
                                })()}
                            </PopoverTrigger>
                            <PopoverContent className="w-60 p-0">
                                <Command>
                                    <CommandInput placeholder="Search faculty..." className="h-9 border-0 outline-none p-0" />
                                    <CommandList>
                                        <CommandEmpty>No faculty found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                key="all-faculties"
                                                value="All"
                                                onSelect={() => {
                                                    setSelectedFaculty("All");
                                                    setOpenFacultyPopover(false);
                                                }}
                                            >
                                                All
                                            </CommandItem>
                                            {data.map(faculty => (
                                                <CommandItem
                                                    key={`faculty-${faculty.id}`}
                                                    value={faculty.id}
                                                    onSelect={() => {
                                                        setSelectedFaculty(faculty.id);
                                                        setOpenFacultyPopover(false);
                                                    }}
                                                >
                                                    {formatFullName(faculty)} | {faculty.schedules.reduce((acc, sched) => { return acc + sched.lecture_hours + sched.laboratory_hours; }, 0)} hr
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

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

            {isLoading && (
                <TimeTableSkeleton />
            )}

            {data.length > 0 ? (
                <div className="space-y-4">
                    {data
                        .filter((faculty) => faculty.id == selectedFaculty || selectedFaculty == "All")
                        .map((faculty) => (
                            <Card id={faculty.id} className="w-full" key={faculty.id}>
                                <CardHeader>
                                    <CardTitle className="text-4xl">{formatFullName(faculty)} | {faculty.schedules.reduce((acc, sched) => { return acc + sched.lecture_hours + sched.laboratory_hours; }, 0)} hr</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {scheduleType == "timetable" ? (
                                        <TimeTable data={faculty.schedules} colorful={colorful} />
                                    ) : (
                                        <TabularSchedule data={faculty.schedules} type="faculty" />
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

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
