// components/DataTable.jsx
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import { Skeleton } from "@/Components/ui/skeleton";

export default function DataTable({ columns, data, isLoading, isFetching }) {
    const skeletonRowCount = data?.length > 0 ? data.length : 10;

    // Array of different widths to simulate varying text lengths
    const skeletonWidths = ['w-3/4', 'w-full', 'w-5/6', 'w-2/3', 'w-4/5', 'w-[90%]'];

    return (
        <div className="rounded-md border">
            <Table className="w-full">
                <TableHeader>
                    <TableRow>
                        {columns.map((col, index) => (
                            <TableHead key={index} className={col.className}>
                                {col.header}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {isLoading || isFetching ? (
                        Array.from({ length: skeletonRowCount }).map((_, rowIndex) => (
                            <TableRow key={`skeleton-row-${rowIndex}`}>
                                {columns.map((col, colIndex) => {
                                    // Use a mix of rowIndex and colIndex to grab a pseudo-random width from the array.
                                    // This ensures it looks random to the user but remains stable to prevent React hydration errors.
                                    const randomWidth = skeletonWidths[(rowIndex + colIndex + (rowIndex * colIndex)) % skeletonWidths.length];

                                    return (
                                        <TableCell key={`skeleton-col-${colIndex}`} className={col.className}>
                                            <Skeleton className={`h-6 ${randomWidth}`} />
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        ))
                    ) : data?.length > 0 ? (
                        data.map((row, rowIndex) => (
                            <TableRow key={row.id || rowIndex}>
                                {columns.map((col, colIndex) => (
                                    <TableCell key={colIndex} className={col.className}>
                                        {col.render ? col.render(row) : row[col.accessor]}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">
                                No results found.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}