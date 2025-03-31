import React from "react";
import { convertToAMPM, formatFullName, identifyDayType } from "../../Lib/Utils";
import { PiStudent } from "react-icons/pi";
import TimeTableCells from "./TimeTableCells";


const dayMapping = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function TimeTable({ data, colorful }) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

    const timeSlots = Array.from({ length: 27 }, (_, i) => {
        const startHour = 7;
        const hour = Math.floor((startHour * 60 + i * 30) / 60);
        const minute = (startHour * 60 + i * 30) % 60;
        const nextHour = Math.floor((startHour * 60 + (i + 1) * 30) / 60);
        const nextMinute = (startHour * 60 + (i + 1) * 30) % 60;

        const formattedStart = `${hour}:${minute.toString().padStart(2, "0")}`;
        if (formattedStart === "7:00") return null; // Skip the 7:00 row

        return `${formattedStart} - ${nextHour}:${nextMinute.toString().padStart(2, "0")}`;
    }).filter(Boolean); // Filter out the null value

    const expandDayRange = (range) => {
        const days = range.split("-");

        if (days.length === 1) return [dayMapping.find(day => day.startsWith(days[0]))];

        const startIndex = dayMapping.findIndex(day => day.startsWith(days[0]));
        const endIndex = dayMapping.findIndex(day => day.startsWith(days[1]));

        if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) return [];

        return dayMapping.slice(startIndex, endIndex + 1);
    };

    const expandDays = (input) => {
        let result = [];

        input.split(",").forEach(part => {
            part = part.trim();

            if (part.includes("-")) {
                // Handle consecutive range (e.g., "Mon-Thu")
                const [start, end] = part.split("-");
                const startIndex = dayMapping.findIndex(day => day.startsWith(start));
                const endIndex = dayMapping.findIndex(day => day.startsWith(end));

                if (startIndex !== -1 && endIndex !== -1 && startIndex <= endIndex) {
                    result.push(...dayMapping.slice(startIndex, endIndex + 1));
                }
            } else {
                // Handle single days (e.g., "Mon", "Wed")
                const fullDay = dayMapping.find(day => day.startsWith(part));
                if (fullDay) result.push(fullDay);
            }
        });

        return [...new Set(result)]; // Remove duplicates and return the final array
    };

    return (
        <div
            className={`grid w-full border-2 border-[hsl(var(--timetable-outside-border))]  grid-cols-[120px_repeat(6,_1fr)] grid-rows-[30px_repeat(${timeSlots.length},_25px)]`}
        >
            {/* Header Row */}
            <div className="bg-[hsl(var(--timetable-header-bg))] font-bold flex items-center justify-center border border-t-0 border-l-0 border-r-[hsl(var(--timetable-outside-border))]  border-b-[hsl(var(--timetable-outside-border))]">
                Time
            </div>
            {days.map((day) => (
                <div
                    key={day}
                    className="bg-[hsl(var(--timetable-header-bg))] font-bold flex items-center justify-center border border-t-0 border-r-0 border-l-[hsl(var(--timetable-outside-border))] border-b-[hsl(var(--timetable-outside-border))]"
                >
                    {day}
                </div>
            ))}

            {/* Time Column and Empty Grid */}
            {timeSlots.map((timeSlot, rowIndex) => {
                // Split the time slot into start and end times
                const [start, end] = timeSlot.split(" - ").map((time) => time.trim());

                return (
                    <React.Fragment key={`time-slot-${rowIndex}`}> {/* Unique key added here */}
                        {/* Time Column */}
                        <div
                            key={`time-${rowIndex}`}
                            className={`font-medium flex items-center justify-center border border-l-0 border-b-0 border-t-[hsl(var(--timetable-outside-border))] border-r-[hsl(var(--timetable-outside-border))] ${colorful && 'bg-[hsl(var(--timetable-timeslots-bg))]'} `}
                            style={{
                                gridColumn: "1 / 2", // Time column
                                gridRow: rowIndex + 2, // Align with rows
                            }}
                        >
                            {`${convertToAMPM(start).replace(/ AM| PM/g, "")} - ${convertToAMPM(end).replace(/ AM| PM/g, "")}`}
                        </div>

                        {/* Placeholder Cells for Days */}
                        {days.map((day, colIndex) => (
                            <div
                                key={`cell-${rowIndex}-${colIndex}`}
                                className={`border border-b-0 border-r-0 flex items-center justify-center ${day === "Monday" ? "border-l-[hsl(var(--timetable-outside-border))]" : "border-l-[hsl(var(--timetable-inside-cells-border))]"
                                    } ${timeSlot === "7:30 - 8:00" ? "border-t-[hsl(var(--timetable-outside-border))]" : "border-t-[hsl(var(--timetable-inside-cells-border))]"}`}
                                style={{
                                    gridColumn: `${colIndex + 2} / ${colIndex + 3}`, // Days start after time column
                                    gridRow: rowIndex + 2,
                                }}
                            />
                        ))}
                    </React.Fragment>
                );
            })}

            <TimeTableCells data={data} colorful={colorful} />
        </div>
    );
}

export default TimeTable;
