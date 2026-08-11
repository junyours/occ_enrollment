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
import { getRandomNumber } from "@/Lib/Utils";

export default function ClassListSkeleton() {
    const classRows = Array.from({ length: 10 });

    return (
        <>
            <Card className="border-border shadow-sm rounded-lg overflow-hidden bg-card font-sans text-foreground hidden md:block">
                {/* Header for "Class List" title */}
                <CardHeader className="py-6 pb-4">
                    <Skeleton className="h-7 w-32 bg-muted" />
                </CardHeader>

                <CardContent className="p-0 sm:p-6 sm:pt-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-border/50 hover:bg-transparent">
                                    {/* Subject */}
                                    <TableHead className="w-[35%] py-4 h-auto">
                                        <Skeleton className="h-4 w-16 bg-muted/70" />
                                    </TableHead>

                                    {/* Day */}
                                    <TableHead className="w-[15%] py-4 h-auto">
                                        <Skeleton className="h-4 w-10 bg-muted/70" />
                                    </TableHead>

                                    {/* Time */}
                                    <TableHead className="w-[20%] py-4 h-auto">
                                        <Skeleton className="h-4 w-12 bg-muted/70" />
                                    </TableHead>

                                    {/* Room */}
                                    <TableHead className="w-[10%] py-4 h-auto">
                                        <Skeleton className="h-4 w-12 bg-muted/70" />
                                    </TableHead>

                                    {/* Instructor */}
                                    <TableHead className="w-[20%] py-4 h-auto">
                                        <Skeleton className="h-4 w-20 bg-muted/70" />
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {classRows.map((_, index) => (
                                    <TableRow
                                        key={index}
                                        className="border-border/20 hover:bg-transparent"
                                    >
                                        {/* Subject Title */}
                                        <TableCell className="py-4">
                                            <Skeleton className="h-4 w-[75%] md:w-[60%] bg-muted" />
                                        </TableCell>

                                        {/* Day */}
                                        <TableCell className="py-4">
                                            <Skeleton className="h-4 w-16 bg-muted" />
                                        </TableCell>

                                        {/* Time */}
                                        <TableCell className="py-4">
                                            <Skeleton className="h-4 w-32 bg-muted" />
                                        </TableCell>

                                        {/* Room */}
                                        <TableCell className="py-4">
                                            <Skeleton className="h-4 w-10 bg-muted" />
                                        </TableCell>

                                        {/* Instructor */}
                                        <TableCell className="py-4">
                                            <Skeleton className="h-4 w-32 bg-muted" />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <div className="flex flex-col gap-4 font-sans text-foreground md:hidden">
                {Array.from({ length: getRandomNumber(5, 8) }).map((_, index) => (
                    <Card key={index} className="bg-card border-border shadow-sm rounded-xl">
                        <CardContent className="p-5 flex flex-col gap-4">

                            {/* Top Section: Subject Title and Day */}
                            <div className="flex flex-col gap-2.5">
                                {/* Subject Title with left indicator dot */}
                                <div className="flex items-center gap-3">
                                    <Skeleton className="h-3 w-3 rounded-full bg-muted-foreground/30 shrink-0" />
                                    <Skeleton className="h-5 w-[80%] max-w-[280px] bg-muted" />
                                </div>

                                {/* Calendar Icon & Day (Indented) */}
                                <div className="flex items-center gap-2 ml-6">
                                    <Skeleton className="h-3.5 w-3.5 rounded-sm bg-muted-foreground/30 shrink-0" />
                                    <Skeleton className="h-4 w-24 bg-muted" />
                                </div>
                            </div>

                            {/* Middle Section: Time and Room (Indented) */}
                            <div className="flex items-center gap-8 ml-6">
                                {/* Time */}
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-3.5 w-3.5 rounded-sm bg-muted-foreground/30 shrink-0" />
                                    <Skeleton className="h-4 w-32 bg-muted" />
                                </div>

                                {/* Room */}
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-3.5 w-3.5 rounded-sm bg-muted-foreground/30 shrink-0" />
                                    <Skeleton className="h-4 w-12 bg-muted" />
                                </div>
                            </div>

                            {/* Faint Divider line aligned with content */}
                            <div className="border-t border-border/40 ml-6 mt-1" />

                            {/* Bottom Section: Instructor (Indented) */}
                            <div className="flex items-center gap-2 ml-6 mb-1">
                                <Skeleton className="h-3.5 w-3.5 rounded-sm bg-muted-foreground/30 shrink-0" />
                                <Skeleton className="h-4 w-40 bg-muted" />
                            </div>

                        </CardContent>
                    </Card>
                ))}
            </div>
        </>
    );
}