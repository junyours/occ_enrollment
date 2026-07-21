import React from 'react';
import { Card, CardContent } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';

export default function TimetableSkeleton() {
    // Generate 16 empty time slots (representing 30-min intervals)
    // 16 slots * 40px height = 640px total grid height
    const timeSlots = Array.from({ length: 16 });
    const days = Array.from({ length: 7 });

    // Pre-calculated absolute positions to mimic the schedule blocks from the image
    // using 40px as the base height for 1 row (30 mins)
    const scheduleBlocks = [
        // Monday
        [
            { top: 40, height: 120 },
            { top: 160, height: 240 },
            { top: 400, height: 120 },
            { top: 520, height: 120 },
        ],
        // Tuesday
        [
            { top: 40, height: 120 },
            { top: 160, height: 240 },
            { top: 400, height: 120 },
            { top: 520, height: 120 },
        ],
        // Wednesday
        [
            { top: 40, height: 120 },
            { top: 160, height: 240 },
            { top: 400, height: 120 },
            { top: 520, height: 120 },
        ],
        // Thursday
        [
            { top: 40, height: 120 },
            { top: 160, height: 240 },
            { top: 400, height: 120 },
            { top: 520, height: 120 },
        ],
        // Friday
        [
            { top: 120, height: 160 },
        ],
        // Saturday
        [
            { top: 160, height: 280 },
            { top: 480, height: 160 },
        ],
        // Sunday
        [
            { top: 40, height: 320 },
            { top: 400, height: 240 },
        ],
    ];

    return (
        <Card>
            <CardContent className="pt-4">
                <div className="flex flex-col gap-4">
                    {/* Top Header Section */}
                    <div className="mb-2">
                        <Skeleton className="h-10 w-64" />
                    </div>

                    {/* Main Timetable Card */}
                    <Card className="pt-0 overflow-hidden rounded-none">
                        <CardContent className="p-0">
                            <div className="flex flex-col w-full">

                                {/* Grid Header (Time + Days) */}
                                <div className="flex border-b ">
                                    {/* Time Column Header */}
                                    <div className="w-24 border-r py-4 flex justify-center items-center">
                                        <Skeleton className="h-4 w-12" />
                                    </div>

                                    {/* Day Column Headers */}
                                    <div className="flex-1 flex divide-x">
                                        {days.map((_, i) => (
                                            <div key={`day-header-${i}`} className="flex-1 py-4 flex justify-center items-center">
                                                <Skeleton className="h-4 w-20" />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Grid Body */}
                                <div className="flex relative h-[640px]">

                                    {/* Left Axis: Time Slots */}
                                    <div className="w-24 border-r flex flex-col z-20">
                                        {timeSlots.map((_, i) => (
                                            <div
                                                key={`time-${i}`}
                                                className="h-10 border-b flex items-center justify-center"
                                            >
                                                <Skeleton className="h-3 w-14" />
                                            </div>
                                        ))}
                                    </div>

                                    {/* Right Area: Schedule Grid */}
                                    <div className="flex-1 relative">

                                        {/* Background Horizontal Grid Lines */}
                                        <div className="absolute inset-0 flex flex-col pointer-events-none z-0">
                                            {timeSlots.map((_, i) => (
                                                <div key={`hline-${i}`} className="h-10 border-b" />
                                            ))}
                                        </div>

                                        {/* Vertical Day Columns & Blocks */}
                                        <div className="absolute inset-0 flex divide-x z-10">
                                            {scheduleBlocks.map((dayBlocks, colIndex) => (
                                                <div key={`col-${colIndex}`} className="flex-1 relative">
                                                    {/* Render scheduled blocks for this column */}
                                                    {dayBlocks.map((block, blockIndex) => (
                                                        <div
                                                            key={`block-${colIndex}-${blockIndex}`}
                                                            className="absolute inset-x-1 p-1"
                                                            style={{
                                                                top: `${block.top}px`,
                                                                height: `${block.height}px`
                                                            }}
                                                        >
                                                            <Skeleton className="w-full h-full rounded-md" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>

                                    </div>
                                </div>

                            </div>
                        </CardContent>
                    </Card>
                </div>
            </CardContent>
        </Card>
    );
}