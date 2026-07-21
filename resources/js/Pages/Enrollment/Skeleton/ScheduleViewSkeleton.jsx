import React from 'react';
import { Card, CardContent } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';

export default function ScheduleViewSkeleton() {
    // Generate 12 empty rows to match the table height in the image
    const skeletonRows = Array.from({ length: 12 });

    return (
        <div className="min-h-screen flex flex-col gap-4">

            {/* Top Toolbar Container */}
            <Card className="p-2">
                <div className="flex items-center gap-4">
                    {/* View Toggle (Tabular / Timetable) */}
                    <div className="flex rounded-md p-1">
                        <Skeleton className="h-8 w-24 rounded-sm" />
                        <Skeleton className="h-8 w-24 bg-transparent rounded-sm" />
                    </div>

                    {/* Export Buttons */}
                    <Skeleton className="h-9 w-24 rounded-md" /> {/* Excel */}
                    <Skeleton className="h-9 w-24 rounded-md" /> {/* Image */}

                    {/* Color Toggle Switch */}
                    <Skeleton className="h-6 w-11 rounded-full" />
                    <Skeleton className="h-4 w-12" />
                </div>
            </Card>

            {/* Main Schedule Table Card */}
            <Card className="pt-6 pb-2">
                <CardContent>
                    {/* Section Title */}
                    <Skeleton className="h-8 w-48 mb-6" />

                    {/* Data Table Skeleton */}
                    <div className="rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[120px]">
                                        <Skeleton className="h-4 w-20" />
                                    </TableHead>
                                    <TableHead className="w-[300px]">
                                        <Skeleton className="h-4 w-32" />
                                    </TableHead>
                                    <TableHead className="w-[150px]">
                                        <Skeleton className="h-4 w-12" />
                                    </TableHead>
                                    <TableHead className="w-[200px]">
                                        <Skeleton className="h-4 w-12" />
                                    </TableHead>
                                    <TableHead className="w-[100px]">
                                        <Skeleton className="h-4 w-12" />
                                    </TableHead>
                                    <TableHead>
                                        <Skeleton className="h-4 w-20" />
                                    </TableHead>
                                    <TableHead className="w-[80px] text-right">
                                        {/* Empty header for actions */}
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {skeletonRows.map((_, index) => (
                                    <TableRow
                                        key={index}
                                        className="hover:bg-transparent border-b last:border-0"
                                    >
                                        {/* Subject Code */}
                                        <TableCell className="py-4">
                                            <Skeleton className="h-4 w-16" />
                                        </TableCell>

                                        {/* Descriptive Title */}
                                        <TableCell className="py-4">
                                            <Skeleton className="h-4 w-64" />
                                        </TableCell>

                                        {/* Day */}
                                        <TableCell className="py-4">
                                            <Skeleton className="h-4 w-12" />
                                        </TableCell>

                                        {/* Time */}
                                        <TableCell className="py-4">
                                            <Skeleton className="h-4 w-32" />
                                        </TableCell>

                                        {/* Room */}
                                        <TableCell className="py-4">
                                            <Skeleton className="h-4 w-10" />
                                        </TableCell>

                                        {/* Instructor */}
                                        <TableCell className="py-4">
                                            <Skeleton className="h-4 w-32" />
                                        </TableCell>

                                        {/* Actions (Edit / Delete Icons) */}
                                        <TableCell className="py-4 text-right">
                                            <div className="flex justify-end gap-3">
                                                <Skeleton className="h-4 w-4" />
                                                <Skeleton className="h-4 w-4" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Bottom Action Button */}
            <div className="mt-2">
                <Skeleton className="h-10 w-32 rounded-md" />
            </div>

        </div>
    );
}