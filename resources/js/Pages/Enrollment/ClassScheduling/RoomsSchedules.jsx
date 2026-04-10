import React, { useEffect, useState, useRef } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import axios from "axios";
import PreLoader from "@/Components/preloader/PreLoader";
import { Head } from "@inertiajs/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/Components/ui/tabs"
import TimeTable from "@/Pages/ScheduleFormats/TimeTable";
import { Switch } from "@/Components/ui/switch";
import { Label } from "@/Components/ui/label";
import { Check, FileDown, ImageDown, Loader2 } from "lucide-react";
import { cn, expandAlternatingDays, expandConsecutiveDays, identifyDayType } from "@/Lib/Utils";
import TabularSchedule from "@/Pages/ScheduleFormats/TabularSchedule";
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Input } from '@/Components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/Components/ui/command';
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
import { useQuery } from "@tanstack/react-query";

export default function RoomSchedules({ schoolYearId, departmentId }) {

    // Convert time to AM/PM
    const convertToAMPM = (time) => {
        const [hour, minute] = time.split(":").map(Number);
        const ampm = hour >= 12 ? "PM" : "AM";
        const h = hour % 12 === 0 ? 12 : hour % 12;
        return `${h}:${minute.toString().padStart(2, "0")} ${ampm}`;
    };

    // Format name properly: last, first middle-initial (handles multiple first names)
    const formatName = (faculty) => {
        const last = faculty.last_name
            ? faculty.last_name.charAt(0).toUpperCase() + faculty.last_name.slice(1).toLowerCase()
            : "";
        const first = faculty.first_name
            ? faculty.first_name
                .split(" ")
                .map((f) => f.charAt(0).toUpperCase() + f.slice(1).toLowerCase())
                .join(" ")
            : "";
        const middle = faculty.middle_name ? `${faculty.middle_name.charAt(0).toUpperCase()}.` : "";
        return `${last}, ${first} ${middle}`.trim();
    };

    const downloadExcel = () => {
        setLoading(true);

        const excelData = rooms.flatMap((room) =>
            room.schedules.map((sched) => ({
                Name: formatName(sched),
                ClassCode: sched.class_code,
                Subject: sched.descriptive_title,
                Day: sched.day,
                StartTime: convertToAMPM(sched.start_time),
                EndTime: convertToAMPM(sched.end_time),
                Room: room.room_name,
            }))
        );

        const ws = XLSX.utils.json_to_sheet(excelData, { header: ["Name", "ClassCode", "Subject", "Day", "StartTime", "EndTime", "Room"] });

        // Set column width for descriptive title
        const wscols = [
            { wch: 25 }, // Name
            { wch: 10 }, // ClassCode
            { wch: 50 }, // Subject
            { wch: 12 }, // Day
            { wch: 10 }, // StartTime
            { wch: 10 }, // EndTime
            { wch: 10 }, // Room
        ];
        ws["!cols"] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "RoomSchedules");
        XLSX.writeFile(wb, "RoomSchedules.xlsx");

        setLoading(false);
    };

    const [loading, setLoading] = useState(true);
    const [colorful, setColorful] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState("All");
    const [scheduleType, setScheduleType] = useState('timetable');
    const [openRoomPopover, setOpenRoomPopover] = useState(false);
    const [isDownloadingAll, setIsDownloadingAll] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 });
    const [selectedRooms, setSelectedRooms] = useState([]);

    const getEnrollmentRoomSchedules = async () => {
        const response = await axios.post(route('enrollment.get.enrollment.rooms.schedules', { schoolYearId, departmentId }));

        const processedRooms = response.data.map(room => {
            let schedLength = 0;

            const sortedSchedules = room.schedules.sort((a, b) => {
                const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
                const dayComparison = daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
                if (dayComparison !== 0) return dayComparison;
                const titleComparison = a.descriptive_title.localeCompare(b.descriptive_title);
                if (titleComparison !== 0) return titleComparison;
                return a.start_time.localeCompare(b.start_time);
            });

            sortedSchedules.forEach(sched => {
                const dayType = identifyDayType(sched.day);
                if (sched.day !== "TBA") {
                    schedLength = schedLength + countDays(dayType, sched.day);
                } else {
                    schedLength++;
                }
            });

            return {
                ...room,
                schedules: sortedSchedules,
                schedLength
            };
        });

        // Sort: Rooms with schedLength > 0 first, then alphabetically
        const sortedAndGroupedRooms = processedRooms.sort((a, b) => {
            const aHasClasses = a.schedLength > 0;
            const bHasClasses = b.schedLength > 0;

            // Grouping
            if (aHasClasses && !bHasClasses) return -1;
            if (!aHasClasses && bHasClasses) return 1;

            // Alphabetical sort (adjust 'room_name' to match your DB if needed)
            const nameA = (a.room_name || "").toLowerCase();
            const nameB = (b.room_name || "").toLowerCase();

            return nameA.localeCompare(nameB);
        });

        return sortedAndGroupedRooms;
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
        getEnrollmentRoomSchedules();
    }, []);

    const { data: rooms, isLoading } = useQuery({
        queryKey: ['room-schedules', schoolYearId, departmentId],
        queryFn: getEnrollmentRoomSchedules,
        enabled: !!schoolYearId && !!departmentId,
    });

    if (isLoading) return <PreLoader title="Room schedules" />;

    const downloadAllRoomImagesWithProgress = async () => {
        setIsDownloadingAll(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 100));

            const filteredRooms = rooms.filter((room) =>
                room.id == selectedRoom || selectedRoom == "All"
            );

            setDownloadProgress({ current: 0, total: filteredRooms.length });

            for (let i = 0; i < filteredRooms.length; i++) {
                const room = filteredRooms[i];
                setDownloadProgress({ current: i + 1, total: filteredRooms.length });

                const element = document.getElementById(room.id);

                if (element) {
                    const style = document.createElement("style");
                    document.head.appendChild(style);
                    style.sheet?.insertRule('body > div:last-child img { display: inline-block; }');
                    style.sheet?.insertRule('td div > svg { display: none !important; }');

                    try {
                        const canvas = await html2canvas(element, { scale: 3 });
                        const imageUrl = canvas.toDataURL("image/png");

                        const filename = `${room.room_name} - Schedule.png`;
                        const link = document.createElement("a");
                        link.href = imageUrl;
                        link.download = filename;
                        link.click();

                        if (i < filteredRooms.length - 1) {
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
        <div className="space-y-4">
            <Head title="Room Schedules" />
            <Card>
                <CardContent className="p-2">
                    <div className="flex gap-2 w-min">
                        <Tabs className="w-max" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                            <TabsList className="grid max-w-max grid-cols-2">
                                <TabsTrigger className="w-28" value="tabular">Tabular</TabsTrigger>
                                <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <Popover open={openRoomPopover} onOpenChange={setOpenRoomPopover}>
                            <PopoverTrigger asChild>
                                {(() => {
                                    // Determine the display text based on the selection array length
                                    let displayText = "All";
                                    if (selectedRooms.length > 0) {
                                        if (selectedRooms.length === 1) {
                                            const selectedRoomObj = rooms.find(room => room.id === selectedRooms[0]);
                                            displayText = selectedRoomObj
                                                ? `${selectedRoomObj.room_name} (${selectedRoomObj.schedLength})`
                                                : "1 selected";
                                        } else {
                                            displayText = `${selectedRooms.length} rooms selected`;
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
                                    <CommandInput placeholder="Search room..." className="h-9 border-0 outline-none p-0" />
                                    <CommandList>
                                        <CommandEmpty>No room found.</CommandEmpty>
                                        <CommandGroup>
                                            {/* "All" Option */}
                                            <CommandItem
                                                key="all-rooms"
                                                value="All"
                                                onSelect={() => {
                                                    setSelectedRooms([]); // Clear the array to represent "All"
                                                }}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedRooms.length === 0 ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                All
                                            </CommandItem>

                                            {/* Individual Room Options */}
                                            {rooms.map(room => {
                                                const isSelected = selectedRooms.includes(room.id);
                                                const hasClasses = room.schedLength > 0;

                                                return (
                                                    <CommandItem
                                                        key={`room-${room.id}`}
                                                        value={room.id.toString()}
                                                        onSelect={() => {
                                                            // Toggle logic: add if missing, remove if present
                                                            setSelectedRooms((prev) =>
                                                                prev.includes(room.id)
                                                                    ? prev.filter((id) => id !== room.id)
                                                                    : [...prev, room.id]
                                                            );
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                isSelected ? "opacity-100" : "opacity-0"
                                                            )}
                                                        />
                                                        {/* Gray out text if the room has 0 schedule entries */}
                                                        <span className={hasClasses ? "self-start" : "text-gray-500"}>
                                                            {room.room_name} ({room.schedLength})
                                                        </span>
                                                    </CommandItem>
                                                );
                                            })}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>

                        <Button
                            onClick={downloadExcel}
                            className="bg-green-600 hover:bg-green-500"
                            disabled={loading}
                        >
                            {loading ? "Loading..." : <><FileDown /> Excel</>}
                        </Button>
                        <Button
                            className="bg-blue-700 hover:bg-blue-600"
                            variant=""
                            onClick={downloadAllRoomImagesWithProgress}
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

            {rooms.length > 0 ? (
                <div className="space-y-4">
                    {rooms
                        // UPDATED FILTER LOGIC HERE
                        .filter((room) => selectedRooms.length === 0 || selectedRooms.includes(room.id))
                        .map((room) => (
                            <Card id={room.id} className="w-full" key={room.id}>
                                <CardHeader>
                                    <CardTitle className="text-4xl">
                                        {room.room_name} <span className="italic font-thin">({room.schedLength})</span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {scheduleType == "timetable" ? (
                                        <TimeTable data={room.schedules} colorful={colorful} />
                                    ) : (
                                        <TabularSchedule data={room.schedules} type="room" />
                                    )}
                                </CardContent>
                            </Card>
                        ))
                    }
                </div>
            ) : (
                <p className="text-center text-gray-500">No room schedules available.</p>
            )}
        </div>
    );
}

RoomSchedules.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
