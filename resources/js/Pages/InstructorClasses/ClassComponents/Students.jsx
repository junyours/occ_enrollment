import { Avatar } from '@/Components/ui/avatar';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent } from '@/Components/ui/card';
import { formatFullName } from '@/Lib/Utils';
import React from 'react';
import { usePage } from '@inertiajs/react';
import StudentList from './Students/StudentList';

function Students({ students, currentPage, studentsPerPage = 10, isLoading }) {
    const { id } = usePage().props;

    const startIndex = (currentPage - 1) * studentsPerPage;
    const currentStudents = students.slice(startIndex, startIndex + studentsPerPage);

    return (
        <div className="w-full space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
                <StudentList students={students} isLoading={isLoading} />
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {currentStudents.map((student, index) => (
                    <Card key={student.user_id_no || index}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-2">
                                    <Avatar className="inline-flex items-center justify-center text-xs font-medium border">
                                        {startIndex + index + 1}
                                    </Avatar>
                                    <span className="text-xs font-mono">ID: {student.user_id_no}</span>
                                </div>
                                <Badge variant="outline">{student.gender}</Badge>
                            </div>
                            <div className="space-y-2">
                                <h3 className="font-semibold">{formatFullName(student)}</h3>
                                <div className="space-y-1">
                                    <div className="flex">
                                        <span className="text-xs w-16">Email:</span>
                                        <span className="text-sm break-all">{student.email_address}</span>
                                    </div>
                                    <div className="flex">
                                        <span className="text-xs w-16">Contact:</span>
                                        <span className="text-sm">{student.contact_number}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export default Students;
