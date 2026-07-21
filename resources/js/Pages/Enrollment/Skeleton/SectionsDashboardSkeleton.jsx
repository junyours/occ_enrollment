import React from 'react';
import { Card, CardContent, CardHeader } from '@/Components/ui/card';
import { Skeleton } from '@/Components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table';

const YearCardSkeleton = () => {
    // Generate 5 empty rows to simulate the table layout while loading
    const skeletonRows = Array.from({ length: 5 });

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
                {/* Title Skeleton */}
                <Skeleton className="h-7 w-32" />
                {/* Add Button Skeleton */}
                <Skeleton className="h-10 w-28" />
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-4">
                {/* Toolbar Skeleton */}
                <div className="flex items-center gap-2">
                    {/* Search Input Skeleton */}
                    <Skeleton className="h-10 flex-1" />
                    {/* Filter Button Skeleton */}
                    <Skeleton className="h-10 w-10" />
                    {/* Select Dropdown Skeleton */}
                    <Skeleton className="h-10 w-[180px]" />
                </div>

                {/* Data Table Skeleton */}
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[100px]">
                                    <Skeleton className="h-4 w-16" />
                                </TableHead>
                                <TableHead>
                                    <Skeleton className="h-4 w-20" />
                                </TableHead>
                                <TableHead className="text-right">
                                    <Skeleton className="h-4 w-16 ml-auto" />
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {skeletonRows.map((_, index) => (
                                <TableRow key={index} className="hover:bg-transparent border-b last:border-0">
                                    {/* Section Name Skeleton */}
                                    <TableCell>
                                        <Skeleton className="h-5 w-8" />
                                    </TableCell>

                                    {/* Capacity & Progress Skeleton */}
                                    <TableCell>
                                        <div className="flex flex-col gap-2 w-[80%]">
                                            <div className="flex justify-between">
                                                <Skeleton className="h-3 w-12" />
                                                <Skeleton className="h-3 w-8" />
                                            </div>
                                            <Skeleton className="h-1.5 w-full rounded-full" />
                                        </div>
                                    </TableCell>

                                    {/* Actions Skeleton */}
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                            <Skeleton className="h-8 w-8 rounded-md" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

// Main Dashboard Skeleton Wrapper
export default function SectionsDashboardSkeleton() {
    // 4 cards to match the 2x2 grid from the original layout
    const skeletonCards = Array.from({ length: 4 });

    return (
        <div className="min-h-screen bg-blac">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
                {skeletonCards.map((_, index) => (
                    <YearCardSkeleton key={index} />
                ))}
            </div>
        </div>
    );
}