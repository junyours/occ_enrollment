import { expandAlternatingDays, expandConsecutiveDays, formatFullName, identifyDayType } from '@/Lib/Utils';
import React, { useMemo, useCallback } from 'react';
import { detectTwoScheduleConflict } from '@/Lib/ConflictUtilities';
import { PiStudent } from 'react-icons/pi';
import { MapPin, User, AlertTriangle } from 'lucide-react';

// ============================================================================
// Constants
// ============================================================================

const TIME_TO_ROW_START = 7;
const PIXELS_PER_30MIN = 1; // Maps to grid row increments

/**
 * Modern, accessible pastel color palette
 */
const COLOR_PALETTE = [
    "bg-blue-50 border-blue-200 text-blue-800 shadow-blue-500/10 hover:border-blue-400",
    "bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-500/10 hover:border-emerald-400",
    "bg-violet-50 border-violet-200 text-violet-800 shadow-violet-500/10 hover:border-violet-400",
    "bg-amber-50 border-amber-200 text-amber-800 shadow-amber-500/10 hover:border-amber-400",
    "bg-pink-50 border-pink-200 text-pink-800 shadow-pink-500/10 hover:border-pink-400",
    "bg-cyan-50 border-cyan-200 text-cyan-800 shadow-cyan-500/10 hover:border-cyan-400",
    "bg-rose-50 border-rose-200 text-rose-800 shadow-rose-500/10 hover:border-rose-400",
    "bg-indigo-50 border-indigo-200 text-indigo-800 shadow-indigo-500/10 hover:border-indigo-400",
    "bg-teal-50 border-teal-200 text-teal-800 shadow-teal-500/10 hover:border-teal-400",
    "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800 shadow-fuchsia-500/10 hover:border-fuchsia-400",
];

/**
 * Day to grid column mapping
 */
const DAY_TO_COLUMN = {
    Monday: 2,
    Tuesday: 3,
    Wednesday: 4,
    Thursday: 5,
    Friday: 6,
    Saturday: 7,
    Sunday: 8,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert time string (HH:MM) to grid row index
 * @param {string} time - Time in HH:MM format
 * @returns {number} Grid row index
 */
const timeToRowIndex = (time) => {
    const [hour, minute] = time.split(":").map(Number);
    return (hour - TIME_TO_ROW_START) * 2 + (minute === 30 ? 3 : 2);
};

/**
 * Get color for class based on index
 * @param {number} index - Class index
 * @returns {string} Tailwind color classes
 */
const getColorByIndex = (index) => COLOR_PALETTE[index % COLOR_PALETTE.length];

/**
 * Expand schedule days based on day type
 * @param {string} day - Day string (Single/Consecutive/Alternating)
 * @returns {Array} Array of individual days
 */
const expandScheduleDays = (day) => {
    if (!day || day === "TBA") return [];

    const dayType = identifyDayType(day);

    switch (dayType) {
        case "Consecutive":
            return expandConsecutiveDays(day);
        case "Alternating":
            return expandAlternatingDays(day);
        case "Single":
        default:
            return [day];
    }
};

/**
 * Create schedule object for conflict checking
 * @param {string} id - Schedule ID
 * @param {string} day - Day of week
 * @param {string} start_time - Start time
 * @param {string} end_time - End time
 * @returns {Object} Schedule object
 */
const createScheduleObject = (id, day, start_time, end_time) => ({
    id,
    day,
    start_time,
    end_time,
});

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Conflict indicator badge
 */
const ConflictBadge = React.memo(() => (
    <AlertTriangle className="w-3.5 h-3.5 text-destructive animate-pulse" />
));
ConflictBadge.displayName = "ConflictBadge";

/**
 * Student count badge
 */
const StudentCountBadge = React.memo(({ count }) => {
    if (!count || count < 0) return null;

    return (
        <span className="flex items-center gap-1 text-[10px] font-semibold bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-full">
            <PiStudent className="opacity-70" />
            {count}
        </span>
    );
});
StudentCountBadge.displayName = "StudentCountBadge";

/**
 * Left accent border
 */
const AccentBorder = React.memo(({ hasConflict }) => (
    <div
        className={`absolute left-0 top-0 bottom-0 w-1 opacity-50 ${hasConflict ? "bg-destructive" : "bg-current"}`}
    />
));
AccentBorder.displayName = "AccentBorder";

/**
 * Header section with class code and badges
 */
const ScheduleHeader = React.memo(({ classCode, conflict, studentCount }) => (
    <div className="flex items-start justify-between gap-1 w-full pl-1">
        {/* <span className="font-bold tracking-tight leading-tight truncate">
            {classCode || "TBA"}
        </span> */}

        <div className="flex items-center gap-1.5 shrink-0">
            {conflict && <ConflictBadge />}
            <StudentCountBadge count={studentCount} />
        </div>
    </div>
));
ScheduleHeader.displayName = "ScheduleHeader";

/**
 * Class title section
 */
const ClassTitle = React.memo(({ title, isCompact }) => (
    <span className={`font-medium mt-1 leading-snug pl-1 opacity-90 ${isCompact ? "truncate" : "line-clamp-2"}`}>
        {title}
    </span>
));
ClassTitle.displayName = "ClassTitle";

/**
 * Info footer with location and instructor
 */
const InfoFooter = React.memo(({ roomName, instructorName, isCompact }) => {

    return (
        <div className="mt-auto flex flex-col gap-1 pl-1 pt-2 opacity-75 text-[11px] font-medium">
            {roomName && (
                <div className="flex items-center gap-1.5 truncate">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{roomName}</span>
                </div>
            )}
            {(instructorName && !isCompact) && (
                <div className="flex items-center gap-1.5 truncate">
                    <User className="w-3 h-3 shrink-0" />
                    <span className="truncate">{instructorName}</span>
                </div>
            )}
        </div>
    );
});
InfoFooter.displayName = "InfoFooter";

/**
 * Individual schedule cell card
 */
const ScheduleCell = React.memo(({ schedData, colorful }) => {
    const rowSpan = schedData.rowEnd - schedData.rowStart;
    const isCompact = rowSpan <= 2;

    // Determine card styles
    let cardStyles = !colorful ? "bg-card border-border text-foreground hover:border-primary shadow-sm" : schedData.color;

    if (schedData.conflict) {
        cardStyles = "bg-destructive/10 border-destructive/40 text-destructive shadow-destructive/10 hover:border-destructive";
    }

    const title = `${schedData.descriptive_title}\nRoom: ${schedData.room_name || "TBA"}\nInstructor: ${schedData.first_name ? formatFullName(schedData) : "TBA"}`;

    return (
        <div
            title={title}
            className={`group relative z-10 mx-1 mb-1 p-2 rounded-xl border text-sm flex flex-col justify-start overflow-hidden transition-all duration-200 cursor-pointer shadow-sm hover:z-30 hover:scale-[1.02] hover:shadow-lg ${cardStyles}`}
            style={{
                gridRow: `${schedData.rowStart} / ${schedData.rowEnd}`,
                gridColumn: `${schedData.colStart} / ${schedData.colStart + 1}`,
            }}
        >
            <AccentBorder hasConflict={schedData.conflict} />

            <ScheduleHeader
                classCode={schedData.class_code}
                conflict={schedData.conflict}
                studentCount={schedData.student_count}
            />

            <ClassTitle title={schedData.descriptive_title} isCompact={isCompact} />

            <InfoFooter
                roomName={schedData.room_name}
                instructorName={schedData.first_name ? formatFullName(schedData) : null}
                isCompact={isCompact}
            />
        </div>
    );
});
ScheduleCell.displayName = "ScheduleCell";

// ============================================================================
// Main Component
// ============================================================================

function TimeTableCells({ data, colorful }) {
    /**
     * Check if a schedule conflicts with any other in the data
     */
    const isConflict = useCallback(
        (cellSchedule) => {
            if (cellSchedule.day === "TBA" || cellSchedule.start_time === "TBA") {
                return false;
            }

            return data.some((cls) => {
                // Check main schedule
                if (detectTwoScheduleConflict(cellSchedule, cls) && cls.id !== cellSchedule.id) {
                    return true;
                }

                // Check secondary schedule
                if (cls.secondary_schedule && cls.secondary_schedule.id !== cellSchedule.id) {
                    return detectTwoScheduleConflict(cellSchedule, cls.secondary_schedule);
                }

                return false;
            });
        },
        [data]
    );

    /**
     * Generate cell data for main schedule
     */
    const getMainScheduleCellData = useCallback(
        (classData, day, color) => {
            if (classData.start_time === "TBA" || day === "TBA") {
                return null;
            }

            const { id, start_time, end_time, descriptive_title, room_name, first_name, middle_name, last_name, class_code, student_count } = classData;
            const rowStart = timeToRowIndex(start_time);
            const rowEnd = timeToRowIndex(end_time);
            const colStart = DAY_TO_COLUMN[day];
            const cellSchedule = createScheduleObject(id, day, start_time, end_time);
            const conflict = isConflict(cellSchedule);

            return {
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
                color,
            };
        },
        [isConflict]
    );

    /**
     * Generate cell data for secondary schedule
     */
    const getSecondaryScheduleCellData = useCallback(
        (classData, day, color) => {
            if (classData.secondary_schedule?.start_time === "TBA" || day === "TBA") {
                return null;
            }

            const { descriptive_title, first_name, middle_name, last_name, class_code, student_count } = classData;
            const { id, start_time, end_time, room_name } = classData.secondary_schedule;

            if (!start_time || !end_time || !day) {
                return null;
            }

            const rowStart = timeToRowIndex(start_time);
            const rowEnd = timeToRowIndex(end_time);
            const colStart = DAY_TO_COLUMN[day];
            const cellSchedule = createScheduleObject(id, day, start_time, end_time);
            const conflict = isConflict(cellSchedule);

            return {
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
                color,
            };
        },
        [isConflict]
    );

    /**
     * Memoize expanded day schedules for each class
     */
    const expandedSchedules = useMemo(() => {
        return data.map((classData, index) => {
            const color = getColorByIndex(index);
            const mainDays = expandScheduleDays(classData.day);
            const secondaryDays = classData.secondary_schedule ? expandScheduleDays(classData.secondary_schedule.day) : [];

            return {
                classData,
                index,
                color,
                mainDays,
                secondaryDays,
            };
        });
    }, [data]);

    return (
        <>
            {expandedSchedules.map(({ classData, index, color, mainDays, secondaryDays }) => (
                <React.Fragment key={`class-${classData.id}-${index}`}>
                    {/* Render main schedule cells */}
                    {mainDays.map((day, dayIndex) => {
                        const cellData = getMainScheduleCellData(classData, day, color);
                        return cellData ? (
                            <ScheduleCell key={`main-${classData.id}-${day}-${dayIndex}`} schedData={cellData} colorful={colorful} />
                        ) : null;
                    })}

                    {/* Render secondary schedule cells */}
                    {secondaryDays.map((day, dayIndex) => {
                        const cellData = getSecondaryScheduleCellData(classData, day, color);
                        return cellData ? (
                            <ScheduleCell
                                key={`secondary-${classData.id}-${day}-${dayIndex}`}
                                schedData={cellData}
                                colorful={colorful}
                            />
                        ) : null;
                    })}
                </React.Fragment>
            ))}
        </>
    );
}

export default React.memo(TimeTableCells);