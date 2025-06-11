import { Avatar } from '@/Components/ui/avatar';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { formatFullName } from '@/Lib/Utils';
import { usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useState } from 'react'

function Students({ students, setStudents }) {
    const { id } = usePage().props;

    const getClassStudents = async () => {
        await axios.post(route('class.students', { id: id }))
            .then(response => {
                setStudents(response.data)
                console.log(response.data)
            })
    }

    useEffect(() => {
        getClassStudents();
    }, [])

    return (
        <div className="w-full">
            {/* Desktop/Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
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
                        {students.map((student, index) => (
                            <TableRow key={student.user_id_no || index}>
                                <TableCell className="font-medium">{index + 1}.</TableCell>
                                <TableCell className="font-mono text-sm">{student.user_id_no}</TableCell>
                                <TableCell className="font-medium">{formatFullName(student)}</TableCell>
                                <TableCell className="hidden sm:table-cell text-sm">{student.email_address}</TableCell>
                                <TableCell className="hidden lg:table-cell text-sm">{student.contact_number}</TableCell>
                                <TableCell className="hidden sm:table-cell">
                                    <Badge variant='outline'>
                                        {student.gender}
                                    </Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {students.map((student, index) => (
                    <Card key={student.user_id_no || index}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <Avatar className="inline-flex items-center justify-center text-xs font-medium border">
                                        {index + 1}
                                    </Avatar>
                                    <span className="text-xs font-mono">ID: {student.user_id_no}</span>
                                </div>
                                <Badge variant='outline'>
                                    {student.gender}
                                </Badge>
                            </div>

                            <div className="space-y-2">
                                <div>
                                    <h3 className="font-semibold">{formatFullName(student)}</h3>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-start">
                                        <span className="text-xs w-16 flex-shrink-0">Email:</span>
                                        <span className="text-sm break-all">{student.email_address}</span>
                                    </div>

                                    <div className="flex items-center">
                                        <span className="text-xs w-16 flex-shrink-0">Contact:</span>
                                        <span className="text-sm">{student.contact_number}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

export default Students
