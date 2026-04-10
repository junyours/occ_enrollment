import React, { useEffect, useState } from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PreLoader from '@/Components/preloader/PreLoader';
import { Head } from '@inertiajs/react';
import { convertToAMPM, expandAlternatingDays, expandConsecutiveDays, formatFullName, identifyDayType } from '@/Lib/Utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Button } from '@/Components/ui/button';
import { FileDown, ImageDown, Loader2, Check } from 'lucide-react';
import { Switch } from '@/Components/ui/switch';
import { Label } from '@/Components/ui/label';
import TimeTable from '@/Pages/ScheduleFormats/TimeTable';
import TabularSchedule from '@/Pages/ScheduleFormats/TabularSchedule';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Input } from '@/Components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/Components/ui/command';
import html2canvas from "html2canvas";
import * as XLSX from 'xlsx'
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

export default function FacultySchedules({ schoolYearId, departmentId }) {
    // const [isLoading, setIsLoading] = useState(false);

    const donwloadExcel = () => {
        if (!faculties || faculties.length === 0) return;

        // setIsLoading(true);

        setTimeout(() => {
            const excelData = faculties.flatMap(faculty =>
                faculty.schedules.flatMap(schedule => {
                    const baseRow = {
                        Name: formatName(faculty),
                        ClassCode: schedule.class_code,
                        Subject: schedule.descriptive_title,
                        Day: schedule.day,
                        StartTime: convertToAMPM(schedule.start_time),
                        EndTime: convertToAMPM(schedule.end_time),
                        Room: schedule.room_name,
                        StudentCount: schedule.student_count,
                    };

                    if (schedule.secondary_schedule) {
                        const second = schedule.secondary_schedule;
                        const secondRow = {
                            Name: formatName(faculty),
                            ClassCode: schedule.class_code,
                            Subject: `${schedule.descriptive_title} (2nd schedule)`,
                            Day: second.day,
                            StartTime: convertToAMPM(second.start_time),
                            EndTime: convertToAMPM(second.end_time),
                            Room: second.room_name,
                            StudentCount: schedule.student_count,
                        };
                        return [baseRow, secondRow];
                    }

                    return [baseRow];
                })
            );


            const ws = XLSX.utils.json_to_sheet(excelData);

            // widen columns
            ws['!cols'] = [
                { wch: 25 },
                { wch: 12 },
                { wch: 50 },
                { wch: 12 },
                { wch: 10 },
                { wch: 10 },
                { wch: 12 },
                { wch: 14 },
            ];

            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Faculty Schedules');
            XLSX.writeFile(wb, 'faculty_schedules.xlsx');

            // setIsLoading(false);
        }, 300);
    };

    const formatName = (faculty) => {
        const formatWord = (word) =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

        // Last name - fully uppercase (as requested before)
        const last = faculty.last_name
            ? faculty.last_name.toUpperCase()
            : '';

        // First name - handles multiple words like "RYAN JAY"
        const first = faculty.first_name
            ? faculty.first_name
                .split(' ')
                .map(formatWord)
                .join(' ')
            : '';

        // Middle initial
        const middle = faculty.middle_name
            ? faculty.middle_name.charAt(0).toUpperCase() + '.'
            : '';

        return `${last}, ${first} ${middle}`.trim();
    };

    const [loading, setLoading] = useState(true);
    const [colorful, setColorful] = useState(true);
    const [selectedFaculty, setSelectedFaculty] = useState("All");
    const [selectedFaculties, setSelectedFaculties] = useState([]);
    const [scheduleType, setScheduleType] = useState('timetable');
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const [openFacultyPopover, setOpenFacultyPopover] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

    const getEnrollmentFacultiesSchedules = async () => {
        const response = await axios.post(route("enrollment.get.faculties-schedules", { schoolYearId, departmentId }));

        const processedFaculties = response.data.map(faculty => {
            let schedLength = 0;
            let totalHours = 0; // 1. Initialize totalHours counter

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

                // 2. Accumulate the total hours for this schedule
                totalHours += (sched.lecture_hours || 0) + (sched.laboratory_hours || 0);
            });

            return {
                ...faculty,
                schedules: sortedSchedules,
                schedLength,
                totalHours // 3. Attach totalHours to the faculty object
            };
        });

        // 4. Sort the mapped array: First by whether they have classes, then by last name
        const sortedAndGroupedFaculties = processedFaculties.sort((a, b) => {
            const aHasClasses = a.totalHours > 0;
            const bHasClasses = b.totalHours > 0;

            // Grouping: If 'A' has classes and 'B' doesn't, 'A' comes first (and vice versa)
            if (aHasClasses && !bHasClasses) return -1;
            if (!aHasClasses && bHasClasses) return 1;

            // Alphabetical sort: If both are in the SAME group, sort by last name ascending
            const nameA = (a.last_name || "").toLowerCase();
            const nameB = (b.last_name || "").toLowerCase();

            return nameA.localeCompare(nameB);
        });

        // Update state with the perfectly formatted data
        return sortedAndGroupedFaculties

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

    const { data: faculties, isLoading, isError } = useQuery({
        queryKey: ['faculty-schedules', schoolYearId, departmentId],
        queryFn: getEnrollmentFacultiesSchedules,
        enabled: !!schoolYearId && !!departmentId,
    });


    // useEffect(() => {
    //     getEnrollmentFacultiesSchedules();
    // }, []);

    if (isLoading) return <PreLoader title="Faculty schedules" />;

    const downloadAllFacultyImagesWithProgress = async () => {
        setIsDownloadingAll(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 100));

            const filteredFaculties = faculties.filter((faculty) =>
                faculty.id == selectedFaculty || selectedFaculty == "All"
            );

            setDownloadProgress({ current: 0, total: filteredFaculties.length });

            for (let i = 0; i < filteredFaculties.length; i++) {
                const faculty = filteredFaculties[i];
                setDownloadProgress({ current: i + 1, total: filteredFaculties.length });

                const element = document.getElementById(faculty.id);

                if (element) {
                    const style = document.createElement("style");
                    document.head.appendChild(style);
                    style.sheet?.insertRule('body > div:last-child img { display: inline-block; }');
                    style.sheet?.insertRule('td div > svg { display: none !important; }');

                    try {
                        const canvas = await html2canvas(element, { scale: 3 });
                        const imageUrl = canvas.toDataURL("image/png");

                        const filename = `${formatFullName(faculty)} - Schedule.png`;
                        const link = document.createElement("a");
                        link.href = imageUrl;
                        link.download = filename;
                        link.click();

                        if (i < filteredFaculties.length - 1) {
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                    } finally {
                        style.remove();
                    }
                }
            }
        } catch (error) {
            console.error('Error downloading room images:', error);
        } finally {
            setIsDownloadingAll(false);
            setDownloadProgress({ current: 0, total: 0 });
        }
    };

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
                                    // Determine what text to show in the input box
                                    let displayText = "All";
                                    if (selectedFaculties.length > 0) {
                                        if (selectedFaculties.length === 1) {
                                            const selectedObj = faculties.find(f => f.id === selectedFaculties[0]);
                                            displayText = selectedObj ? formatFullName(selectedObj) : "1 selected";
                                        } else {
                                            displayText = `${selectedFaculties.length} faculties selected`;
                                        }
                                    }

                                    return (
                                        <Input
                                            placeholder=""
                                            readOnly
                                            value={displayText}
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
                                            {/* "All" Option */}
                                            <CommandItem
                                                key="all-faculties"
                                                value="All"
                                                onSelect={() => {
                                                    setSelectedFaculties([]); // Clear array to select "All"
                                                    // Optional: setOpenFacultyPopover(false); if you want it to close when clicking All
                                                }}
                                            >
                                                <Check
                                                    className={`mr-2 h-4 w-4 ${selectedFaculties.length === 0 ? "opacity-100" : "opacity-0"
                                                        }`}
                                                />
                                                All
                                            </CommandItem>

                                            {/* Individual Faculty Options */}
                                            {faculties.map((faculty) => {
                                                const isSelected = selectedFaculties.includes(faculty.id);
                                                return (
                                                    <CommandItem
                                                        key={`faculty-${faculty.id}`}
                                                        value={faculty.id.toString()} // Ensure this is a string for CommandItem
                                                        onSelect={() => {
                                                            // Toggle selection logic
                                                            setSelectedFaculties((prev) =>
                                                                prev.includes(faculty.id)
                                                                    ? prev.filter((id) => id !== faculty.id) // Remove if already selected
                                                                    : [...prev, faculty.id] // Add if not selected
                                                            );
                                                            // Notice: We removed setOpenFacultyPopover(false) so the user can select multiple
                                                        }}
                                                    >
                                                        <Check
                                                            className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"
                                                                }`}
                                                        />
                                                        {formatFullName(faculty)} | {faculty.schedules.reduce((acc, sched) => acc + sched.lecture_hours + sched.laboratory_hours, 0)} hr
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        <Button
                            // disabled={isLoading}
                            onClick={() => donwloadExcel()}
                            className="bg-green-600 hover:bg-green-500"
                            variant=""
                        >
                            <FileDown />
                            Excel
                        </Button>
                        <Button
                            className="bg-blue-700 hover:bg-blue-600"
                            variant=""
                            onClick={downloadAllFacultyImagesWithProgress}
                            disabled={isDownloadingAll}
                        >
                            {isDownloadingAll ? (
                                <>
                                    <Loader2 className="animate-spin w-4 h-4 mr-2" />
                                    {downloadProgress.current}/{downloadProgress.total}
                                </>
                            ) : (
                                <>
                                    <ImageDown />
                                    Image
                                </>
                            )}
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
                        // Updated filter logic: Show if array is empty ("All") OR if the faculty's ID is in the array
                        .filter((faculty) => selectedFaculties.length === 0 || selectedFaculties.includes(faculty.id))
                        .map((faculty) => (
                            <Card id={faculty.id} className="w-full" key={faculty.id}>
                                <CardHeader>
                                    <CardTitle className="text-4xl">
                                        {formatFullName(faculty)} | {faculty.schedules.reduce((acc, sched) => acc + sched.lecture_hours + sched.laboratory_hours, 0)} hr
                                    </CardTitle>
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
