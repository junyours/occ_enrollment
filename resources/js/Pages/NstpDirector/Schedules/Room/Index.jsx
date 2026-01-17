import React, { useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import axios from "axios";
import { Head } from "@inertiajs/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/Components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/Components/ui/tabs"
import TimeTable from "@/Pages/ScheduleFormats/TimeTable";
import { Check } from "lucide-react";
import { cn, expandAlternatingDays, expandConsecutiveDays, identifyDayType } from "@/Lib/Utils";
import TabularSchedule from "@/Pages/ScheduleFormats/TabularSchedule";
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Input } from '@/Components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/Components/ui/command';
import { useSchoolYearStore } from "@/Components/useSchoolYearStore";
import { useQuery } from "@tanstack/react-query";
import TimeTableSkeleton from "../TimTableSckeleton";

export default function Index() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const [selectedRoom, setSelectedRoom] = useState("All");
    const [scheduleType, setScheduleType] = useState('timetable');
    const [openRoomPopover, setOpenRoomPopover] = useState(false);

    const getEnrollmentRoomSchedules = async () => {
        const response = await axios.post(
            route('nstp-director.rooms-schedules'),
            { schoolYearID: selectedSchoolYearEntry.id }
        );

        const sortedRooms = response.data.map(room => {
            let schedLength = 0;

            const sortedSchedules = [...room.schedules].sort((a, b) => {
                const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

                const dayComparison =
                    daysOrder.indexOf(a.day) - daysOrder.indexOf(b.day);
                if (dayComparison !== 0) return dayComparison;

                const titleComparison =
                    a.descriptive_title.localeCompare(b.descriptive_title);
                if (titleComparison !== 0) return titleComparison;

                return a.start_time.localeCompare(b.start_time);
            });

            sortedSchedules.forEach(sched => {
                const day = sched.day?.trim() ?? "TBA";
                const dayType = identifyDayType(day);

                if (day !== "TBA") {
                    schedLength += countDays(dayType, day);
                } else {
                    schedLength++;
                }
            });

            return {
                ...room,
                schedules: sortedSchedules,
                schedLength,
            };
        });

        return sortedRooms; // ✅ React Query finally gets data
    };

    const { data, error, isLoading, refetch } = useQuery({
        queryKey: ['nstp-director.rooms-schedules'],
        queryFn: getEnrollmentRoomSchedules,
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
                                    const selectedRoomObj = data.find(room => room.id === selectedRoom);
                                    return (
                                        <Input
                                            placeholder=""
                                            readOnly
                                            value={selectedRoomObj
                                                ? `${selectedRoomObj.room_name} (${selectedRoomObj.schedLength})`
                                                : "All"}
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
                                            <CommandItem
                                                key="all-rooms"
                                                value="All"
                                                onSelect={() => {
                                                    setSelectedRoom("All");
                                                    setOpenRoomPopover(false);
                                                }}
                                            >
                                                All
                                            </CommandItem>
                                            {data.map(room => (
                                                <CommandItem
                                                    key={`room-${room.id}`}
                                                    value={room.id}
                                                    onSelect={() => {
                                                        setSelectedRoom(room.id);
                                                        setOpenRoomPopover(false);
                                                    }}
                                                >
                                                    {room.room_name} ({room.schedLength})
                                                    <Check
                                                        className={cn(
                                                            "ml-auto",
                                                            selectedRoom == room.id ? "opacity-100" : "opacity-0"
                                                        )}
                                                    />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                </CardContent>
            </Card>

            {data.length > 0 ? (
                <div className="space-y-4">
                    {data
                        .filter((room) => room.id == selectedRoom || selectedRoom == "All")
                        .map((room) => (
                            <Card id={room.id} className="w-full" key={room.id}>
                                <CardHeader>
                                    <CardTitle className="text-4xl">{room.room_name} <span className="italic font-thin">({room.schedLength})</span></CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {scheduleType == "timetable" ? (
                                        <TimeTable data={room.schedules} />
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

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
