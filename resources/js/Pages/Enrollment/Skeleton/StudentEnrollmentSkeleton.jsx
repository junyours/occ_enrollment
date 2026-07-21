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

export default function StudentEnrollmentSkeleton() {
    // Generate 8 empty rows for the enrolled classes table
    const enrolledClassRows = Array.from({ length: 8 });

    return (
        <div className="min-h-screen bg-background font-sans text-foreground">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* Top Header Card */}
                <Card className="border-border shadow-sm rounded-lg flex items-center justify-center py-4">
                    <Skeleton className="h-8 w-48 bg-muted" />
                </Card>

                {/* Student Info Section */}
                <Card className="border-border shadow-sm rounded-lg">
                    <CardHeader className="pb-4">
                        <div className="flex items-baseline gap-3">
                            <Skeleton className="h-7 w-32 bg-muted" />
                            <Skeleton className="h-4 w-72 bg-muted" />
                        </div>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-6">
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24 bg-muted" />
                            <Skeleton className="h-10 w-48 bg-muted rounded-md" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24 bg-muted" />
                            <Skeleton className="h-10 w-48 bg-muted rounded-md" />
                        </div>
                    </CardContent>
                </Card>

                {/* Student Classes Section */}
                <Card className="border-border shadow-sm rounded-lg">
                    <CardHeader className="flex flex-row items-center justify-between pb-4">
                        <div className="flex items-baseline gap-3">
                            <Skeleton className="h-7 w-40 bg-muted" />
                            <Skeleton className="h-4 w-64 bg-muted hidden sm:block" />
                        </div>
                        <div className="flex items-center gap-4">
                            <Skeleton className="h-6 w-6 bg-muted rounded-sm" /> {/* Filter Icon */}
                            <div className="flex bg-muted rounded-md p-1">
                                <Skeleton className="h-8 w-24 bg-background rounded-sm" /> {/* Tabular Tab */}
                                <Skeleton className="h-8 w-24 bg-transparent rounded-sm" /> {/* Timetable Tab */}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="border border-border rounded-md overflow-hidden">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="w-[120px] py-3"><Skeleton className="h-4 w-20" /></TableHead>
                                        <TableHead className="py-3"><Skeleton className="h-4 w-32" /></TableHead>
                                        <TableHead className="w-[100px] py-3"><Skeleton className="h-4 w-16" /></TableHead>
                                        <TableHead className="w-[120px] py-3"><Skeleton className="h-4 w-12" /></TableHead>
                                        <TableHead className="w-[200px] py-3"><Skeleton className="h-4 w-16" /></TableHead>
                                        <TableHead className="w-[80px] py-3"><Skeleton className="h-4 w-10" /></TableHead>
                                        <TableHead className="w-[50px] py-3"></TableHead> {/* Action column */}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {enrolledClassRows.map((_, index) => (
                                        <TableRow key={index} className="border-border/50 hover:bg-transparent">
                                            <TableCell className="py-4"><Skeleton className="h-4 w-16 bg-muted" /></TableCell>
                                            <TableCell className="py-4"><Skeleton className="h-4 w-48 bg-muted" /></TableCell>
                                            <TableCell className="py-4"><Skeleton className="h-4 w-8 bg-muted" /></TableCell>
                                            <TableCell className="py-4"><Skeleton className="h-4 w-16 bg-muted" /></TableCell>
                                            <TableCell className="py-4">
                                                <div className="space-y-1.5">
                                                    <Skeleton className="h-3 w-32 bg-muted" />
                                                    <Skeleton className="h-3 w-32 bg-muted" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4"><Skeleton className="h-4 w-6 bg-muted" /></TableCell>
                                            <TableCell className="py-4 text-right"><Skeleton className="h-5 w-5 bg-muted rounded-full ml-auto" /></TableCell>
                                        </TableRow>
                                    ))}
                                    {/* Footer Row for Total Units */}
                                    <TableRow className="border-border hover:bg-transparent bg-muted/10">
                                        <TableCell colSpan={5} className="py-4 text-right">
                                            <div className="flex justify-end pr-8">
                                                <Skeleton className="h-4 w-20 bg-muted" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Skeleton className="h-4 w-8 bg-muted" />
                                        </TableCell>
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>

                        <Skeleton className="h-10 w-32 bg-primary/20 rounded-md mt-4" /> {/* Enroll Button */}
                    </CardContent>
                </Card>

                {/* Search Classes Section */}
                <Card className="border-border shadow-sm rounded-lg pb-6">
                    <CardHeader className="pb-4">
                        <div className="flex items-baseline gap-3">
                            <Skeleton className="h-7 w-40 bg-muted" />
                            <Skeleton className="h-4 w-80 bg-muted hidden sm:block" />
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Alert / Note Banner */}
                        <Skeleton className="h-8 w-full bg-muted rounded-md" />

                        {/* Search Input */}
                        <Skeleton className="h-10 w-full bg-muted rounded-md border-border border" />

                        {/* Search Results Table */}
                        <div className="border border-border rounded-md overflow-hidden mt-4">
                            <Table>
                                <TableHeader className="bg-muted/30">
                                    <TableRow className="border-border hover:bg-transparent">
                                        <TableHead className="w-[150px] py-3"><Skeleton className="h-4 w-24" /></TableHead>
                                        <TableHead className="w-[120px] py-3"><Skeleton className="h-4 w-20" /></TableHead>
                                        <TableHead className="py-3"><Skeleton className="h-4 w-32" /></TableHead>
                                        <TableHead className="w-[100px] py-3"><Skeleton className="h-4 w-16" /></TableHead>
                                        <TableHead className="w-[120px] py-3"><Skeleton className="h-4 w-12" /></TableHead>
                                        <TableHead className="w-[150px] py-3"><Skeleton className="h-4 w-16" /></TableHead>
                                        <TableHead className="w-[80px] py-3"><Skeleton className="h-4 w-10" /></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {/* Empty State Row */}
                                    <TableRow className="hover:bg-transparent">
                                        <TableCell colSpan={7} className="py-8 text-center h-24">
                                            <div className="flex justify-center w-full">
                                                <Skeleton className="h-4 w-24 bg-muted" />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}