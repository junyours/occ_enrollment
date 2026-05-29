import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Head } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Eye, Search, ChevronLeft, ChevronRight } from 'lucide-react';

import ViewStudents from './SubjectListComponents/ViewStudents';
import { SubjectSkeleton } from './SubjectListComponents/SubjectListSkeleton';

export default function SubjectsList({ schoolYearId }) {
    // --- States ---
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // Set how many items you want per page
    const itemsPerPage = 9;

    // Reset back to page 1 whenever the user types in the search bar
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // --- Data Fetching ---
    const fetchSubjects = async () => {
        const response = await axios.post(route('enrollment.schoolyear.subjects-list', { schoolYearId }));
        return response.data;
    };

    const { data, isLoading, isError } = useQuery({
        queryKey: ['subjects', schoolYearId],
        queryFn: fetchSubjects,
        enabled: !!schoolYearId,
    });

    // --- Handlers ---
    const handleDownload = (subjectId) => {
        window.open(route('enrollment.subject.students-download', {
            schoolYearId,
            subjectId,
        }), '_blank');
    };

    if (isLoading) return <SubjectSkeleton />;
    if (isError) return (
        <div className="p-8 text-center text-red-500 bg-red-50 rounded-lg border border-red-200">
            Failed to load subjects. Please try refreshing the page.
        </div>
    );

    // --- 1. Client-Side Search Filter ---
    const filteredSubjects = data?.filter((subject) => {
        const search = searchTerm.toLowerCase();
        return (
            subject.subject_code.toLowerCase().includes(search) ||
            subject.descriptive_title.toLowerCase().includes(search)
        );
    }) || [];

    // --- 2. Client-Side Pagination ---
    const totalPages = Math.ceil(filteredSubjects.length / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;

    // Slice the filtered array to get only the items for the current page
    const paginatedSubjects = filteredSubjects.slice(startIndex, startIndex + itemsPerPage);

    return (
        <Card className="w-full">
            <CardContent className="mt-4">
                <div className="space-y-4">
                    <Head title="Subject List" />
                    
                    {/* Search Bar */}
                    <div className="relative w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by code or title..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9 w-full py-6"
                        />
                    </div>

                    {/* Empty State */}
                    {filteredSubjects.length === 0 ? (
                        <div className="text-center py-12 border-2 border-dashed rounded-lg text-muted-foreground">
                            <p>No subjects found matching "{searchTerm}"</p>
                        </div>
                    ) : (
                        <>
                            {/* Grid Layout */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {paginatedSubjects.map(subject => (
                                    <Card key={subject.id} className="flex flex-col justify-between">
                                        <CardHeader>
                                            <CardTitle className="text-lg font-bold">{subject.subject_code}</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-4 flex-grow flex flex-col justify-end">
                                            <p className="text-sm text-muted-foreground">{subject.descriptive_title}</p>

                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setSelectedSubject(subject)}
                                                    className="w-full flex items-center gap-2"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    View
                                                </Button>
                                                <Button
                                                    onClick={() => handleDownload(subject.id)}
                                                    className="w-full flex items-center gap-2"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Download
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4">
                                    <p className="text-sm text-muted-foreground">
                                        Page {currentPage} of {totalPages}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(old => Math.max(old - 1, 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="w-4 h-4 mr-1" />
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(old => Math.min(old + 1, totalPages))}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                            <ChevronRight className="w-4 h-4 ml-1" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Modals / Additional Views */}
                    {!!selectedSubject && (
                        <ViewStudents subject={selectedSubject} setSubject={setSelectedSubject} schoolYearId={schoolYearId} />
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

SubjectsList.layout = page => <AuthenticatedLayout>{page}</AuthenticatedLayout>;