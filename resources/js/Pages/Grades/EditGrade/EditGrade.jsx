import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatFullName } from '@/Lib/Utils';
import { Head, router } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowBigRight, BookOpen, BookOpenCheck, Loader2, Trash, Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function EditGrade({ gradeEditRequest, classInfo }) {

    const fetchEditRequestGrades = async () => {
        const response = await axios.post(route('edit-request-grades'), {
            editRequestId: gradeEditRequest?.id,
        });
        return response.data;
    };

    const { data: students = [], isLoading, isError } = useQuery({
        queryKey: ['edit-request-grades', gradeEditRequest?.id],
        queryFn: fetchEditRequestGrades,
        enabled: !!gradeEditRequest?.id,
        staleTime: 1000 * 60 * 5,
    });


    const parsedChanges = (() => {
        let c = gradeEditRequest.changes;

        if (!c) return [];
        if (Array.isArray(c)) return c;

        if (typeof c === "string") {
            const cleaned = c
                .trim()
                .replace(/^"|"$/g, "")
                .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":')
                .replace(/,(\s*[\]}])/g, '$1');

            try {
                return JSON.parse(cleaned);
            } catch {
                return [];
            }
        }

        return [];
    })();


    const [changes, setChanges] = useState(parsedChanges);
    const [debounceTimers, setDebounceTimers] = useState({});

    function handleGradeChange(id, grade, value) {
        if (value > 5) return;

        // Remove empty
        if (value === "") {
            // Clear any pending timer for this id
            if (debounceTimers[id]) {
                clearTimeout(debounceTimers[id]);
                setDebounceTimers(prev => {
                    const updated = { ...prev };
                    delete updated[id];
                    return updated;
                });
            }
            setChanges(prev => prev.filter(c => c.id !== id));
            return;
        }

        // Allow only numbers 0-5 with at most 1 decimal
        const valid = /^(\d{1})(\.\d{0,1})?$/.test(value);
        if (!valid) return;

        // Prevent values > 5
        if (parseFloat(value) > 5) return;

        // Clear existing timer for this id
        if (debounceTimers[id]) {
            clearTimeout(debounceTimers[id]);
        }

        // Update changes immediately for display
        setChanges(prev => {
            const index = prev.findIndex(c => c.id === id);
            if (index !== -1) {
                const updated = [...prev];
                updated[index] = { ...updated[index], newGrade: value };
                return updated;
            }
            return [...prev, { id, originalGrade: grade, newGrade: value }];
        });

        // Set 5-second delay before processing
        const timer = setTimeout(() => {
            setChanges(prev =>
                prev.map(c => {
                    if (c.id === id) {
                        const numValue = parseFloat(c.newGrade);
                        const clamped = Math.min(5, Math.max(0, Math.round(numValue * 10) / 10));
                        // Add .0 if no decimal
                        const formatted = clamped % 1 === 0 ? `${clamped}.0` : clamped.toString();
                        return { ...c, newGrade: formatted };
                    }
                    return c;
                })
            );

            // Clean up timer
            setDebounceTimers(prev => {
                const updated = { ...prev };
                delete updated[id];
                return updated;
            });
        }, 5000);

        // Store timer
        setDebounceTimers(prev => ({ ...prev, [id]: timer }));
    }

    const submitChanges = () => {
        router.post(route('submit-edit-request-changes'),
            {
                editRequestId: gradeEditRequest?.id,
                changes: changes,
            },
            {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => {
                    toast.success("Changes submitted successfully");
                },
                onError: () => {
                    toast.error("Failed to submit changes");
                },
            }
        );
    }

    return (
        <div className='space-y-4'>
            <Head title="Grade Edit Request" />
            <PageTitle align='center'>{classInfo.descriptive_title} | {classInfo.course_name_abbreviation}-{classInfo.year_level_id + classInfo.section}</PageTitle>
            <div className='flex gap-4'>
                <Card className="shadow-sm w-full">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-xl flex items-center gap-2 justify-between">
                            <div className='text-xl flex items-center gap-2'>
                                <BookOpenCheck className="w-5 h-5" />
                                {gradeEditRequest.period.toUpperCase()} GRADE
                            </div>
                            <div
                                className={`underline ${gradeEditRequest.status === 'pending'
                                    ? 'text-yellow-500'
                                    : gradeEditRequest.status === 'approved'
                                        ? 'text-green-500'
                                        : gradeEditRequest.status === 'rejected'
                                            ? 'text-red-500'
                                            : gradeEditRequest.status === 'submitted'
                                                ? 'text-blue-500'
                                                : 'text-gray-500'
                                    }`}
                            >
                                {gradeEditRequest.status.toUpperCase()}
                            </div>
                        </CardTitle>
                        <CardDescription>
                            {students.length > 0 && `${students.length} Students`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                                <p className="text-sm">Loading students...</p>
                            </div>
                        ) : isError ? (
                            <div className="flex flex-col items-center justify-center py-12 text-destructive">
                                <AlertCircle className="w-8 h-8 mb-3" />
                                <p className="text-sm font-medium">Failed to load students</p>
                                <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
                            </div>
                        ) : students.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                                <p className="text-sm font-medium">No students</p>
                                <p className="text-xs mt-1">Check back later or contact administration</p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="font-semibold">Student</TableHead>
                                            <TableHead className="font-semibold">Grade</TableHead>
                                            <TableHead></TableHead>
                                            <TableHead className="font-semibold w-24">To Change</TableHead>
                                            <TableHead></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {students.map((student) => (
                                            <TableRow
                                                key={student.user_id_no}
                                                className="group hover:bg-muted/50 transition-colors"
                                            >
                                                <TableCell className="font-medium whitespace-nowrap w-[250px]">
                                                    <div className="flex items-center gap-2">

                                                        <span className="font-mono text-sm">{formatFullName(student)}</span>
                                                    </div>
                                                </TableCell>

                                                <TableCell className="whitespace-nowrap flex justify-end">
                                                    {gradeEditRequest.status == 'submitted' ? (
                                                        <>
                                                            {(() => {
                                                                const change = changes.find(c => c.id == student.id);

                                                                if (!!change) {
                                                                    return (
                                                                        <span
                                                                            className={`font-mono text-sm ${change?.originalGrade == 0 ? 'text-red-500' : ''}`}
                                                                        >
                                                                            {change ? change.originalGrade.toFixed(1) : ''}
                                                                        </span>
                                                                    );
                                                                } else {
                                                                    return (
                                                                        <span
                                                                            className={`font-mono text-sm ${change?.originalGrade == 0 ? 'text-red-500' : ''}`}
                                                                        >
                                                                            {student.grade.toFixed(1)}
                                                                        </span>
                                                                    );
                                                                }
                                                            })()}
                                                        </>
                                                    ) : (
                                                        <span className={`font-mono text-sm ${student.grade == 0 ? 'text-red-500' : ''}`}>{student.grade.toFixed(1)}</span>
                                                    )}
                                                </TableCell>

                                                <TableCell className='w-10'>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-mono text-sm">
                                                            <ArrowBigRight />
                                                        </span>
                                                    </div>
                                                </TableCell>

                                                <TableCell className='w-10'>
                                                    {gradeEditRequest.status == 'approved' ? (
                                                        <Input
                                                            value={(() => {
                                                                const change = changes.find(c => c.id == student.id);
                                                                return change ? change.newGrade : '';
                                                            })()}
                                                            onChange={(e) => handleGradeChange(student.id, student.grade, e.target.value)}
                                                            onBlur={() => {
                                                                // Clear any pending timer for this student
                                                                if (debounceTimers[student.id]) {
                                                                    clearTimeout(debounceTimers[student.id]);
                                                                    setDebounceTimers(prev => {
                                                                        const updated = { ...prev };
                                                                        delete updated[student.id];
                                                                        return updated;
                                                                    });
                                                                }

                                                                // Immediately clamp, round, and format on blur
                                                                setChanges(prev =>
                                                                    prev.map(c => {
                                                                        if (c.id === student.id) {
                                                                            const numValue = parseFloat(c.newGrade);
                                                                            const clamped = Math.min(5, Math.max(0, Math.round(numValue * 10) / 10));
                                                                            // Add .0 if no decimal
                                                                            const formatted = clamped % 1 === 0 ? `${clamped}.0` : clamped.toString();
                                                                            return { ...c, newGrade: formatted };
                                                                        }
                                                                        return c;
                                                                    })
                                                                )
                                                            }}
                                                            className="w-20 text-center h-6"
                                                        />
                                                    ) : (
                                                        <>
                                                            {(() => {
                                                                const change = changes.find(c => c.id == student.id);
                                                                return (
                                                                    <span
                                                                        className={`font-mono text-sm ${change?.newGrade == 0 ? 'text-red-500' : ''
                                                                            }`}
                                                                    >
                                                                        {change ? change.newGrade : ''}
                                                                    </span>
                                                                );
                                                            })()}
                                                        </>
                                                    )}
                                                </TableCell>
                                                <TableCell className='w-fit' />
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm h-min w-full">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-xl flex items-center gap-2">
                            <BookOpenCheck className="w-5 h-5" />
                            All Changes
                        </CardTitle>
                        <CardDescription>
                            {changes.length > 0 && `${changes.length} Changes`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Table>
                            <TableBody>
                                {(changes ?? []).length === 0 || (students ?? []).length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center">
                                            No students or changes yet
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    [...changes]
                                        .sort((a, b) => {
                                            const studentA = students.find(s => s.id == a.id)?.last_name ?? '';
                                            const studentB = students.find(s => s.id == b.id)?.last_name ?? '';
                                            return studentA.localeCompare(studentB);
                                        })
                                        .map((change) => {
                                            const student = students.find(s => s.id == change.id);
                                            return (
                                                <TableRow key={change.id}>
                                                    <TableCell>
                                                        {student ? formatFullName(student) : 'Unknown student'}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className='flex'>
                                                            <p className='w-4 text-right'>{change.originalGrade.toFixed(1)}</p>
                                                            <p className='w-5 text-center ml-1'>{' -> '}</p>
                                                            <p className='w-4 text-left'>{change.newGrade}</p>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Trash
                                                            className={`w-4 cursor-pointer ${gradeEditRequest.status === 'approved'
                                                                ? 'text-red-500 hover:text-red-600'
                                                                : 'text-gray-300 cursor-not-allowed'
                                                                }`}
                                                            onClick={() => {
                                                                if (gradeEditRequest.status !== 'approved') return;
                                                                setChanges(prev => prev.filter(c => c.id !== change.id));
                                                            }}
                                                        />
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                )}
                            </TableBody>
                        </Table>
                        <Button className='ml-auto disable:cursor-not-allowed' disabled={changes.length === 0 || gradeEditRequest.status != 'approved'} onClick={submitChanges}>Submit Changes</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

EditGrade.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;