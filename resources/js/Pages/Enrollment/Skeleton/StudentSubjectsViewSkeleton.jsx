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

export default function StudentSubjectsViewSkeleton() {
    // Generate 8 empty rows to match the specific table height in image_c337bc.png
    const subjectRows = Array.from({ length: 8 });

    return (
        <div className="bg-background font-sans text-foreground">
            <div className="mx-auto space-y-4">

                {/* Top Banner: Section Name (e.g., BSIT - 1A) */}
                <Card className="border-border shadow-sm flex items-center justify-center py-2 rounded-lg">
                    <Skeleton className="h-8 w-32 bg-muted" />
                </Card>

                {/* Sub Banner: Student Name */}
                <Card className="border-border shadow-sm p-4 py-2 rounded-lg">
                    <Skeleton className="h-9 w-64 md:w-80 bg-muted" />
                </Card>

                {/* Toolbar: View Toggles & Actions */}
                <div className="flex items-center justify-between py-2">
                    {/* View Toggle (Tabular / Timetable) */}
                    <div className="flex bg-muted rounded-md p-1 border border-border/50">
                        <Skeleton className="h-9 w-24 bg-background shadow-sm rounded-sm" />
                        <Skeleton className="h-9 w-24 bg-transparent rounded-sm" />
                    </div>

                    {/* Edit Subjects Button */}
                    <Skeleton className="h-10 w-32 bg-background border border-border shadow-sm rounded-md" />
                </div>

                {/* Main Card: Current Subjects */}
                <Card className="border-border shadow-sm rounded-lg">
                    <CardHeader className="pb-4">
                        <Skeleton className="h-8 w-48 bg-muted" />
                    </CardHeader>

                    <CardContent className="pt-0">
                        <div className="overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border/50 hover:bg-transparent">
                                        <TableHead className="py-3 h-auto">
                                            <Skeleton className="h-4 w-32 bg-muted/70" />
                                        </TableHead>
                                        <TableHead className="w-[150px] py-3 h-auto">
                                            <Skeleton className="h-4 w-12 bg-muted/70" />
                                        </TableHead>
                                        <TableHead className="w-[200px] py-3 h-auto">
                                            <Skeleton className="h-4 w-12 bg-muted/70" />
                                        </TableHead>
                                        <TableHead className="w-[80px] py-3 h-auto text-right">
                                            <Skeleton className="h-4 w-10 bg-muted/70 ml-auto" />
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subjectRows.map((_, index) => {
                                        // Simulate the stacked schedule blocks seen in rows 6 and 8 of the image
                                        const isStacked = index === 5 || index === 7;

                                        return (
                                            <TableRow
                                                key={index}
                                                className="border-border/50 hover:bg-transparent"
                                            >
                                                {/* Descriptive Title */}
                                                <TableCell className="py-4 align-top">
                                                    <Skeleton className="h-4 w-[60%] md:w-[75%] bg-muted mt-1" />
                                                </TableCell>

                                                {/* Day */}
                                                <TableCell className="py-4 align-top">
                                                    <div className="space-y-2 mt-1">
                                                        <Skeleton className="h-4 w-16 bg-muted" />
                                                        {isStacked && <Skeleton className="h-4 w-16 bg-muted" />}
                                                    </div>
                                                </TableCell>

                                                {/* Time */}
                                                <TableCell className="py-4 align-top">
                                                    <div className="space-y-2 mt-1">
                                                        <Skeleton className="h-4 w-32 bg-muted" />
                                                        {isStacked && <Skeleton className="h-4 w-32 bg-muted" />}
                                                    </div>
                                                </TableCell>

                                                {/* Units */}
                                                <TableCell className="py-4 text-right align-top">
                                                    <Skeleton className="h-4 w-4 bg-muted ml-auto mt-1" />
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}