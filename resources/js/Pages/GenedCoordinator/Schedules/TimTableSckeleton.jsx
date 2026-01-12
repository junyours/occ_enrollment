import React from 'react';

const TimeTableSkeleton = () => {
    const Blink = ({ className }) => (
        <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
    );

    return (
        <div className="max-w-6xl mx-auto p-4 bg-white border rounded-lg shadow-sm">
            {/* Header Info */}
            <div className="flex items-center gap-4 mb-4 border-b pb-4">
                <Blink className="h-8 w-64" /> {/* Name */}
                <Blink className="h-8 w-16" /> {/* Total Hours */}
            </div>

            {/* Timetable Grid */}
            <div className="grid grid-cols-8 border border-gray-300">
                {/* Days Header */}
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="border p-2 bg-gray-50">
                        <Blink className="h-4 w-full" />
                    </div>
                ))}

                {/* Time Slots (Rows) */}
                {[...Array(12)].map((_, rowIdx) => (
                    <React.Fragment key={rowIdx}>
                        {/* Time Column */}
                        <div className="border p-2"><Blink className="h-4 w-full" /></div>

                        {/* Day Columns */}
                        {[...Array(7)].map((_, colIdx) => (
                            <div key={colIdx} className="border p-1 h-16 relative">
                                {/* Randomly place "Course Blocks" to mimic the visual density */}
                                {(rowIdx + colIdx) % 5 === 0 && (
                                    <div className="absolute inset-1 flex flex-col gap-1">
                                        <Blink className="h-full w-full opacity-60" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default TimeTableSkeleton;