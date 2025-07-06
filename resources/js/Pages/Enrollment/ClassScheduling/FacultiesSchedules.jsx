import React, { useEffect, useState } from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PreLoader from '@/Components/preloader/PreLoader';
import { Head } from '@inertiajs/react';
import { expandAlternatingDays, expandConsecutiveDays, formatFullName, identifyDayType } from '@/Lib/Utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Button } from '@/Components/ui/button';
import { FileDown, ImageDown, Loader2 } from 'lucide-react';
import { Switch } from '@/Components/ui/switch';
import { Label } from '@/Components/ui/label';
import TimeTable from '@/Pages/ScheduleFormats/TimeTable';
import TabularSchedule from '@/Pages/ScheduleFormats/TabularSchedule';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Input } from '@/Components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/Components/ui/command';
import html2canvas from "html2canvas";

export default function FacultySchedules({ schoolYearId, departmentId }) {
    const [faculties, setFaculties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [colorful, setColorful] = useState(true);
    const [selectedFaculty, setSelectedFaculty] = useState("All");
    const [scheduleType, setScheduleType] = useState('timetable');
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const [openFacultyPopover, setOpenFacultyPopover] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });

    const getEnrollmentFacultiesSchedules = async () => {
        axios.post(route("enrollment.get.faculties-schedules", { schoolYearId, departmentId }))
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
                                    const selectedFacultyObj = faculties.find(faculty => faculty.id === selectedFaculty);
                                    return (
                                        <Input
                                            placeholder=""
                                            readOnly
                                            value={selectedFacultyObj
                                                ? `${formatFullName(selectedFacultyObj)} (${selectedFacultyObj.schedLength})`
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
                                            {faculties.map(faculty => (
                                                <CommandItem
                                                    key={`faculty-${faculty.id}`}
                                                    value={faculty.id}
                                                    onSelect={() => {
                                                        setSelectedFaculty(faculty.id);
                                                        setOpenFacultyPopover(false);
                                                    }}
                                                >
                                                    {formatFullName(faculty)} ({faculty.schedLength})
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        <Button className="bg-green-600 hover:bg-green-500" variant="">
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
                        .filter((faculty) => faculty.id == selectedFaculty || selectedFaculty == "All")
                        .map((faculty) => (
                            <Card id={faculty.id} className="w-full" key={faculty.id}>
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
