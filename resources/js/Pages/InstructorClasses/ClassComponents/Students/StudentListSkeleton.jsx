import React from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Card } from '@/Components/ui/card';

export default function StudentListSkeleton() {
    const skeletonRows = Array.from({ length: 10 });

    return (
        <div className="space-y-4">
            {/* Top Toolbar Skeleton: Search & Items Per Page */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                {/* Search input skeleton */}
                <div className="h-10 w-full sm:w-72 bg-muted animate-pulse rounded-md"></div>

                {/* Rows per page skeleton */}
                <div className="flex items-center gap-2">
                    <div className="h-5 w-24 bg-muted animate-pulse rounded"></div>
                    <div className="h-10 w-16 bg-muted animate-pulse rounded-md"></div>
                </div>
            </div>

            {/* Table Skeleton */}
            <div className="overflow-x-auto">
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead className="w-32">ID no</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="hidden lg:table-cell">Email</TableHead>
                                <TableHead className="hidden lg:table-cell">Contact no</TableHead>
                                <TableHead className="hidden sm:table-cell">Gender</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {skeletonRows.map((_, index) => (
                                <TableRow key={index}>
                                    {/* Number */}
                                    <TableCell>
                                        <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
                                    </TableCell>
                                    {/* ID No */}
                                    <TableCell>
                                        <div className="h-4 w-20 bg-muted animate-pulse rounded"></div>
                                    </TableCell>
                                    {/* Name */}
                                    <TableCell>
                                        <div className="h-4 w-40 bg-muted animate-pulse rounded"></div>
                                    </TableCell>
                                    {/* Email */}
                                    <TableCell className="hidden lg:table-cell">
                                        <div className="h-4 w-48 bg-muted animate-pulse rounded"></div>
                                    </TableCell>
                                    {/* Contact No */}
                                    <TableCell className="hidden lg:table-cell">
                                        <div className="h-4 w-24 bg-muted animate-pulse rounded"></div>
                                    </TableCell>
                                    {/* Gender Badge */}
                                    <TableCell className="hidden sm:table-cell">
                                        <div className="h-5 w-16 bg-muted animate-pulse rounded-full"></div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* Bottom Toolbar: Pagination Controls Skeleton */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* "Showing entries" text skeleton */}
                <div className="h-5 w-56 bg-muted animate-pulse rounded"></div>

                {/* Pagination buttons skeleton */}
                <div className="flex gap-2 items-center">
                    <div className="h-8 w-20 bg-muted animate-pulse rounded-md"></div>
                    <div className="h-5 w-24 bg-muted animate-pulse rounded"></div>
                    <div className="h-8 w-20 bg-muted animate-pulse rounded-md"></div>
                </div>
            </div>
        </div>
    );
}
