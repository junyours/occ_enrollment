import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import {
    Search,
    FileText,
    Loader2,
    AlertCircle,
    User,
    Download,
    Printer,
    Edit,
} from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import html2pdf from 'html2pdf.js';

import { Button } from '@/Components/ui/button';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Card } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatFullName } from '@/Lib/Utils';

import CorGenerator from '../COR/CorGenerator';
import EditCor from '../COR/EditCor';

const YEAR_LEVELS = [
    'First-Year',
    'Second-Year',
    'Third-Year',
    'Fourth-Year',
];

export default function EnrollmentCorList({
    schoolYear,
    courseId,
    yearlevel,
    section,
    courseName,
    students = [],
}) {
    const [selectedStudentId, setSelectedStudentId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editing, setEditing] = useState(false);

    const componentRef = useRef(null);
    const previousEditingRef = useRef(false);

    // Select the first student when no valid selection exists.
    const selectedStudent =
        students.find((student) => student.id === selectedStudentId) ??
        students[0] ??
        null;

    const schoolYearId = schoolYear.id;
    const yearLevelName = YEAR_LEVELS[yearlevel - 1];
    const studentIdNo = selectedStudent?.user_id_no;

    const canFetchCor = Boolean(
        studentIdNo &&
        schoolYearId &&
        courseId &&
        yearLevelName
    );

    const {
        data: corData,
        isLoading,
        isFetching,
        isError,
        refetch,
    } = useQuery({
        queryKey: [
            'enrollment.student.info.cor',
            {
                studentIdNo,
                schoolYearId,
                courseId,
                section,
                yearlevel: yearLevelName,
            },
        ],

        queryFn: async ({ signal }) => {
            const response = await axios.post(
                route('enrollment.student.info.cor', {
                    courseId,
                    section,
                    yearlevel: yearLevelName,
                    studentIdNo,
                    schoolYearId,
                }),
                undefined,
                { signal }
            );

            return response.data;
        },

        enabled: canFetchCor,
        staleTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
    });

    const hasCorData = Boolean(
        corData && Object.keys(corData).length > 0
    );

    const filteredStudents = useMemo(() => {
        const search = searchTerm.trim().toLowerCase();

        if (!search) return students;

        return students.filter((student) => {
            const name = formatFullName(student).toLowerCase();
            const studentNumber = String(
                student.user_id_no ?? ''
            ).toLowerCase();

            return (
                name.includes(search) ||
                studentNumber.includes(search)
            );
        });
    }, [students, searchTerm]);

    // Refresh after the editor closes, including after a successful save.
    useEffect(() => {
        const editorJustClosed =
            previousEditingRef.current && !editing;

        previousEditingRef.current = editing;

        if (editorJustClosed && canFetchCor) {
            void refetch();
        }
    }, [editing, canFetchCor, refetch]);

    const handleDownloadPdf = useCallback(async () => {
        const element = componentRef.current;

        if (!element || !selectedStudent) return;

        const style = document.createElement('style');
        document.head.appendChild(style);

        try {
            style.sheet?.insertRule(
                'body > div:last-child img { display: inline-block; }'
            );

            await html2pdf()
                .from(element)
                .set({
                    filename: `${formatFullName(selectedStudent)}_COR.pdf`,
                    html2canvas: {
                        scale: 5,
                    },
                    jsPDF: {
                        unit: 'mm',
                        format: 'a4',
                        orientation: 'portrait',
                    },
                })
                .save();
        } finally {
            style.remove();
        }
    }, [selectedStudent]);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    });

    return (
        <div className="space-y-6">
            <Head title={`Enrollment - ${courseName}`} />

            <div className="space-y-2 text-center">
                <PageTitle align="center">
                    {courseName} - {yearlevel}{section}
                </PageTitle>
            </div>

            <div className="flex h-[calc(100vh-10rem)] gap-6">
                {/* Student sidebar */}
                <Card className="flex w-80 shrink-0 flex-col rounded-lg border shadow-sm">
                    <div className="rounded-t-lg border-b p-4">
                        <div className="relative">
                            <Search
                                className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                            />

                            <Input
                                type="search"
                                placeholder="Search students..."
                                aria-label="Search students"
                                value={searchTerm}
                                onChange={(event) =>
                                    setSearchTerm(event.target.value)
                                }
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="flex-1 space-y-1 overflow-y-auto p-2">
                        {filteredStudents.length === 0 ? (
                            <div className="py-8 text-center text-muted-foreground">
                                <User className="mx-auto mb-2 size-8 opacity-50" />
                                <p className="text-sm">
                                    No students found
                                </p>
                            </div>
                        ) : (
                            filteredStudents.map((student, index) => {
                                const isSelected =
                                    selectedStudent?.id === student.id;

                                return (
                                    <Button
                                        key={student.id}
                                        type="button"
                                        variant={
                                            isSelected ? 'default' : 'ghost'
                                        }
                                        aria-pressed={isSelected}
                                        onClick={() =>
                                            setSelectedStudentId(student.id)
                                        }
                                        className={`
                                            h-auto w-full justify-start p-3 text-left
                                            ${isSelected
                                                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                                                : ''
                                            }
                                        `}
                                    >
                                        <div className="flex w-full items-center gap-3">
                                            <div
                                                className={`
                                                    flex size-8 shrink-0 items-center justify-center
                                                    rounded-full text-sm font-medium
                                                    ${isSelected ? 'bg-white/20 text-white' : ''}
                                                `}
                                            >
                                                {index + 1}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <div className="truncate font-medium">
                                                    {formatFullName(student)}
                                                </div>

                                                {student.user_id_no && (
                                                    <div
                                                        className={`
                                                            truncate text-xs
                                                            ${isSelected
                                                                ? 'text-blue-100'
                                                                : 'text-muted-foreground'
                                                            }
                                                        `}
                                                    >
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

                {/* COR viewer */}
                <div className="min-w-0 flex-1 overflow-hidden rounded-lg border bg-white shadow-sm">
                    {!selectedStudent ? (
                        <ViewerState
                            icon={
                                <FileText className="size-12 text-gray-400" />
                            }
                            title="Select a Student"
                            description="Choose a student from the list to view their COR."
                        />
                    ) : isLoading ? (
                        <ViewerState
                            icon={
                                <Loader2 className="size-8 animate-spin text-blue-600" />
                            }
                            title="Loading COR..."
                            description={`Fetching information for ${formatFullName(selectedStudent)}.`}
                        />
                    ) : isError ? (
                        <ViewerState
                            icon={
                                <AlertCircle className="size-12 text-red-500" />
                            }
                            title="Error Loading COR"
                            description="Failed to load student information. Please try again."
                        >
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isFetching}
                                onClick={() => refetch()}
                                className="gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                                {isFetching && (
                                    <Loader2 className="size-4 animate-spin" />
                                )}

                                {isFetching ? 'Retrying...' : 'Try Again'}
                            </Button>
                        </ViewerState>
                    ) : hasCorData ? (
                        <div className="relative h-full overflow-auto">
                            {/* Actions */}
                            <div className="fixed bottom-8 right-8 z-50 flex flex-col gap-3 print:hidden">
                                {isFetching && (
                                    <div
                                        role="status"
                                        className="flex items-center justify-center gap-2 rounded-md border bg-white px-3 py-2 text-xs text-gray-600 shadow-sm"
                                    >
                                        <Loader2 className="size-3.5 animate-spin" />
                                        Updating COR...
                                    </div>
                                )}

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={isFetching}
                                    onClick={handleDownloadPdf}
                                    className="gap-2 border-green-600 text-green-600"
                                >
                                    <Download className="size-4" />
                                    Download PDF
                                </Button>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={isFetching}
                                    onClick={() => handlePrint()}
                                    className="gap-2 border-blue-600 text-blue-600"
                                >
                                    <Printer className="size-4" />
                                    Print
                                </Button>

                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={isFetching}
                                    onClick={() => setEditing(true)}
                                    className="gap-2 border-orange-600 text-orange-600"
                                >
                                    <Edit className="size-4" />
                                    Edit COR
                                </Button>
                            </div>

                            <div
                                ref={componentRef}
                                id="cor-printable-content"
                            >
                                <CorGenerator
                                    key={corData.id ?? studentIdNo}
                                    data={corData}
                                />
                            </div>
                        </div>
                    ) : (
                        <ViewerState
                            icon={
                                <FileText className="size-12 text-gray-400" />
                            }
                            title="No COR Data Available"
                            description="No registration data found for this student."
                        />
                    )}
                </div>
            </div>

            {editing && hasCorData && (
                <EditCor
                    editing={editing}
                    setEditing={setEditing}
                    enrolledStudentId={corData.id}
                />
            )}
        </div>
    );
}

function ViewerState({ icon, title, description, children }) {
    return (
        <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-md text-center">
                <div className="mb-4 flex justify-center">
                    {icon}
                </div>

                <p className="mb-2 text-lg font-medium text-gray-700">
                    {title}
                </p>

                <p className="text-sm text-gray-500">
                    {description}
                </p>

                {children && (
                    <div className="mt-4">
                        {children}
                    </div>
                )}
            </div>
        </div>
    );
}

EnrollmentCorList.layout = (page) => (
    <AuthenticatedLayout>{page}</AuthenticatedLayout>
);