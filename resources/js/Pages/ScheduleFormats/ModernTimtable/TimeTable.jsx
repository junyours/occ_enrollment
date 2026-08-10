import React, { useState, useEffect, useMemo } from "react";
import TimeTableCells from "./TimeTableCells";
import { cn, convertToAMPM } from "@/Lib/Utils";
import { Maximize2, Minimize2 } from 'lucide-react';

// ============================================================================
// Constants
// ============================================================================

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const START_HOUR = 6;
const START_MINUTE = 30;
const TOTAL_SLOTS = 32;
const END_HOUR = 22;
const SLOT_DURATION_MINUTES = 30;
const HEADER_HEIGHT_PX = 40;
const ROW_HEIGHT_PX = 38;
const TIME_COLUMN_WIDTH = "77px";
const CELL_MIN_WIDTH = "100px";
const EXPANDED_ROW_HEIGHT_PX = 100;
// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate time slots in 30-minute intervals starting from START_HOUR
 */
const generateTimeSlots = () => {
    return Array.from({ length: TOTAL_SLOTS }, (_, i) => {
        const totalMinutes =
            START_HOUR * 60 + START_MINUTE + i * SLOT_DURATION_MINUTES;

        const nextTotalMinutes = totalMinutes + SLOT_DURATION_MINUTES;

        const hour = Math.floor(totalMinutes / 60);
        const minute = totalMinutes % 60;
        const nextHour = Math.floor(nextTotalMinutes / 60);
        const nextMinute = nextTotalMinutes % 60;

        return {
            start: `${hour}:${minute.toString().padStart(2, "0")}`,
            end: `${nextHour}:${nextMinute.toString().padStart(2, "0")}`,
        };
    });
};

/**
 * Get current day name in long format
 */
const getCurrentDay = () => {
    return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
};

/**
 * Calculate the pixel offset for current time indicator (Slot-by-Slot)
 */
const calculateTimeIndicatorPosition = (expandedHourRowIndex = null) => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTotalMinutes = currentHour * 60 + currentMinute;
    const scheduleStartMinutes = START_HOUR * 60 + START_MINUTE; // 390
    const scheduleEndMinutes = END_HOUR * 60; // 1320

    if (currentTotalMinutes < scheduleStartMinutes || currentTotalMinutes >= scheduleEndMinutes) {
        return null;
    }

    const firstFullSlotMinutes = 7 * 60; // 420
    const SPACER_HEIGHT_PX = 10;

    let position = HEADER_HEIGHT_PX;

    // 1. If in the 6:30 - 7:00 spacer
    if (currentTotalMinutes < firstFullSlotMinutes) {
        const minutesInSpacer = currentTotalMinutes - scheduleStartMinutes;
        const progress = minutesInSpacer / SLOT_DURATION_MINUTES;
        position += progress * SPACER_HEIGHT_PX;
        return position;
    }

    // 2. 7:00 AM onwards
    position += SPACER_HEIGHT_PX; // Drop past the spacer
    const minutesSince7AM = currentTotalMinutes - firstFullSlotMinutes;
    const full30MinSlotsPassed = Math.floor(minutesSince7AM / 30);
    const remainingMinutes = minutesSince7AM % 30;

    // Sum up the heights of all completely passed 30-min slots
    for (let i = 0; i < full30MinSlotsPassed; i++) {
        const slotRowIndex = i + 1; // +1 because row 0 is the spacer
        const isExpanded = expandedHourRowIndex !== null &&
            (slotRowIndex === expandedHourRowIndex || slotRowIndex === expandedHourRowIndex + 1);

        position += isExpanded ? EXPANDED_ROW_HEIGHT_PX : ROW_HEIGHT_PX;
    }

    // Calculate the pixels for the current partially-filled slot
    const currentSlotRowIndex = full30MinSlotsPassed + 1;
    const isCurrentExpanded = expandedHourRowIndex !== null &&
        (currentSlotRowIndex === expandedHourRowIndex || currentSlotRowIndex === expandedHourRowIndex + 1);

    const currentPixelsPerMinute = (isCurrentExpanded ? EXPANDED_ROW_HEIGHT_PX : ROW_HEIGHT_PX) / 30;
    position += remainingMinutes * currentPixelsPerMinute;

    return position;
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
const DayHeader = ({ day, index, isToday, isExpanded, onToggleExpand }) => (
    <div
        className={`sticky top-0 z-20 w-full flex items-center justify-center border-b border-border transition-colors ${index < 6 ? "border-r" : ""
            } ${isToday
                ? "bg-primary/5 text-primary border-b-2 border-b-primary"
                : "bg-card/95 backdrop-blur-sm text-foreground"
            }`}
        style={{ gridColumn: index + 2, gridRow: 1 }}
    >
        {/* Text stays perfectly in the center */}
        <span className={`text-sm font-semibold tracking-tight ${isToday ? "text-primary" : ""}`}>
            {day}
        </span>

        {/* Button is absolutely positioned to the right edge */}
        <button
            onClick={() => onToggleExpand(day)}
            className="absolute right-1.5 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            title={isExpanded ? "Collapse column" : "Expand column"}
        >
            {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
        </button>
    </div>
);

/**
 * Time slot label (Y-axis)
 */
const TimeSlotLabel = ({ timeSlot, rowIndex, isTopOfHour, isExpanded, onToggleExpand }) => {
    const isSpacer = rowIndex === 0;

    if (isSpacer) {
        return (
            <div
                className="sticky left-0 border-r-2 border-border bg-card"
                style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
            />
        );
    }

    if (!isTopOfHour) {
        return (
            <div
                className="sticky left-0 z-10 border-r-2 border-border bg-card/95 backdrop-blur-sm"
                style={{ gridColumn: 1, gridRow: rowIndex + 2 }}
            />
        );
    }

    const fullTime = convertToAMPM(timeSlot.start);
    const [time, period] = fullTime.split(" ");
    const hour = time.split(":")[0];

    return (
        <div
            className="group sticky left-0 z-[15] border-r-2 border-border bg-card flex items-center justify-center"
            style={{
                gridColumn: 1,
                gridRow: `${rowIndex + 2} / span 2`, // Spans 2 rows (the hour)
            }}
        >
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-md text-muted-foreground bg-card">
                {hour} <span className="text-[10px]">{period}</span>
            </span>

            <button
                onClick={() => onToggleExpand(rowIndex)}
                className={`p-1 rounded-md transition-all ${isExpanded
                    ? "opacity-100 text-foreground bg-black/5 dark:bg-white/10"
                    : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10"
                    }`}
                title={isExpanded ? "Collapse hour" : "Expand hour"}
            >
                {isExpanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
            </button>
        </div>
    );
};

/**
 * Individual grid cell
 * Solid border at top of hour (every 2 rows), dashed otherwise
 */

const GridCell = ({ rowIndex, colIndex, isToday }) => {
    const isSpacer = rowIndex === 0;
    const isHourBoundary = rowIndex % 2 === 0;

    return (
        <div
            className={cn(
                "transition-colors",
                isSpacer
                        ? ""
                        : isHourBoundary
                            ? "border-t [border-top-style:dashed]"
                            : "border-t border-border",
                colIndex < 6 && "border-r",
                isToday && "bg-primary/[0.02]"
            )}
            style={{
                gridColumn: colIndex + 2,
                gridRow: rowIndex + 2,
            }}
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
    const [expandedDay, setExpandedDay] = useState(null);
    const [expandedHour, setExpandedHour] = useState(null);

    const currentDay = useMemo(() => getCurrentDay(), []);
    const timeSlots = useMemo(() => generateTimeSlots(), []);

    // 2. Pass expandedHour to calculateTimeIndicatorPosition
    useEffect(() => {
        if (!showCurrentTime) return;

        setCurrentTimePosition(calculateTimeIndicatorPosition(expandedHour));

        const interval = setInterval(() => {
            setCurrentTimePosition(calculateTimeIndicatorPosition(expandedHour));
        }, 60000);

        return () => clearInterval(interval);
    }, [showCurrentTime, expandedHour]); // <-- Re-run if expandedHour changes

    const dayProperties = useMemo(
        () =>
            DAYS_OF_WEEK.map((day) => ({
                day,
                isToday: showCurrentDay ? day === currentDay : false,
            })),
        [currentDay, showCurrentDay]
    );

    // 2. Toggle function
    const handleToggleExpand = (day) => {
        setExpandedDay(prev => prev === day ? null : day);
    };

    // 3. Dynamically map columns instead of using `repeat(7, ...)`
    const dynamicColumns = dayProperties.map(({ day }) => {
        if (expandedDay === day) {
            return "minmax(280px, 2fr)"; // Expanded width
        }
        return `minmax(${CELL_MIN_WIDTH}, 1fr)`; // Default width
    }).join(" ");

    const gridTemplateColumns = `${TIME_COLUMN_WIDTH} ${dynamicColumns}`;

    const handleToggleExpandHour = (rowIndex) => {
        setExpandedHour(prev => prev === rowIndex ? null : rowIndex);
    };

    const dynamicRows = timeSlots.slice(1).map((_, index) => {
        const actualRowIndex = index + 1; // offset by 1 because we skipped the spacer

        // Since an hour is 2 slots, we expand the clicked row AND the one right after it
        if (expandedHour !== null && (actualRowIndex === expandedHour || actualRowIndex === expandedHour + 1)) {
            return `${EXPANDED_ROW_HEIGHT_PX}px`;
        }
        return `${ROW_HEIGHT_PX}px`;
    }).join(" ");

    const gridTemplateRows = `${HEADER_HEIGHT_PX}px 10px ${dynamicRows}`;

    return (
        <div className="relative w-full overflow-x-auto rounded-2xl border border-border shadow-sm bg-card no-scrollbar">
            <div
                className="grid bg-card transition-all duration-300 ease-in-out"
                style={{
                    gridTemplateColumns,
                    gridTemplateRows,
                }}
            >
                <TopLeftCorner />

                {/* 4. Pass props to DayHeader */}
                {dayProperties.map(({ day, isToday }, index) => (
                    <DayHeader
                        key={day}
                        day={day}
                        index={index}
                        isToday={isToday}
                        isExpanded={expandedDay === day}
                        onToggleExpand={handleToggleExpand}
                    />
                ))}

                {/* Time slots and grid cells */}
                {/* 5. Pass props to TimeSlotLabel */}
                {timeSlots.map((timeSlot, rowIndex) => (
                    <React.Fragment key={rowIndex}>
                        <TimeSlotLabel
                            timeSlot={timeSlot}
                            rowIndex={rowIndex}
                            isTopOfHour={timeSlot.start.endsWith(":00")}
                            isExpanded={expandedHour === rowIndex}
                            onToggleExpand={handleToggleExpandHour}
                        />

                        {/* GridCells */}
                        {dayProperties.map(({ isToday }, colIndex) => (
                            <GridCell
                                key={`${rowIndex}-${colIndex}`}
                                rowIndex={rowIndex}
                                colIndex={colIndex}
                                isToday={isToday}
                            />
                        ))}
                    </React.Fragment>
                ))}

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