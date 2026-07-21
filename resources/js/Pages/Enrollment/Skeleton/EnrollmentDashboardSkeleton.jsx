import React from 'react';
import { Card, CardContent, CardHeader } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';

export default function EnrollmentDashboardSkeleton() {
    // Hardcoded heights to simulate the curved area chart in the timeline without causing hydration issues
    const timelineHeights = ['60%', '80%', '30%', '55%', '10%', '35%', '15%', '12%', '8%', '15%', '65%', '5%'];

    // Dummy arrays for mapping skeletons
    const studentTypeBars = ['100%', '20%', '5%', '5%'];
    const genderBars = ['90%', '25%', '5%', '5%'];

    return (
        <div className="min-h-screen flex flex-col gap-4">

            {/* Top Banner: Semester */}
            <Card className="py-3 flex items-center justify-center">
                <Skeleton className="h-8 w-64 md:w-96" />
            </Card>

            {/* Sub Banner: Department */}
            <Card className="py-3 flex items-center justify-center">
                <Skeleton className="h-6 w-3/4 md:w-1/2" />
            </Card>

            {/* Top Grid: Stats and Bar Charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Total Enrolled Card */}
                <Card className="flex flex-col items-center justify-center p-8 max-h-[200px]">
                    <Skeleton className="h-5 w-32 mb-6" />
                    <Skeleton className="h-8 w-8 rounded-full mb-6" />
                    <Skeleton className="h-16 w-32 mb-4" />
                    <Skeleton className="h-4 w-24" />
                </Card>

                {/* Student Types Bar Chart */}
                <Card className="p-6 flex flex-col max-h-[200px]">
                    <Skeleton className="h-5 w-32 mb-8" />

                    <div className="flex-1 flex items-end justify-around border-b pb-2 relative">
                        {/* Grid Lines Simulation */}
                        <div className="absolute inset-0 flex flex-col justify-between border-l pointer-events-none">
                            <div className="w-full border-t h-0" />
                            <div className="w-full border-t h-0" />
                            <div className="w-full border-t h-0" />
                        </div>

                        {studentTypeBars.map((height, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 w-16 z-10">
                                <Skeleton className="h-4 w-8" />
                                <Skeleton className="w-full rounded-t-md" style={{ height }} />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-around mt-4">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-10" />
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                </Card>

                {/* Gender Statistics Bar Chart */}
                <Card className="p-6 flex flex-col max-h-[200px]">
                    <Skeleton className="h-5 w-40 mb-8" />

                    <div className="flex-1 flex items-end justify-around border-b pb-2 relative">
                        {/* Grid Lines Simulation */}
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                            <div className="w-full border-t h-0" />
                            <div className="w-full border-t h-0" />
                            <div className="w-full border-t h-0" />
                        </div>

                        {genderBars.map((height, i) => (
                            <div key={i} className="flex flex-col items-center w-16 z-10">
                                <Skeleton className="w-full rounded-t-md" style={{ height }} />
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-around mt-4 mb-6">
                        <Skeleton className="h-3 w-8" />
                        <Skeleton className="h-3 w-8" />
                        <Skeleton className="h-3 w-8" />
                        <Skeleton className="h-3 w-8" />
                    </div>

                    <div className="flex justify-center items-center gap-6 mt-auto">
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-3 w-3 rounded-sm" />
                            <Skeleton className="h-3 w-10" />
                        </div>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-3 w-3 rounded-sm" />
                            <Skeleton className="h-3 w-12" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Bottom Section: Enrollment Timeline */}
            <Card className="p-6">
                <CardHeader className="px-0 pt-0 pb-6">
                    <Skeleton className="h-5 w-40" />
                </CardHeader>

                <CardContent className="p-0">
                    <div className="flex items-end h-[300px] border-b border-l relative">
                        {/* Y-axis Labels */}
                        <div className="absolute -left-6 inset-y-0 flex flex-col justify-between py-2">
                            <Skeleton className="h-3 w-4" />
                            <Skeleton className="h-3 w-4" />
                            <Skeleton className="h-3 w-4" />
                            <Skeleton className="h-3 w-4" />
                            <Skeleton className="h-3 w-4" />
                        </div>

                        {/* Chart Area Simulation */}
                        <div className="w-full h-full flex items-end gap-1 px-1 opacity-50">
                            {timelineHeights.map((height, i) => (
                                <Skeleton
                                    key={i}
                                    className="flex-1 rounded-t-sm transition-all"
                                    style={{ height }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* X-axis Labels */}
                    <div className="flex justify-between mt-4 pl-2">
                        {timelineHeights.map((_, i) => (
                            <Skeleton key={i} className="h-3 w-10" />
                        ))}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}