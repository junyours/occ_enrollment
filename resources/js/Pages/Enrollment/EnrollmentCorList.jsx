import { Button } from '@/Components/ui/button';
import { PageTitle } from '@/Components/ui/PageTitle';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatFullName } from '@/Lib/Utils';
import { Head } from '@inertiajs/react';
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import CorGenerator from '../COR/CorGenerator';
import { Search, Users, FileText, Loader2, AlertCircle, User, Download, Printer, Edit } from 'lucide-react';
import { Card } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';
import EditCor from '../COR/EditCor';

export default function EnrollmentCorList({
    schoolYear,
    courseId,
    yearlevel,
    section,
    yearSectionId,
    courseName,
    departmentId,
    students
}) {
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [loading, setLoading] = useState(false);
    const [corData, setCorData] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);
    const componentRef = useRef(null);
    const [editing, setEditing] = useState(false);

    const schoolYearId = schoolYear.id;

    const yearLevels = useMemo(() => [
        'First-Year',
        'Second-Year',
        'Third-Year',
        'Fourth-Year',
    ], []);

    // Filter students based on search term
    const filteredStudents = useMemo(() => {
        if (!searchTerm.trim()) return students;
        return students.filter(student =>
            formatFullName(student).toLowerCase().includes(searchTerm.toLowerCase()) ||
            student.user_id_no?.toString().includes(searchTerm)
        );
    }, [students, searchTerm]);

    // Initialize with first student when component mounts
    useEffect(() => {
        if (students.length > 0 && !selectedStudent) {
            const firstStudent = students[0];
            setSelectedStudent(firstStudent);
            getStudentInfoCor(firstStudent.user_id_no);
        }
    }, [students, selectedStudent]);

    const getStudentInfoCor = useCallback(async (studentIdNo) => {
        if (!studentIdNo) return;

        setLoading(true);
        setError(null);

        try {
            const response = await axios.post(route('enrollment.student.info.cor', {
                courseId,
                section,
                yearlevel: yearLevels[yearlevel - 1],
                studentIdNo,
                schoolYearId
            }));

            setCorData(response.data);
            console.log(response.data);
        } catch (error) {
            console.error("Failed to fetch student info:", error);
            setError('Failed to load student information. Please try again.');
            setCorData({});
        } finally {
            setLoading(false);
        }
    }, [courseId, section, yearlevel, yearLevels, schoolYearId]);

    const handleStudentSelect = useCallback((student) => {
        if (selectedStudent?.id === student.id) return; // Avoid unnecessary re-fetching

        setSelectedStudent(student);
        getStudentInfoCor(student.user_id_no);
    }, [selectedStudent, getStudentInfoCor]);

    const hasCorData = corData && Object.keys(corData).length > 0;

    const handleDownloadPdf = useCallback(() => {
        const element = document.getElementById("cor-printable-content");
        if (element) {
            // Apply styling to ensure images are inline
            const style = document.createElement('style');
            document.head.appendChild(style);
            style.sheet?.insertRule('body > div:last-child img { display: inline-block; }');

            // If the selected component is COR, download as PDF
            const options = {
                filename: `${selectedStudent?.last_name}, ${selectedStudent?.first_name} ${selectedStudent?.middle_name ? `${selectedStudent?.middle_name[0]}.` : ''}_COR.pdf`,
                html2canvas: { scale: 5 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            };

            html2pdf()
                .from(element)
                .set(options)
                .save()
                .finally(() => style.remove());
        }
    }, [selectedStudent, hasCorData, courseId, section, yearlevel, yearLevels, schoolYearId, corData]);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    });

    return (
        <div className='space-y-6'>
            <Head title={`Enrollment - ${courseName}`} />

            {/* Header Section */}
            <div className="text-center space-y-2">
                <PageTitle align="center" >{courseName} - {yearlevel}{section}</PageTitle>
            </div>

            <div className='flex gap-6 h-[calc(100vh-10rem)]'>
                {/* Student List Sidebar */}
                <Card className='w-80 flex flex-col rounded-lg border shadow-sm'>
                    {/* Search Header */}
                    <div className='p-4 border-b rounded-t-lg'>
                        <div className='relative'>
                            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
                            <Input
                                type="text"
                                placeholder="Search students..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className='w-full pl-10 pr-4 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                            />
                        </div>
                    </div>

                    {/* Student List */}
                    <div className='flex-1 overflow-y-auto p-2 space-y-1'>
                        {filteredStudents.length === 0 ? (
                            <div className='text-center py-8'>
                                <User className='w-8 h-8 mx-auto mb-2 opacity-50' />
                                <p className='text-sm'>No students found</p>
                            </div>
                        ) : (
                            filteredStudents.map((student, index) => {
                                const isSelected = selectedStudent?.id === student.id;
                                return (
                                    <Button
                                        key={student.id}
                                        variant={isSelected ? 'default' : 'ghost'}
                                        onClick={() => handleStudentSelect(student)}
                                        className={`w-full justify-start text-left h-auto p-3 transition-all duration-200 ${isSelected
                                            ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md'
                                            : ''
                                            }`}
                                    >
                                        <div className='flex items-center gap-3 w-full'>
                                            <div className={`
                                                w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                                                ${isSelected ? 'bg-white/20 text-white' : ''}
                                            `}>
                                                {index + 1}
                                            </div>
                                            <div className='flex-1 min-w-0'>
                                                <div className={`font-medium truncate ${isSelected ? 'text-white' : ''}`}>
                                                    {formatFullName(student)}
                                                </div>
                                                {student.user_id_no && (
                                                    <div className={`text-xs truncate ${isSelected ? 'text-blue-100' : ''}`}>
                                                        ID: {student.user_id_no}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </Button>
                                );
                            })
                        )}
                    </div>
                </Card>

                <div className='flex-1 bg-white rounded-lg border shadow-sm overflow-hidden'>
                    {!selectedStudent ? (
                        <div className='h-full flex items-center justify-center text-gray-500'>
                            <div className='text-center'>
                                <FileText className='w-12 h-12 mx-auto mb-4 opacity-50' />
                                <p className='text-lg font-medium mb-2'>Select a Student</p>
                                <p className='text-sm'>Choose a student from the list to view their COR</p>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className='h-full flex items-center justify-center'>
                            <div className='text-center'>
                                <Loader2 className='w-8 h-8 mx-auto mb-4 animate-spin text-blue-600' />
                                <p className='text-lg font-medium text-gray-700 mb-2'>Loading COR...</p>
                                <p className='text-sm text-gray-500'>
                                    Fetching information for {formatFullName(selectedStudent)}
                                </p>
                            </div>
                        </div>
                    ) : error ? (
                        <div className='h-full flex items-center justify-center'>
                            <div className='text-center'>
                                <AlertCircle className='w-12 h-12 mx-auto mb-4 text-red-500' />
                                <p className='text-lg font-medium text-red-700 mb-2'>Error Loading COR</p>
                                <p className='text-sm text-gray-600 mb-4'>{error}</p>
                                <Button
                                    onClick={() => getStudentInfoCor(selectedStudent.user_id_no)}
                                    variant="outline"
                                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                >
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    ) : hasCorData ? (
                        <div className='h-full overflow-auto relative'>
                            {/* <div className='p-4 border-b bg-gray-50'>
                                <div className='flex items-center justify-between'>
                                    <div>
                                        <h3 className='font-semibold text-gray-900'>
                                            Certificate of Registration
                                        </h3>
                                        <p className='text-sm text-gray-600'>
                                            {formatFullName(selectedStudent)} • ID: {selectedStudent.user_id_no}
                                        </p>
                                    </div>
                                    <div className='text-xs text-gray-500'>
                                        Generated: {new Date().toLocaleDateString()}
                                    </div>
                                </div>
                            </div> */}

                            {/* Floating Action Buttons */}
                            <div className='fixed bottom-8 right-8 flex flex-col gap-3 z-50'>
                                <Button
                                    onClick={handleDownloadPdf}
                                    size="sm"
                                    variant="outline"
                                    className="flex items-center gap-2 text-green-600 border-green-600"
                                >
                                    <Download className="w-4 h-4" />
                                    Download PDF
                                </Button>
                                <Button
                                    onClick={handlePrint}
                                    size="sm"
                                    variant="outline"
                                    className="flex items-center gap-2 text-blue-600 border-blue-600"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print
                                </Button>
                                <Button
                                    onClick={() => setEditing(true)}
                                    size="sm"
                                    variant="outline"
                                    className="flex items-center gap-2 text-orange-600 border-orange-600"
                                >
                                    <Edit className="w-4 h-4" />
                                    Edit COR
                                </Button>
                            </div>

                            <div ref={componentRef} id="cor-printable-content">
                                <CorGenerator data={corData} />
                            </div>
                        </div>
                    ) : (
                        <div className='h-full flex items-center justify-center text-gray-500'>
                            <div className='text-center'>
                                <FileText className='w-12 h-12 mx-auto mb-4 opacity-50' />
                                <p className='text-lg font-medium mb-2'>No COR Data Available</p>
                                <p className='text-sm'>No registration data found for this student</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {(editing && Object.keys(corData).length > 0) && (
                <EditCor editing={editing} setEditing={setEditing} enrolledStudentId={corData.id} />
            )}
        </div>
    );
}

EnrollmentCorList.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;