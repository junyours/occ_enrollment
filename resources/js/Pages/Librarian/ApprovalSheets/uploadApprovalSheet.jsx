import React, { useEffect, useState } from 'react';
import { Upload, FileText, X, Search, Users, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import SchoolYearPicker from '@/Components/SchoolYearPicker';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Badge } from '@/Components/ui/badge';
import { toast } from 'sonner';
import { Head, router } from '@inertiajs/react';
import { cn, formatFullName } from '@/Lib/Utils';
import { set } from 'react-hook-form';

const yearMap = {
    'First Year': '1st Year',
    'Second Year': '2nd Year',
    'Third Year': '3rd Year',
    'Fourth Year': '4th Year',
};

export default function uploadApprovalSheet() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();
    const [uploadedFile, setUploadedFile] = useState(null);
    const [approvalSheetTitle, setApprovalSheetTitle] = useState('');
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedStudentData, setSelectedStudentData] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [dragActive, setDragActive] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleSearch = async () => {
        if (searchTerm.trim().length < 3) {
            toast.error('Please enter at least 3 characters to search');
            return;
        }

        setIsSearching(true);
        try {
            const response = await axios.post(route('search-enrolled-students'), {
                schoolYearId: selectedSchoolYearEntry.id,
                searchTerm: searchTerm.trim()
            });
            setSearchResults(response.data);
        } catch (error) {
            console.error('Search error:', error);
            toast.error('Failed to search students');
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    useEffect(() => {
        if (!searchTerm) return setSearchResults([]);
        handleSearch();
    }, [selectedSchoolYearEntry?.id])

    // Filter out already selected students from search results
    const availableStudents = searchResults.filter(s => !selectedStudents.includes(s.id));

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
            // Set default title to filename without extension
            const nameWithoutExtension = file.name.replace(/\.pdf$/i, '');
            setApprovalSheetTitle(nameWithoutExtension);
        } else {
            toast.error('Please upload a PDF file');
        }
    };

    const removeFile = () => {
        setUploadedFile(null);
        setApprovalSheetTitle('');
    };

    const toggleStudent = (student) => {
        if (selectedStudents.includes(student.id)) {
            // Remove student
            setSelectedStudents(prev => prev.filter(id => id !== student.id));
            setSelectedStudentData(prev => prev.filter(s => s.id !== student.id));
        } else {
            // Add student
            setSelectedStudents(prev => [...prev, student.id]);
            setSelectedStudentData(prev => [...prev, student]);
        }
    };

    const handleSubmit = () => {
        if (!uploadedFile) {
            toast.error('Please upload an approval sheet');
            return;
        }

        if (!approvalSheetTitle.trim()) {
            toast.error('Please enter a title for the approval sheet');
            return;
        }

        if (selectedStudents.length === 0) {
            toast.error('Please select at least one student');
            return;
        }

        const formData = new FormData();
        formData.append('file', uploadedFile);
        formData.append('title', approvalSheetTitle.trim());
        formData.append('student_ids', JSON.stringify(selectedStudents));
        formData.append('school_year_id', selectedSchoolYearEntry.id);

        setUploading(true);
        router.post(route('approval-sheets.store'), formData, {
            forceFormData: true,
            onSuccess: () => {
                toast.success(`Successfully linked ${selectedStudents.length} student(s) to the approval sheet`);

                // Optional reset
                setUploadedFile(null);
                setApprovalSheetTitle('');
                setSelectedStudents([]);
                setSearchResults([]);
                setSelectedStudentData([]);
                setSearchTerm('');
            },
            onError: (errors) => {
                console.error(errors);
                toast.error('Failed to submit approval sheet');
            },
            onProgress: (progress) => {
                console.log('Upload progress:', progress.percentage);
            },
            preserveScroll: true,
            onFinish: () => {
                setUploading(false);
            }
        });
    };

    return (
        <div className='space-y-4'>
            <Head title='Approval Sheets' />
            <div className='flex justify-between items-center gap-4'>
                <Card
                    className='cursor-pointer hover:bg-gray-100 self-start'
                    onClick={() => window.history.back()}
                >
                    <CardContent className='flex items-center gap-2 px-4 py-2'>
                        <ArrowLeft className='w-5 h-5' />
                        <span>Back</span>
                    </CardContent>
                </Card>
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
                        {/* Title Input - Only show when PDF is uploaded */}
                        {uploadedFile && (
                            <div className='space-y-2'>
                                <label className='text-sm font-medium'>
                                    Approval Sheet Title <span className='text-destructive'>*</span>
                                </label>
                                <Input
                                    type='text'
                                    placeholder='e.g., First Semester 2024 Approval Sheet'
                                    value={approvalSheetTitle}
                                    onChange={(e) => setApprovalSheetTitle(e.target.value)}
                                    className='w-full'
                                />
                            </div>
                        )}

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
                                    {selectedStudentData.map((student) => (
                                        <div key={student.id} className='flex items-center justify-between p-3 hover:bg-accent/50'>
                                            <div className='flex-1 min-w-0'>
                                                <p className='text-sm font-medium leading-none mb-1'>{formatFullName(student)}</p>
                                                <div className='flex gap-2 text-xs text-muted-foreground'>
                                                    <span>{student.user_id_no}</span>
                                                    <span>•</span>
                                                    <span>{student.course_name_abbreviation}</span>
                                                    <span>•</span>
                                                    <span>{student.year_level_name}</span>
                                                </div>
                                            </div>
                                            <Button
                                                variant='ghost'
                                                size='icon'
                                                className='h-8 w-8 flex-shrink-0'
                                                onClick={() => toggleStudent(student)}
                                            >
                                                <X className='h-4 w-4' />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className='flex justify-end gap-3'>
                            <Button
                                onClick={handleSubmit}
                                disabled={!uploadedFile || !approvalSheetTitle.trim() || selectedStudents.length === 0 || uploading}
                            >
                                Submit Approval Sheet
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Student Selection Section */}
                <Card>
                    <CardHeader>
                        <CardTitle className='flex items-center gap-2'>
                            <Users className='w-5 h-5' />
                            Select Students
                        </CardTitle>
                        <CardDescription className='mt-1.5'>
                            Choose students for this approval sheet
                        </CardDescription>
                    </CardHeader>
                    <CardContent className='space-y-4'>
                        {/* Search */}
                        <div className='flex gap-2'>
                            <div className='relative flex-1'>
                                <Search className='absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground' />
                                <Input
                                    type='text'
                                    placeholder='Search by name or ID...'
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    className='pl-10'
                                />
                            </div>
                            <Button
                                onClick={handleSearch}
                                disabled={isSearching || searchTerm.trim().length < 3}
                            >
                                {isSearching ? 'Searching...' : 'Search'}
                            </Button>
                        </div>

                        {/* Student List */}
                        <div className='space-y-4 max-h-96 overflow-y-auto pr-2'>
                            {searchResults.length === 0 && !isSearching ? (
                                <div className='text-center py-8 text-muted-foreground'>
                                    <Search className='w-12 h-12 mx-auto mb-2 opacity-50' />
                                    <p className='text-sm'>Enter a search term and click Search</p>
                                </div>
                            ) : availableStudents.length === 0 && !isSearching ? (
                                <div className='text-center py-8 text-muted-foreground'>
                                    <p className='text-sm'>No students found</p>
                                </div>
                            ) : (
                                <div className='space-y-2'>
                                    <p className='text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                                        Available ({availableStudents.length})
                                    </p>
                                    {availableStudents.map((student) => {
                                        const hasApprovalSheet =
                                            !!student.graduation_requirements?.student_approval_sheets?.approval_sheet_id

                                        return (
                                            <label
                                                key={student.id}
                                                className={cn(
                                                    'flex items-start gap-3 p-3 border rounded-lg transition-colors',
                                                    hasApprovalSheet
                                                        ? 'opacity-60 cursor-not-allowed bg-muted'
                                                        : 'cursor-pointer hover:bg-accent'
                                                )}
                                                onClick={() => {
                                                    if (hasApprovalSheet) return;
                                                    toggleStudent(student)
                                                }}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <p className="text-sm font-medium leading-none truncate">
                                                            {formatFullName(student)}
                                                        </p>

                                                        {hasApprovalSheet && (
                                                            <Badge variant="secondary" className="text-xs">
                                                                Already has approval sheet
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap gap-2">
                                                        <Badge variant="outline" className="text-xs">
                                                            {student.user_id_no}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs">
                                                            {student.course_name_abbreviation}
                                                        </Badge>
                                                        <Badge variant="outline" className="text-xs">
                                                            {yearMap[student.year_level_name]}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </label>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

uploadApprovalSheet.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;