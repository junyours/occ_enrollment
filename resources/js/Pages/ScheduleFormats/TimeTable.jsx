import React from "react";
import { convertToAMPM } from "../../Lib/Utils";
import TimeTableCells from "./TimeTableCells";

function TimeTable({ data, colorful = true }) {
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

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

    return (
        <div
            className={`grid w-full border-2 border-[hsl(var(--timetable-outside-border))]  grid-cols-[120px_repeat(7,_1fr)] grid-rows-[30px_repeat(${timeSlots.length},_25px)]`}
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
            {/* Time table cells */}
            <TimeTableCells data={data} colorful={colorful} />
        </div>
    );
}

export default TimeTable;
