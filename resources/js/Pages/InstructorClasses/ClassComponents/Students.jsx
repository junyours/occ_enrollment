import { Avatar } from '@/Components/ui/avatar';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Button } from '@/Components/ui/button';
import { formatFullName } from '@/Lib/Utils';
import React from 'react';
import { Download } from 'lucide-react';
import { usePage } from '@inertiajs/react';

function Students({ students, currentPage, setPage, studentsPerPage = 10 }) {
    const { id } = usePage().props;

    // Pagination logic (frontend)
    const totalPages = Math.ceil(students.length / studentsPerPage);
    const startIndex = (currentPage - 1) * studentsPerPage;
    const currentStudents = students.slice(startIndex, startIndex + studentsPerPage);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    return (
        <div className="w-full space-y-4">
            {/* Download Button */}
            <div className="flex justify-end">
                <Button
                    variant="outline"
                    onClick={() => {
                        window.open(route('class.students.download', { id }), '_blank');
                    }}
                >
                    <Download className="w-4 h-4 mr-2" />
                    Download Students
                </Button>
            </div>

            {/* Desktop Table View */}
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
                        {currentStudents.map((student, index) => (
                            <TableRow key={student.user_id_no || index}>
                                <TableCell>{startIndex + index + 1}.</TableCell>
                                <TableCell>{student.user_id_no}</TableCell>
                                <TableCell>{formatFullName(student)}</TableCell>
                                <TableCell className="hidden sm:table-cell">{student.email_address}</TableCell>
                                <TableCell className="hidden lg:table-cell">{student.contact_number}</TableCell>
                                <TableCell className="hidden sm:table-cell">
                                    <Badge variant="outline">{student.gender}</Badge>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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

            {/* Pagination Controls */}
            <div className="flex justify-center gap-2">
                <Button
                    size="sm"
                    className="w-20"
                    variant="outline"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                >
                    Previous
                </Button>

                <span className="text-sm px-2 py-1">Page {currentPage} of {totalPages}</span>

                <Button
                    size="sm"
                    className="w-20"
                    variant="outline"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                >
                    Next
                </Button>
            </div>
        </div>
    );
}

export default Students;
