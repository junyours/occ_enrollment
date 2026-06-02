import React, { useState } from 'react';
import { Upload, FileText, X, Check, Search, Users } from 'lucide-react';
import SchoolYearPicker from '@/Components/SchoolYearPicker';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { Alert, AlertDescription } from '@/Components/ui/alert';
import { Badge } from '@/Components/ui/badge';
import { toast } from 'sonner';
import { Head } from '@inertiajs/react';

// Mock student data
const mockStudents = [];

export default function ApprovalSheetsIndex() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();
    const [uploadedFile, setUploadedFile] = useState(null);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [dragActive, setDragActive] = useState(false);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file) => {
        if (file.type === 'application/pdf') {
            setUploadedFile(file);
        } else {
            toast.error('Please upload a PDF file')
        }
    };

    const removeFile = () => {
        setUploadedFile(null);
    };

    const toggleStudent = (user_id_no) => {
        setSelectedStudents(prev =>
            prev.includes(user_id_no)
                ? prev.filter(id => id !== user_id_no)
                : [...prev, user_id_no]
        );
    };

    const filteredStudents = mockStudents.filter(student =>
        student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.user_id_no.includes(searchTerm) ||
        student.course.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleSubmit = () => {
        if (!uploadedFile) {
            toast.error('Please upload an approval sheet');
            return;
        }
        if (selectedStudents.length === 0) {
            toast.error('Please select at least one student');
            return;
        }

        console.log('Submitting:', {
            file: uploadedFile,
            students: selectedStudents,
            schoolYear: selectedSchoolYearEntry
        });

        toast.success(`Successfully linked ${selectedStudents.length} student(s) to the approval sheet`);
    };

    const getStudentForApprovalSheet = async () => {

    }

    return (
        <div className='space-y-4'>
            <Head title='Approval Sheets' />
            <div className='flex items-center gap-4'>
                <SchoolYearPicker />
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
                {/* Upload Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'>
                            <FileText className='w-5 h-5' />
                            Approval Sheet PDF
                        </CardTitle>
                        <CardDescription>
                            Upload the approval sheet document for the selected students
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        {!uploadedFile ? (
                            <div
                                onDragEnter={handleDrag}
                                onDragLeave={handleDrag}
                                onDragOver={handleDrag}
                                onDrop={handleDrop}
                                className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${dragActive
                                    ? 'border-primary bg-primary/5'
                                    : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                                    }`}
                            >
                                <Upload className='w-12 h-12 mx-auto mb-4 text-muted-foreground' />
                                <p className='text-sm text-muted-foreground mb-2'>
                                    Drag and drop your PDF here, or
                                </p>
                                <Input
                                    type='file'
                                    accept='application/pdf'
                                    onChange={handleFileInput}
                                    className='hidden'
                                    id='file-upload'
                                />
                                <Button type='button' variant='default' asChild>
                                    <label htmlFor='file-upload' className='cursor-pointer'>
                                        Browse Files
                                    </label>
                                </Button>
                                <p className='text-xs text-muted-foreground mt-2'>PDF files only, max 10MB</p>
                            </div>
                        ) : (
                            <div className='border rounded-lg p-4 flex items-center justify-between bg-muted/50'>
                                <div className='flex items-center gap-3'>
                                    <div className='w-10 h-10 bg-destructive/10 rounded flex items-center justify-center'>
                                        <FileText className='w-5 h-5 text-destructive' />
                                    </div>
                                    <div>
                                        <p className='text-sm font-medium'>{uploadedFile.name}</p>
                                        <p className='text-xs text-muted-foreground'>
                                            {(uploadedFile.size / 1024).toFixed(2)} KB
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant='ghost'
                                    size='icon'
                                    onClick={removeFile}
                                >
                                    <X className='w-4 h-4' />
                                </Button>
                            </div>
                        )}

                        <Alert>
                            <AlertDescription>
                                <strong>Note:</strong> After uploading, select the students who belong to this approval sheet from the list on the right.
                            </AlertDescription>
                        </Alert>

                        {/* Selected Students List */}
                        {selectedStudents.length > 0 && (
                            <div className='space-y-3'>
                                <div className='flex items-center justify-between'>
                                    <p className='text-sm font-medium'>Selected Students</p>
                                    <Badge variant='secondary'>
                                        {selectedStudents.length} student{selectedStudents.length !== 1 ? 's' : ''}
                                    </Badge>
                                </div>
                                <div className='border rounded-lg divide-y max-h-60 overflow-y-auto'>
                                    {mockStudents
                                        .filter(student => selectedStudents.includes(student.id))
                                        .map((student) => (
                                            <div key={student.id} className='flex items-center justify-between p-3 hover:bg-accent/50'>
                                                <div className='flex-1 min-w-0'>
                                                    <p className='text-sm font-medium leading-none mb-1'>{student.name}</p>
                                                    <div className='flex gap-2 text-xs text-muted-foreground'>
                                                        <span>{student.user_id_no}</span>
                                                        <span>•</span>
                                                        <span>{student.course}</span>
                                                        <span>•</span>
                                                        <span>{student.year}</span>
                                                    </div>
                                                </div>
                                                <Button
                                                    variant='ghost'
                                                    size='icon'
                                                    className='h-8 w-8 flex-shrink-0'
                                                    onClick={() => toggleStudent(student.id)}
                                                >
                                                    <X className='h-4 w-4' />
                                                </Button>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Student Selection Section */}
                <Card>
                    <CardHeader>
                        <div className='flex items-center justify-between'>
                            <div>
                                <CardTitle className='flex items-center gap-2'>
                                    <Users className='w-5 h-5' />
                                    Select Students
                                </CardTitle>
                                <CardDescription className='mt-1.5'>
                                    Choose students for this approval sheet
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        {/* Search */}
                        <div className='relative'>
                            <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                            <Input
                                type='text'
                                placeholder='Search by name, ID, or course...'
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className='pl-10'
                            />
                        </div>

                        {/* Student List */}
                        <div className='space-y-4 max-h-96 overflow-y-auto pr-2'>
                            {/* Selected Students */}
                            {filteredStudents.filter(s => selectedStudents.includes(s.id)).length > 0 && (
                                <div className='space-y-2'>
                                    <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                                        Selected ({filteredStudents.filter(s => selectedStudents.includes(s.id)).length})
                                    </p>
                                    {filteredStudents
                                        .filter(student => selectedStudents.includes(student.id))
                                        .map((student) => (
                                            <label
                                                key={student.id}
                                                className='flex items-start gap-3 p-3 border rounded-lg bg-primary/5 border-primary/20 hover:bg-primary/10 cursor-pointer transition-colors'
                                            >
                                                <Checkbox
                                                    checked={true}
                                                    onCheckedChange={() => toggleStudent(student.id)}
                                                    className='mt-1'
                                                />
                                                <div className='flex-1 min-w-0'>
                                                    <p className='text-sm font-medium leading-none mb-2'>{student.name}</p>
                                                    <div className='flex flex-wrap gap-2'>
                                                        <Badge variant='outline' className='text-xs'>
                                                            {student.user_id_no}
                                                        </Badge>
                                                        <Badge variant='outline' className='text-xs'>
                                                            {student.course}
                                                        </Badge>
                                                        <Badge variant='outline' className='text-xs'>
                                                            {student.year}
                                                        </Badge>
                                                    </div>
                                                </div>
                                                <Check className='w-5 h-5 text-primary flex-shrink-0 mt-1' />
                                            </label>
                                        ))}
                                </div>
                            )}

                            {/* Unselected Students */}
                            {filteredStudents.filter(s => !selectedStudents.includes(s.id)).length > 0 && (
                                <div className='space-y-2'>
                                    <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                                        Available ({filteredStudents.filter(s => !selectedStudents.includes(s.id)).length})
                                    </p>
                                    {filteredStudents
                                        .filter(student => !selectedStudents.includes(student.id))
                                        .map((student) => (
                                            <label
                                                key={student.id}
                                                className='flex items-start gap-3 p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors'
                                            >
                                                <Checkbox
                                                    checked={false}
                                                    onCheckedChange={() => toggleStudent(student.id)}
                                                    className='mt-1'
                                                />
                                                <div className='flex-1 min-w-0'>
                                                    <p className='text-sm font-medium leading-none mb-2'>{student.name}</p>
                                                    <div className='flex flex-wrap gap-2'>
                                                        <Badge variant='outline' className='text-xs'>
                                                            {student.user_id_no}
                                                        </Badge>
                                                        <Badge variant='outline' className='text-xs'>
                                                            {student.course}
                                                        </Badge>
                                                        <Badge variant='outline' className='text-xs'>
                                                            {student.year}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </label>
                                        ))}
                                </div>
                            )}
                        </div>

                        {filteredStudents.length === 0 && (
                            <div className='text-center py-8 text-muted-foreground'>
                                <p className='text-sm'>No students found</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Submit Button */}
            <div className='flex justify-end gap-3'>
                <Button
                    onClick={handleSubmit}
                    disabled={!uploadedFile || selectedStudents.length === 0}
                >
                    Submit Approval Sheet
                </Button>
            </div>
        </div>
    );
}

ApprovalSheetsIndex.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;