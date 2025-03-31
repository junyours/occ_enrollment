import React, { useEffect, useState } from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PreLoader from '@/Components/preloader/PreLoader';
import { Head } from '@inertiajs/react';
import { expandAlternatingDays, expandConsecutiveDays, formatFullName, identifyDayType } from '@/Lib/Utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Select, SelectTrigger } from '@/Components/ui/select';
import { SelectContent, SelectItem, SelectValue } from '@/Components/ui/select';
import { Button } from '@/Components/ui/button';
import { FileDown, ImageDown } from 'lucide-react';
import { Switch } from '@/Components/ui/switch';
import { Label } from '@/Components/ui/label';
import TimeTable from '@/Pages/ScheduleFormats/TimeTable';
import TabularSchedule from '@/Pages/ScheduleFormats/TabularSchedule';

export default function FacultySchedules() {
    const [faculties, setFaculties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [colorful, setColorful] = useState(true);
    const [selectedFaculty, setSelectedFaculty] = useState("All");
    const [scheduleType, setScheduleType] = useState('timetable');

    const getEnrollmentFacultiesSchedules = async () => {
        axios.post("api/get-enrollment-faculties-schedules")
            .then(response => {
                const sortedFaculties = response.data.map(faculty => {
                    let schedLength = 0;

                    const sortedSchedules = faculty.schedules.sort((a, b) => {
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
                        ...faculty,
                        schedules: sortedSchedules,
                        schedLength // Store the total computed length
                    };
                });

                // Update state
                setFaculties(sortedFaculties);
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
        getEnrollmentFacultiesSchedules();
    }, []);

    if (loading) return <PreLoader title="Faculty schedules" />;
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

                        <Select value={selectedFaculty} onValueChange={(value) => setSelectedFaculty(value)}>
                            <SelectTrigger className="w-40 truncate overflow-hidden">
                                <SelectValue placeholder="Select a faculty" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem defaultValue value="All">All</SelectItem>
                                {faculties.map(faculty => (
                                    <SelectItem key={`faculty-${faculty.id}`} value={faculty.id}>
                                        {formatFullName(faculty)} ({faculty.schedLength})
                                    </SelectItem >
                                ))}
                            </SelectContent>
                        </Select>
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

            {faculties.length > 0 ? (
                <div className="space-y-4">
                    {faculties
                        .filter((faculty) => faculty.id == selectedFaculty || selectedFaculty == "All")
                        .map((faculty) => (
                            <Card className="w-full" key={faculty.id}>
                                <CardHeader>
                                    <CardTitle className="text-4xl">{formatFullName(faculty)} <span className="italic font-thin">({faculty.schedLength})</span></CardTitle>
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

FacultySchedules.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
