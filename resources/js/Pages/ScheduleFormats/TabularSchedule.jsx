import React from "react";
import { convertToAMPM, formatFullName } from "../../Lib/Utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import { PiStudent } from "react-icons/pi";

function TabularSchedule({ data, type }) {
    const sortSchedule = (data) => {
        const dayOrder = {
            Mon: 0,
            Monday: 0,
            Tue: 1,
            Tuesday: 1,
            Wed: 2,
            Wednesday: 2,
            Thu: 3,
            Thursday: 3,
            Fri: 4,
            Friday: 4,
            Sat: 5,
            Saturday: 5,
            Sun: 6,
            Sunday: 6,
        };

        const getScheduleInfo = (day) => {
            if (!day || day === "TBA") {
                return {
                    type: 4,
                    firstDay: 99,
                };
            }

            const days = day
                .split(",")
                .map((d) => d.trim())
                .filter(Boolean);

            const indexes = days
                .map((d) => dayOrder[d])
                .filter((d) => d !== undefined);

            if (indexes.length === 0) {
                return {
                    type: 4,
                    firstDay: 99,
                };
            }

            // Single
            if (indexes.length === 1) {
                return {
                    type: 1,
                    firstDay: indexes[0],
                };
            }

            // Consecutive
            const isConsecutive = indexes.every(
                (value, index) =>
                    index === 0 ||
                    value === indexes[index - 1] + 1
            );

            if (isConsecutive) {
                return {
                    type: 2,
                    firstDay: indexes[0],
                };
            }

            // Alternating
            return {
                type: 3,
                firstDay: indexes[0],
            };
        };

        return [...data].sort((a, b) => {
            const scheduleA = getScheduleInfo(a.day);
            const scheduleB = getScheduleInfo(b.day);

            // 1. Single → Consecutive → Alternating → TBA
            if (scheduleA.type !== scheduleB.type) {
                return scheduleA.type - scheduleB.type;
            }

            // 2. Sort by first day
            if (scheduleA.firstDay !== scheduleB.firstDay) {
                return scheduleA.firstDay - scheduleB.firstDay;
            }

            // 3. Sort by start time
            const timeA =
                a.start_time === "-" || !a.start_time
                    ? "24:00"
                    : a.start_time;

            const timeB =
                b.start_time === "-" || !b.start_time
                    ? "24:00"
                    : b.start_time;

            return timeA.localeCompare(timeB);
        });
    };

    const sortedData = sortSchedule(data);

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Class Code</TableHead>
                    {type != "subject" &&
                        <TableHead>Descriptive Title</TableHead>
                    }
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    {type != "faculty" &&
                        <TableHead>Instructor</TableHead>
                    }
                    {type != "room" &&
                        <TableHead>Room</TableHead>
                    }
                    {(type == "faculty" || (type == "subject")) &&
                        <TableHead>Students</TableHead>
                    }
                </TableRow>
            </TableHeader>
            <TableBody>
                {sortedData.length > 0 ? (
                    sortedData.map((sched, index) => (
                        <React.Fragment key={`sched-${index}`}>
                            <TableRow>
                                <TableCell className="w-32 max-w-28">{sched.class_code}</TableCell>
                                {type != "subject" &&
                                    <TableCell>{sched.descriptive_title}</TableCell>
                                }
                                <TableCell className="w-40 max-w-40">{sched.day == "TBA" ? '-' : sched.day}</TableCell>
                                <TableCell className="w-48 max-w-48">
                                    {sched.start_time === "-" ? "-" : `${convertToAMPM(sched.start_time)} - ${convertToAMPM(sched.end_time)}`}
                                </TableCell>
                                {type != "faculty" &&
                                    <TableCell className="w-48 truncate max-w-48 overflow-hidden whitespace-nowrap">
                                        {sched.first_name ? formatFullName(sched) : "-"}
                                    </TableCell>
                                }
                                {type != "room" &&
                                    <TableCell className="w-20 truncate max-w-20 overflow-hidden whitespace-nowrap">
                                        {sched.room_name || "-"}
                                    </TableCell>
                                }
                                {(type == "faculty" || type == "subject" || type == "room") &&
                                    <TableCell className="w-20 truncate max-w-20 overflow-hidden whitespace-nowrap">
                                        <div className="flex justify-center items-center">
                                            <PiStudent /> {sched.student_count}
                                        </div>
                                    </TableCell>
                                }
                            </TableRow>
                            {sched.secondary_schedule && (
                                <TableRow>
                                    <TableCell className="w-32 max-w-28">{sched.class_code}</TableCell>
                                    {type != "subject" &&
                                        <TableCell>{sched.descriptive_title} <span className='text-xs italic'>(2nd schedule)</span></TableCell>
                                    }
                                    <TableCell className="w-40 max-w-40">{sched.secondary_schedule.day == "TBA" ? '-' : sched.secondary_schedule.day}</TableCell>
                                    <TableCell className="w-48 max-w-48">
                                        {sched.secondary_schedule.start_time === "-" ? "-" : `${convertToAMPM(sched.secondary_schedule.start_time)} - ${convertToAMPM(sched.secondary_schedule.end_time)}`}
                                    </TableCell>
                                    {type != "faculty" &&
                                        <TableCell className="w-48 truncate max-w-48 overflow-hidden whitespace-nowrap">
                                            {sched.first_name ? formatFullName(sched) : "-"}
                                        </TableCell>
                                    }
                                    {type != "room" &&
                                        <TableCell className="w-20 truncate max-w-20 overflow-hidden whitespace-nowrap">
                                            {sched.secondary_schedule.room_name || "-"}
                                        </TableCell>
                                    }
                                    {(type == "faculty" || type == "subject" || type == "room") &&
                                        <TableCell className="w-20 truncate max-w-20 overflow-hidden whitespace-nowrap">
                                            <div className="flex justify-center items-center">
                                                <PiStudent /> {sched.student_count}
                                            </div>
                                        </TableCell>
                                    }
                                </TableRow>
                            )}
                        </React.Fragment>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={7} className="text-center py-4 text-gray-500">
                            No schedules available.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    )
}

export default TabularSchedule;