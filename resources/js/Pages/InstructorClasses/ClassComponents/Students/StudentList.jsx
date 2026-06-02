import React, { useState, useMemo } from 'react';
import { Badge } from '@/Components/ui/badge';
import { formatName } from '@/Lib/InfoUtils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Card } from '@/Components/ui/card';
import StudentListSkeleton from './StudentListSkeleton';
import { Button } from '@/Components/ui/button';
import { Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from "sonner";

export default function StudentList({ students, isLoading, nameClass }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const filteredStudents = useMemo(() => {
        if (!searchTerm) return students;

        const lowerSearch = searchTerm.toLowerCase();
        return students.filter((student) => {
            const name = formatName(student, { format: 'LFM' }).toLowerCase();
            const idNo = (student.user_id_no || '').toLowerCase();
            const email = (student.email_address || '').toLowerCase();

            return (
                name.includes(lowerSearch) ||
                idNo.includes(lowerSearch) ||
                email.includes(lowerSearch)
            );
        });
    }, [students, searchTerm]);

    const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentStudents = filteredStudents.slice(startIndex, startIndex + itemsPerPage);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        setCurrentPage(1);
    };

    const downLoadStudents = () => {
        if (!students || students.length === 0) {
            toast.error('No students to download');
            return;
        }

        const excelData = students.map((student, index) => ({
            "No.": `${index + 1}.`,
            "ID Number": student.user_id_no || 'N/A',
            "Name": formatName(student, { format: 'LFM' }),
            "Email": student.email_address || 'N/A',
            "Contact Number": student.contact_number || 'N/A',
            "Gender": student.gender || 'N/A'
        }));

        const workbook = XLSX.utils.book_new();

        const worksheet = XLSX.utils.json_to_sheet(excelData);

        worksheet['!cols'] = [
            { wch: 5 },
            { wch: 15 },
            { wch: 35 },
            { wch: 30 },
            { wch: 15 },
            { wch: 10 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, "Students");

        XLSX.writeFile(workbook, `${nameClass} - Students_List.xlsx`);
    };

    if (isLoading) return <StudentListSkeleton />;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={searchTerm}
                    onChange={handleSearch}
                    className="p-2 border rounded-md w-full sm:w-72 text-sm bg-background"
                />

                <Button
                    variant="outline"
                    onClick={downLoadStudents}
                >
                    <Download className="w-4 h-4 mr-2" />
                    Download Students
                </Button>
            </div>

            {/* Desktop View */}
            <div className="hidden md:block overflow-x-auto">
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8"></TableHead>
                                <TableHead className="w-32">ID No</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead className="hidden lg:table-cell">Email</TableHead>
                                <TableHead className="hidden lg:table-cell">Contact no</TableHead>
                                <TableHead className="hidden sm:table-cell">Gender</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {currentStudents.length > 0 ? (
                                currentStudents.map((student, index) => (
                                    <TableRow key={student.user_id_no || startIndex + index}>
                                        <TableCell className='text-end pr-0'>{startIndex + index + 1}.</TableCell>
                                        <TableCell>{student.user_id_no}</TableCell>
                                        <TableCell>{formatName(student, { format: 'LFM' })}</TableCell>
                                        <TableCell className="hidden lg:table-cell">{student.email_address.toLowerCase()}</TableCell>
                                        <TableCell className="hidden lg:table-cell">{student.contact_number}</TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            <Badge variant="outline">{student.gender}</Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No students found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* Mobile View */}
            <div className="md:hidden space-y-4">
                {currentStudents.length > 0 ? (
                    currentStudents.map((student, index) => (
                        <Card key={student.user_id_no || startIndex + index} className="p-4 flex flex-col gap-3">
                            {/* Header: Name and Badge */}
                            <div className="flex justify-between items-start gap-2">
                                <div>
                                    <h3 className="font-semibold text-base line-clamp-1">
                                        {startIndex + index + 1}. {formatName(student, { format: 'LFM' })}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        ID: {student.user_id_no}
                                    </p>
                                </div>
                                <Badge variant="outline" className="shrink-0">
                                    {student.gender}
                                </Badge>
                            </div>

                            {/* Body: Contact Info */}
                            <div className="text-sm space-y-1.5 pt-2 border-t">
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Email:</span>
                                    <span className="truncate ml-2">{student.email_address?.toLowerCase() || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">Contact:</span>
                                    <span>{student.contact_number || 'N/A'}</span>
                                </div>
                            </div>
                        </Card>
                    ))
                ) : (
                    <Card className="p-8 text-center text-muted-foreground">
                        No students found.
                    </Card>
                )}
            </div>

            {filteredStudents.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-muted-foreground text-center sm:text-left">
                        Showing <span className="font-semibold text-foreground">{startIndex + 1}</span> to{' '}
                        <span className="font-semibold text-foreground">{Math.min(startIndex + itemsPerPage, filteredStudents.length)}</span> of{' '}
                        <span className="font-semibold text-foreground">{filteredStudents.length}</span> results
                    </div>

                    <div className="flex gap-2 justify-center items-center">
                        <Button
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            variant="outline"
                            className="w-20"
                        >
                            Previous
                        </Button>
                        <span className="px-3 py-1 text-sm font-medium">
                            Page {currentPage} of {totalPages}
                        </span>
                        <Button
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            variant="outline"
                            className="w-20"
                        >
                            Next
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}