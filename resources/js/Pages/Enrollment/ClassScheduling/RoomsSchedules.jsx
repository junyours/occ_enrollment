import React, { useEffect, useState, useRef } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import axios from "axios";
import PreLoader from "@/Components/preloader/PreLoader";
import { Head } from "@inertiajs/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/Components/ui/tabs"
import TimeTable from "@/Pages/ScheduleFormats/TimeTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Switch } from "@/Components/ui/switch";
import { Label } from "@/Components/ui/label";
import { FileDown, ImageDown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import { convertToAMPM, expandAlternatingDays, expandConsecutiveDays, formatFullName, identifyDayType } from "@/Lib/Utils";
import TabularSchedule from "@/Pages/ScheduleFormats/TabularSchedule";

export default function RoomSchedules() {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [colorful, setColorful] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState("All");
    const [scheduleType, setScheduleType] = useState('timetable');

    const getEnrollmentRoomSchedules = async () => {
        axios.post("api/get-enrollment-rooms-schedules")
            .then(response => {
                const sortedRooms = response.data.map(room => {
                    let schedLength = 0;

                    const sortedSchedules = room.schedules.sort((a, b) => {
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

                    // Compute schedLength inside the room mapping
                    sortedSchedules.forEach(sched => {
                        const dayType = identifyDayType(sched.day);

                        if (sched.day !== "TBA") {
                            schedLength = schedLength + countDays(dayType, sched.day)
                        } else {
                            schedLength++;
                        }
                    });

                    // Return the room object with schedLength included
                    return {
                        ...room,
                        schedules: sortedSchedules,
                        schedLength // Add calculated length inside the room object
                    };
                });

                // Update state
                setRooms(sortedRooms);
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
        getEnrollmentRoomSchedules();
    }, []);

    if (loading) return <PreLoader title="Room schedules" />;

    return (
        <div className="space-y-4">
            <Head title="Room Schedules" />
            {/* <Button onClick={() => console.log(rooms)}>Log</Button> */}
            <Card>
                <CardContent className="p-2">
                    <div className="flex gap-2 w-min">
                        <Tabs className="w-max" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                            <TabsList className="grid max-w-max grid-cols-2">
                                <TabsTrigger className="w-28" value="tabular">Tabular</TabsTrigger>
                                <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <Select value={selectedRoom} onValueChange={(value) => setSelectedRoom(value)}>
                            <SelectTrigger className="w-48 truncate overflow-hidden">
                                <SelectValue placeholder="Select a room" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem defaultValue value="All">All</SelectItem>
                                {rooms.map(room => (
                                    <SelectItem key={`room-${room.id}`} value={room.id}>
                                        {room.room_name} ({room.schedLength})
                                    </SelectItem>
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

            {rooms.length > 0 ? (
                <div className="space-y-4">
                    {rooms
                        .filter((room) => room.id == selectedRoom || selectedRoom == "All")
                        .map((room) => (
                            <Card className="w-full" key={room.id}>
                                <CardHeader>
                                    <CardTitle className="text-4xl">{room.room_name} <span className="italic font-thin">({room.schedLength})</span></CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {scheduleType == "timetable" ? (
                                        <TimeTable data={room.schedules} colorful={colorful} />
                                    ) : (
                                        <TabularSchedule data={room.schedules} type="room"/>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                </div>
            ) : (
                <p className="text-center text-gray-500">No room schedules available.</p>
            )}
        </div>
    );
}

RoomSchedules.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
