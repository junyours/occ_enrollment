import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Head } from '@inertiajs/react';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PreLoader from '@/Components/preloader/PreLoader';

import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Download, Eye } from 'lucide-react';
import ViewStudents from './SubjectListComponents/ViewStudents';
import { SubjectSkeleton } from './SubjectListComponents/SubjectListSkeleton';
import { useQuery } from '@tanstack/react-query';

export default function SubjectsList({ schoolYearId }) {
    const fetchSubjects = async () => {
        try {
            const response = await axios.post(route('enrollment.schoolyear.subjects-list', { schoolYearId }))
            return response.data;
        } catch (error) {
            console.error("Failed to fetch subjects:", error);
        }
    };

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['subjects', schoolYearId],
        queryFn: fetchSubjects,
        enabled: !!schoolYearId,
    })

    const handleDownload = (subjectId) => {
        window.open(route('enrollment.subject.students-download', {
            schoolYearId,
            subjectId,
        }), '_blank');
    };

    const [selectedSubject, setSelectedSubject] = useState(null)

    const handleView = (subject) => {
        setSelectedSubject(subject);
    };

    if (isLoading) return <SubjectSkeleton />;

    return (
        <div className="space-y-4">
            <Head title="Subject List" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {data.map(subject => (
                    <Card key={subject.id} className="flex flex-col justify-between">
                        <CardHeader>
                            <CardTitle className="text-lg font-bold">{subject.subject_code}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 flex-grow flex flex-col justify-end">
                            <p className="text-sm text-muted-foreground">{subject.descriptive_title}</p>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => handleView(subject)}
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
            {!!selectedSubject && (
                <ViewStudents subject={selectedSubject} setSubject={setSelectedSubject} schoolYearId={schoolYearId} />
            )}
        </div>
    );
}

SubjectsList.layout = page => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
