import { expandAlternatingDays, expandConsecutiveDays, formatFullName, hasTimeConflict, identifyDayType } from '@/Lib/Utils';
import React from 'react';
import { detectTwoScheduleConflict } from '../../Lib/ConflictUtilities';
import { PiStudent } from 'react-icons/pi';

// Helper function to convert time to row index
function timeToRowIndex(time) {
    const [hour, minute] = time.split(":").map(Number);
    const startHour = 7; // Starting hour of the schedule
    return (hour - startHour) * 2 + (minute === 30 ? 2 : 1); // No need to add 1 for header
}

// Helper function to map days to column indices
const dayToColumnIndex = {
    Monday: 2,
    Tuesday: 3,
    Wednesday: 4,
    Thursday: 5,
    Friday: 6,
    Saturday: 7,
    Sunday: 8,
}

const colors = [
    "bg-[#ffc000]", "bg-[#ffff00]", "bg-[#92d050]", "bg-[#00b050]",
    "bg-[#00b0f0]", "bg-[#0070c0]", "bg-[#b113bd]", "bg-[#2e9288]",
    "bg-[#ff5050]", "bg-[#ff7043]", "bg-[#ff8c00]", "bg-[#ff1493]",
    "bg-[#8a2be2]", "bg-[#5f9ea0]", "bg-[#7fff00]", "bg-[#4682b4]",
    "bg-[#d2691e]", "bg-[#40e0d0]", "bg-[#c71585]", "bg-[#6b8e23]",
    "bg-[#ff4500]", "bg-[#dc143c]", "bg-[#ffdab9]", "bg-[#00ced1]",
    "bg-[#228b22]", "bg-[#8b0000]", "bg-[#9932cc]", "bg-[#ffdead]",
    "bg-[#20b2aa]", "bg-[#b8860b]"
];

export default function TimeTableCells({ data, colorful }) {

    const isConflict = (cellSchedule, schedType) => {
        if (cellSchedule.day == "TBA" || cellSchedule.start_time == "TBA") return false

        let conflict = false

        data.forEach((cls) => {
            if (detectTwoScheduleConflict(cellSchedule, cls) && cls.id != cellSchedule.id) {
                conflict = true
                return
            }

            if (cls.secondary_schedule && cls.secondary_schedule.id != cellSchedule.id) {
                const hasConflict = detectTwoScheduleConflict(cellSchedule, cls.secondary_schedule);
                if (hasConflict) {
                    conflict = true
                    return
                }
            }
        });

        return conflict
    }

    const mainSchedCellData = (classData, day, color) => {
        if (classData.start_time == "TBA" || day == "TBA") return

        const { id, start_time, end_time, descriptive_title, room_name, first_name, middle_name, last_name, class_code, student_count } = classData;
        const rowStart = timeToRowIndex(start_time);
        const rowEnd = timeToRowIndex(end_time);
        const colStart = dayToColumnIndex[day];

        const cellSchedule = { id: id, day: day, start_time: start_time, end_time: end_time }
        const conflict = isConflict(cellSchedule, 'main')

        return displayScedCell({
            descriptive_title,
            first_name,
            middle_name,
            last_name,
            class_code,
            student_count,
            id,
            start_time,
            end_time,
            room_name,
            rowStart,
            rowEnd,
            colStart,
            conflict,
            color
        })
    };

    const secondSchedCellData = (classData, day, color) => {
        if (classData.secondary_schedule.start_time == "TBA" || day == "TBA") return

        const { descriptive_title, first_name, middle_name, last_name, class_code, student_count } = classData;
        const { id, start_time, end_time, room_name } = classData.secondary_schedule;

        const rowStart = start_time ? timeToRowIndex(start_time) : null;
        const rowEnd = end_time ? timeToRowIndex(end_time) : null;
        const colStart = day ? dayToColumnIndex[day] : null;

        const cellSchedule = {
            id: id, day: day, start_time: classData.secondary_schedule.start_time, end_time: classData.secondary_schedule.end_time
        }

        const conflict = isConflict(cellSchedule, 'second')

        return displayScedCell({
            descriptive_title,
            first_name,
            middle_name,
            last_name,
            class_code,
            student_count,
            id,
            start_time,
            end_time,
            room_name,
            rowStart,
            rowEnd,
            colStart,
            conflict,
            color
        })
    };

    const displayScedCell = (schedData) => {
        return (
            <div
                className={`text-black ${schedData.conflict ? 'bg-red-600 bg-opacity-40 text-white' : !colorful ? 'bg-white opacity-85 ring-1 ring-gray-400' : `${schedData.color}`} m-[2px] text-center text-sm flex flex-col items-center justify-center font-medium rounded-md p-1`}
                style={{
                    gridRow: `${schedData.rowStart} / ${schedData.rowEnd}`,
                    gridColumn: `${schedData.colStart} / ${schedData.colStart + 1}`,
                }}
            >
                <span>{schedData.class_code || ''}</span>
                <span className={`${schedData.rowEnd - schedData.rowStart <= 4 ? 'line-clamp-2' : ''} overflow-hidden text-ellipsis`}>{schedData.descriptive_title}</span>

                <span>{schedData.room_name || ""}</span>
                <span>{schedData.first_name ? formatFullName(schedData) : ""}</span>
                {schedData.student_count &&
                    <span className="flex items-center justify-center"><PiStudent /> {schedData.student_count}</span>
                }
            </div>
        );
    }

    return (
        <>
            {data.map((classData, index) => {
                const color = colors[index % colors.length];
                const mainClassDayType = identifyDayType(classData.day)

                let mainSchedDays = []

                if (mainClassDayType === "Consecutive") {
                    mainSchedDays = expandConsecutiveDays(classData.day)
                } else if (mainClassDayType === "Alternating") {
                    mainSchedDays = expandAlternatingDays(classData.day)
                }

                const secondClassDayType = classData.secondary_schedule ? identifyDayType(classData.secondary_schedule.day) : ''

                let secondSchedDays = []

                if (secondClassDayType === "Consecutive") {
                    secondSchedDays = expandConsecutiveDays(classData.secondary_schedule?.day)
                } else if (secondClassDayType === "Alternating") {
                    secondSchedDays = expandAlternatingDays(classData.secondary_schedule?.day)
                }

                return (
                    <React.Fragment key={`${classData.class_code}-main-${index}`}>
                        {mainClassDayType === "Single"
                            ? mainSchedCellData(classData, classData.day, color)
                            : mainSchedDays.map((day, index) => (
                                <React.Fragment key={`main-${day}-${index}`}>
                                    {mainSchedCellData(classData, day, color)}
                                </React.Fragment>
                            ))
                        }

                        {secondClassDayType === "Single"
                            ? secondSchedCellData(classData, classData.secondary_schedule.day, color)
                            : secondSchedDays.map((day, index) => (
                                <React.Fragment key={`second-${day}-${index}`}>
                                    {secondSchedCellData(classData, day, color)}
                                </React.Fragment>
                            ))
                        }
                    </React.Fragment>
                );
            })}
        </>
    );
}
