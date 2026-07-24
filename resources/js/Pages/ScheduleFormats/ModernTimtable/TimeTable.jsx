import React, { useState, useEffect, useMemo } from "react";
import TimeTableCells from "./TimeTableCells";
import { cn, convertToAMPM } from "@/Lib/Utils";

// ============================================================================
// Constants
// ============================================================================

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const START_HOUR = 7;
const END_HOUR = 22;
const SLOT_DURATION_MINUTES = 30;
const TOTAL_SLOTS = 30;
const HEADER_HEIGHT_PX = 40;
const ROW_HEIGHT_PX = 38;
const PIXELS_PER_MINUTE = ROW_HEIGHT_PX / SLOT_DURATION_MINUTES;
const TIME_COLUMN_WIDTH = "80px";
const CELL_MIN_WIDTH = "100px";

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate time slots in 30-minute intervals starting from START_HOUR
 */
const generateTimeSlots = () => {
    return Array.from({ length: TOTAL_SLOTS }, (_, i) => {
        const totalMinutes = START_HOUR * 60 + i * SLOT_DURATION_MINUTES;
        const nextTotalMinutes = totalMinutes + SLOT_DURATION_MINUTES;

        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        const nextHour = Math.floor(nextTotalMinutes / 60);
        const nextMinute = nextTotalMinutes % 60;

        const start = `${hour}:${minute.toString().padStart(2, "0")}`;
        const end = `${nextHour}:${nextMinute.toString().padStart(2, "0")}`;

        return { start, end, displayRange: `${start} - ${end}` };
    });
};

/**
 * Get current day name in long format
 */
const getCurrentDay = () => {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
};

/**
 * Calculate the pixel offset for current time indicator
 */
const calculateTimeIndicatorPosition = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    // Only show indicator if time is within schedule bounds
    if (currentHour < START_HOUR || currentHour >= END_HOUR) {
        return null;
    }

    const totalMinutes = (currentHour - START_HOUR) * 60 + currentMinute;
    return HEADER_HEIGHT_PX + totalMinutes * PIXELS_PER_MINUTE;
};

// ============================================================================
// Sub-components
// ============================================================================

/**
 * Top-left corner cell (sticky, displays timezone)
 */
const TopLeftCorner = () => (
    <div className="sticky left-0 top-0 z-30 col-start-1 row-start-1 bg-card border-b border-r-2 border-border flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        {/* GMT+8 */}
    </div>
);

/**
 * Day header cell with styling for current day and weekends
 */
const DayHeader = ({ day, index, isToday }) => (
    <div
        className={`sticky top-0 z-20 flex flex-col items-center justify-center border-b border-border ${index < 6 ? "border-r" : ""
            } ${isToday
                ? "bg-primary/5 text-primary border-b-2 border-b-primary"
                : "bg-card/95 backdrop-blur-sm text-foreground"
            }`}
        style={{ gridColumn: index + 2, gridRow: 1 }}
    >
        <span className={`text-sm font-semibold tracking-tight ${isToday ? "text-primary" : ""}`}>
            {day}
        </span>
    </div>
);

/**
 * Time slot label (Y-axis)
 * FIX: The container MUST render even if !isTopOfHour, otherwise the right border breaks.
 */
const TimeSlotLabel = ({ timeSlot, rowIndex, isTopOfHour }) => {
    const formattedTime = convertToAMPM(timeSlot.start).replace(/ AM| PM/g, "");
    const period = convertToAMPM(timeSlot.start).slice(-2);

    return (
        <div
            className="sticky left-0 z-10 flex items-start justify-end pr-2 pt-1.5 border-r-2 border-border bg-card/95 backdrop-blur-sm"
            style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
        >
            {isTopOfHour && (
                <span className="text-xs font-medium text-muted-foreground leading-none">
                    {formattedTime} <span className="text-[10px] uppercase opacity-70">{period}</span>
                </span>
            )}
        </div>
    );
};

/**
 * Individual grid cell
 * Solid border at top of hour (every 2 rows), dashed otherwise
 */
const GridCell = ({ rowIndex, colIndex, isToday }) => {
    // rowIndex 0 & 1 = 7:00-8:00, rowIndex 2 & 3 = 8:00-9:00, etc.
    // Solid border every 2 rows (at :00 minutes)
    const isHourBoundary = rowIndex % 2 === 0;

    return (
        <div
            className={cn(
                "transition-colors duration-200",
                isHourBoundary ? "border-t border-border" : "border-t [border-top-style:dashed] [border-right-style:solid]",
                colIndex < 6 ? "border-r" : "",
                isToday
                    ? "bg-primary/[0.02]"
                    : ""
                ,
            ) }
            style={{ gridColumn: colIndex + 2, gridRow: rowIndex + 2 }}
        />
    );
};

/**
 * Current time indicator (live red line)
 */
const TimeIndicator = ({ position }) => {
    if (!position) return null;

    return (
        <div
            className="absolute left-[80px] right-0 z-30 pointer-events-none flex items-center"
            style={{ top: `${position}px` }}
        >
            <div className="w-2 h-2 rounded-full bg-destructive -ml-1 shadow-[0_0_0_4px_rgba(220,38,38,0.2)]" />
            <div className="h-[2px] bg-destructive w-full opacity-70 shadow-sm" />
        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

// 1. Added showCurrentTime and showCurrentDay props
function TimeTable({
    data,
    colorful = true,
    showCurrentTime = true,
    showCurrentDay = true
}) {
    const [currentTimePosition, setCurrentTimePosition] = useState(null);
    const currentDay = useMemo(() => getCurrentDay(), []);
    const timeSlots = useMemo(() => generateTimeSlots(), []);

    // 2. Wrap the interval in a check for showCurrentTime
    useEffect(() => {
        if (!showCurrentTime) return; // Don't run the timer if disabled

        setCurrentTimePosition(calculateTimeIndicatorPosition());

        const interval = setInterval(() => {
            setCurrentTimePosition(calculateTimeIndicatorPosition());
        }, 60000);

        return () => clearInterval(interval);
    }, [showCurrentTime]); // Add dependency

    // 3. Update day properties to check showCurrentDay
    const dayProperties = useMemo(
        () =>
            DAYS_OF_WEEK.map((day) => ({
                day,
                // Only mark as today if the prop allows it
                isToday: showCurrentDay ? day === currentDay : false,
            })),
        [currentDay, showCurrentDay] // Add dependency
    );

    const gridTemplateColumns = `${TIME_COLUMN_WIDTH} repeat(7, minmax(${CELL_MIN_WIDTH}, 1fr))`;
    const gridTemplateRows = `${HEADER_HEIGHT_PX}px repeat(${timeSlots.length}, ${ROW_HEIGHT_PX}px)`;

    return (
        <div className="relative w-full overflow-x-auto rounded-2xl border border-border shadow-sm bg-card no-scrollbar">
            <div
                className="grid bg-card"
                style={{
                    gridTemplateColumns,
                    gridTemplateRows,
                }}
            >
                {/* Top-left corner */}
                <TopLeftCorner />

                {/* Day headers */}
                {dayProperties.map(({ day, isToday }, index) => (
                    <DayHeader
                        key={day}
                        day={day}
                        index={index}
                        isToday={isToday}
                    />
                ))}

                {/* Time slots and grid cells */}
                {timeSlots.map((timeSlot, rowIndex) => {
                    const isTopOfHour = timeSlot.start.endsWith(":00");

                    return (
                        <React.Fragment key={`row-${rowIndex}`}>
                            <TimeSlotLabel
                                timeSlot={timeSlot}
                                rowIndex={rowIndex}
                                isTopOfHour={isTopOfHour}
                            />

                            {dayProperties.map(({ day, isToday }, colIndex) => (
                                <GridCell
                                    key={`cell-${rowIndex}-${colIndex}`}
                                    rowIndex={rowIndex}
                                    colIndex={colIndex}
                                    isToday={isToday}
                                />
                            ))}
                        </React.Fragment>
                    );
                })}

                {/* 4. Conditionally render the red line */}
                {showCurrentTime && (
                    <TimeIndicator position={currentTimePosition} />
                )}

                {/* Schedule cards */}
                <TimeTableCells data={data} colorful={colorful} />
            </div>
        </div>
    );
}

export default TimeTable;