// components/DataTable.jsx
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function DataTable({ columns, data, isLoading, isFetching }) {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        {columns.map((col, index) => (
                            <TableHead key={index}>{col.header}</TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody className={`transition-opacity duration-200 ${(isFetching) ? 'opacity-50' : 'opacity-100'}`}>
                    {isLoading ? (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">Loading data...</TableCell>
                        </TableRow>
                    ) : data?.length > 0 ? (
                        data.map((row, rowIndex) => (
                            <TableRow key={row.id || rowIndex}>
                                {columns.map((col, colIndex) => (
                                    <TableCell key={colIndex}>
                                        {/* If a custom render function is provided, use it. Otherwise fall back to the accessor string key */}
                                        {col.render ? col.render(row) : row[col.accessor]}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">No results found.</TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}