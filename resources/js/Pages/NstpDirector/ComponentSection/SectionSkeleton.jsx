import React from 'react'
import { Skeleton } from '@/Components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'

function SectionSkeleton() {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead></TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow>
                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
                <TableRow>
                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
                <TableRow>
                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
                <TableRow>
                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
                <TableRow>
                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
                <TableRow>
                    <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
            </TableBody>
        </Table>
    )
}

export default SectionSkeleton