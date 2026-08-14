import React from 'react';
import { Card, CardContent, CardHeader } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';

export default function EnrollmentDashboardSkeleton() {
    return (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full font-sans'>

            {/* --- Row 1 --- */}

            {/* 1. Total Enrolled Stat Card */}
            <Card className="flex flex-col justify-center bg-card border-border shadow-sm min-h-[320px]">
                <CardContent className="flex items-center justify-center gap-8 p-6">
                    <div className="flex flex-col items-center">
                        <Skeleton className="h-4 w-28 mb-4 bg-muted" />
                        <Skeleton className="h-12 w-32 mb-3 bg-muted" />
                        <Skeleton className="h-3 w-40 bg-muted" />
                    </div>
                    <Skeleton className="h-14 w-14 rounded-xl bg-muted/60" />
                </CardContent>
            </Card>

            {/* 2. Departments Bar Chart */}
            <Card className="flex flex-col bg-card border-border shadow-sm min-h-[320px]">
                <CardHeader className="pb-2 pt-6 px-6">
                    <Skeleton className="h-4 w-28 bg-muted" />
                </CardHeader>
                <CardContent className="flex-1 flex items-end justify-around p-6 relative">
                    {/* Background Grid Lines */}
                    <div className="absolute inset-x-6 inset-y-10 flex flex-col justify-between pointer-events-none">
                        <div className="border-t border-border/40 w-full" />
                        <div className="border-t border-border/40 w-full" />
                        <div className="border-t border-border/40 w-full" />
                    </div>

                    {/* 3 Bars */}
                    {[40, 35, 90].map((height, i) => (
                        <div key={i} className="flex flex-col items-center w-[25%] z-10 gap-2">
                            <Skeleton className="h-3 w-10 bg-muted" />
                            <Skeleton className="w-full rounded-t-md bg-muted" style={{ height: `${height}%` }} />
                            <Skeleton className="h-3 w-12 mt-1 bg-muted" />
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* 3. Program Enrollments Bar Chart */}
            <Card className="flex flex-col bg-card border-border shadow-sm min-h-[320px]">
                <CardHeader className="pb-2 pt-6 px-6">
                    <Skeleton className="h-4 w-40 bg-muted" />
                </CardHeader>
                <CardContent className="flex-1 flex items-end justify-around p-6 relative">
                    <div className="absolute inset-x-6 inset-y-10 flex flex-col justify-between pointer-events-none">
                        <div className="border-t border-border/40 w-full" />
                        <div className="border-t border-border/40 w-full" />
                        <div className="border-t border-border/40 w-full" />
                    </div>

                    {/* 5 Bars */}
                    {[85, 45, 40, 95, 90].map((height, i) => (
                        <div key={i} className="flex flex-col items-center w-[15%] z-10 gap-2">
                            <Skeleton className="h-3 w-8 bg-muted" />
                            <Skeleton className="w-full rounded-t-md bg-muted" style={{ height: `${height}%` }} />
                            <Skeleton className="h-3 w-10 mt-1 bg-muted" />
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* --- Row 2 --- */}

            {/* 4. Year Level Bar Chart */}
            <Card className="flex flex-col bg-card border-border shadow-sm min-h-[320px]">
                <CardHeader className="pb-2 pt-6 px-6">
                    <Skeleton className="h-4 w-24 bg-muted" />
                </CardHeader>
                <CardContent className="flex-1 flex items-end justify-around p-6 pt-10">
                    {/* 4 Bars */}
                    {[70, 50, 40, 38].map((height, i) => (
                        <div key={i} className="flex flex-col items-center w-[20%] gap-2">
                            <Skeleton className="h-3 w-10 bg-muted" />
                            <Skeleton className="w-full rounded-t-md bg-muted" style={{ height: `${height}%` }} />
                            <Skeleton className="h-3 w-8 mt-1 bg-muted" />
                        </div>
                    ))}
                </CardContent>
            </Card>

            {/* 5. Gender Donut Chart */}
            <Card className="flex flex-col bg-card border-border shadow-sm min-h-[320px]">
                <CardHeader className="pb-2 pt-6 px-6">
                    <Skeleton className="h-4 w-20 bg-muted" />
                </CardHeader>
                <CardContent className="flex-1 flex flex-col items-center justify-center p-6">
                    <Skeleton className="h-4 w-12 mb-3 bg-muted" />

                    {/* Donut Chart Simulation */}
                    <div className="relative h-44 w-44">
                        <Skeleton className="absolute inset-0 rounded-full bg-muted/60" />
                        {/* Inner cut-out for donut hole */}
                        <div className="absolute inset-5 rounded-full bg-card flex flex-col items-center justify-center gap-1.5">
                            <Skeleton className="h-6 w-16 bg-muted" />
                            <Skeleton className="h-3 w-10 bg-muted" />
                        </div>
                    </div>

                    <Skeleton className="h-4 w-14 mt-3 bg-muted" />
                </CardContent>
            </Card>

            {/* 6. Student Types Horizontal Stacked Bar */}
            <Card className="flex flex-col bg-card border-border shadow-sm min-h-[320px]">
                <CardHeader className="pb-0 pt-6 px-6">
                    <Skeleton className="h-4 w-28 mb-2 bg-muted" />
                    <Skeleton className="h-3 w-32 bg-muted/70" />
                </CardHeader>
                <CardContent className="flex flex-col p-6 pt-4">

                    {/* Horizontal Stacked Bar */}
                    <div className="flex h-20 w-full rounded-sm overflow-hidden mb-8 gap-0.5">
                        <Skeleton className="h-full w-[64%] rounded-none bg-muted/80" />
                        <Skeleton className="h-full w-[34%] rounded-none bg-muted/60" />
                        <Skeleton className="h-full w-[1%] rounded-none bg-muted" />
                        <Skeleton className="h-full w-[1%] rounded-none bg-muted" />
                    </div>

                    {/* Legend Grid */}
                    <div className="grid grid-cols-4 gap-4 pt-4 border-t border-border/50">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-3 w-3 rounded-sm bg-muted shrink-0" />
                                    <Skeleton className="h-3 w-16 bg-muted" />
                                </div>
                                <Skeleton className="h-3 w-20 bg-muted/70" />
                                <Skeleton className="h-3 w-8 bg-muted" />
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* --- Row 3 (Spans all columns) --- */}

            {/* 7. Cumulative Enrollment Timeline */}
            <Card className="col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col bg-card border-border shadow-sm min-h-[450px]">
                <CardHeader className="pb-4 pt-6 px-6">
                    <Skeleton className="h-4 w-64 bg-muted" />
                </CardHeader>
                <CardContent className="flex-1 flex p-6 pt-0">

                    {/* Y-Axis Labels */}
                    <div className="flex flex-col justify-between items-end pr-4 h-[320px] py-2 border-r border-border/50">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <Skeleton key={i} className="h-3 w-10 bg-muted" />
                        ))}
                    </div>

                    {/* Chart Area */}
                    <div className="flex-1 h-[320px] relative ml-4">
                        {/* Simulating an upward trending area chart */}
                        <div className="absolute bottom-0 left-0 right-0 h-full flex items-end overflow-hidden">
                            {/* Stepped skeletons to mimic area curve */}
                            <Skeleton className="w-[10%] h-[10%] rounded-tr-md rounded-bl-none rounded-br-none bg-muted/40" />
                            <Skeleton className="w-[15%] h-[25%] rounded-tr-md rounded-tl-none rounded-b-none bg-muted/40 -ml-1" />
                            <Skeleton className="w-[20%] h-[35%] rounded-tr-md rounded-tl-none rounded-b-none bg-muted/40 -ml-1" />
                            <Skeleton className="w-[20%] h-[55%] rounded-tr-md rounded-tl-none rounded-b-none bg-muted/40 -ml-1" />
                            <Skeleton className="w-[20%] h-[75%] rounded-tr-md rounded-tl-none rounded-b-none bg-muted/40 -ml-1" />
                            <Skeleton className="w-[15%] h-[95%] rounded-tr-md rounded-tl-none rounded-b-none bg-muted/40 -ml-1" />
                        </div>

                        {/* X-Axis Labels */}
                        <div className="absolute -bottom-8 left-0 right-0 flex justify-between">
                            {Array.from({ length: 15 }).map((_, i) => (
                                <Skeleton key={i} className="h-3 w-10 bg-muted" />
                            ))}
                        </div>
                    </div>

                </CardContent>
            </Card>

        </div>
    );
}