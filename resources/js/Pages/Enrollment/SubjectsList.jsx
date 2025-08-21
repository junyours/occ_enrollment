import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Head, usePage } from '@inertiajs/react';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PreLoader from '@/Components/preloader/PreLoader';

import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Download } from 'lucide-react';

function SubjectsList({ schoolYearId }) {
    const [loading, setLoading] = useState(true);
    const [subjects, setSubjects] = useState([]);

    const fetchSubjects = async () => {
        await axios.post(route('enrollment.schoolyear.subjects-list', { schoolYearId }))
            .then(response => {
                setSubjects(response.data);
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchSubjects();
    }, [schoolYearId]);

    const handleDownload = (subjectId) => {
        window.open(route('enrollment.subject.students-download', {
            schoolYearId,
            subjectId,
        }), '_blank');
    };

    if (loading) return <PreLoader title="Subject List" />;

    return (
        <div className="space-y-4">
            <Head title="Subject List" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {subjects.map(subject => (
                    <Card key={subject.id}>
                        <CardHeader>
                            <CardTitle className="text-lg">{subject.subject_code}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="text-sm text-muted-foreground">{subject.descriptive_title}</p>
                            <Button
                                onClick={() => handleDownload(subject.id)}
                                className="w-full flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Download Students
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}

export default SubjectsList;
SubjectsList.layout = page => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
