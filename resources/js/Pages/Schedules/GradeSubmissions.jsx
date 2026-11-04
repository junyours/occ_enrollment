import UseQueryTable from '@/Components/UseQueryTable/Index';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { BookCheck, CalendarDays } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

const roleLabels = {
    faculty: 'Faculty',
    program_head: 'Program Head',
    evaluator: 'Evaluator',
    registrar: 'Registrar',
    nstp_faculty: 'NSTP Faculty',
};

const count = (row, field) => Number(row[field] ?? 0);

const userName = (row) => {
    const firstNames = [row.first_name, row.middle_name].filter(Boolean).join(' ');
    return [row.last_name, firstNames].filter(Boolean).join(', ') || row.user_id_no;
};

const submissionStatuses = {
    draft: { label: 'Not submitted', className: 'bg-muted text-muted-foreground' },
    submitted: { label: 'Submitted', className: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400' },
    verified: { label: 'Verified', className: 'border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400' },
    rejected: { label: 'Rejected', className: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400' },
    deployed: { label: 'Deployed', className: 'border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400' },
};

function SubmissionStatus({ status = 'draft' }) {
    const appearance = submissionStatuses[status] ?? submissionStatuses.draft;

    return (
        <Badge variant="outline" className={`whitespace-nowrap ${appearance.className}`}>
            {appearance.label}
        </Badge>
    );
}

const subjectColumns = [
    { header: 'Subject Code', accessor: 'subject_code', className: 'whitespace-nowrap' },
    { header: 'Subject', accessor: 'descriptive_title', className: 'min-w-44 font-medium' },
    {
        header: 'Class / Section',
        render: (row) => [...new Set([row.class_code, row.section].filter(Boolean))].join(' · ') || '—',
        className: 'min-w-32',
    },
    {
        header: 'Midterm Status',
        render: (row) => <SubmissionStatus status={row.midterm_status} />,
        className: 'whitespace-nowrap',
    },
    {
        header: 'Final Status',
        render: (row) => <SubmissionStatus status={row.final_status} />,
        className: 'whitespace-nowrap',
    },
];

function SubmissionCount({ row, period }) {
    const submitted = count(row, `${period}_submitted`);
    const total = count(row, 'total_classes');
    const complete = total > 0 && submitted === total;

    return (
        <span className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 font-semibold tabular-nums ${complete ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-muted text-foreground'}`}>
            {submitted} / {total}
        </span>
    );
}

const columns = [
    {
        header: 'ID Number',
        accessor: 'user_id_no',
        className: 'whitespace-nowrap',
    },
    {
        header: 'Name',
        render: (row) => <span className="font-medium">{userName(row)}</span>,
        className: 'min-w-44',
    },
    {
        header: 'Role',
        render: (row) => roleLabels[row.user_role] ?? row.user_role?.replaceAll('_', ' '),
        className: 'whitespace-nowrap',
    },
    {
        header: 'Total Classes',
        accessor: 'total_classes',
        className: 'text-center font-semibold tabular-nums',
    },
    {
        header: 'Midterm Submitted',
        render: (row) => <SubmissionCount row={row} period="midterm" />,
        className: 'min-w-36',
    },
    {
        header: 'Final Submitted',
        render: (row) => <SubmissionCount row={row} period="final" />,
        className: 'min-w-36',
    },
];

export default function GradeSubmissions() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();
    const isLoaded = useSchoolYearStore((state) => state.isLoaded);
    const [inspection, setInspection] = useState(null);
    const schoolYearId = selectedSchoolYearEntry?.id;
    const inspectedUser = inspection && inspection.schoolYearId === schoolYearId ? inspection.user : null;

    useEffect(() => {
        useSchoolYearStore.getState().initializeSchoolYears();
    }, []);

    useEffect(() => {
        setInspection(null);
    }, [schoolYearId]);

    const facultyColumns = useMemo(() => [
        ...columns,
        {
            header: 'Subjects',
            render: (row) => (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    aria-label={`Inspect subjects for ${userName(row)}`}
                    onClick={() => setInspection({ user: row, schoolYearId })}
                >
                    Inspect subjects
                </Button>
            ),
            className: 'whitespace-nowrap',
        },
    ], [schoolYearId]);

    const semester = selectedSchoolYearEntry?.semester?.semester_name;
    const semesterLabel = semester && (/semester/i.test(semester) ? semester : `${semester} Semester`);

    return (
        <Card>
            <CardHeader className="space-y-3">
                <div className="flex items-center gap-2">
                    <BookCheck className="size-5 text-primary" aria-hidden="true" />
                    <CardTitle>Grade Submissions</CardTitle>
                </div>
                <CardDescription>
                    Teaching users with assigned classes in the selected school year and semester.
                </CardDescription>
                {selectedSchoolYearEntry && (
                    <div className="flex items-center gap-2 text-sm font-medium">
                        <CalendarDays className="size-4 text-muted-foreground" aria-hidden="true" />
                        <span>
                            {selectedSchoolYearEntry.start_year}–{selectedSchoolYearEntry.end_year}
                            {semesterLabel ? ` · ${semesterLabel}` : ''}
                        </span>
                    </div>
                )}
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Each count represents a class submission. Submitted, verified, and deployed grades count
                    toward the total; draft and rejected grades still need submission.
                </p>
                {!isLoaded ? (
                    <p className="py-8 text-center text-sm text-muted-foreground" role="status">
                        Loading school years...
                    </p>
                ) : selectedSchoolYearEntry?.id ? (
                    <UseQueryTable
                        key={selectedSchoolYearEntry.id}
                        queryKeyPrefix="academic-dean-grade-submissions"
                        routeName="academic-dean.grade-submissions.data"
                        extraData={{ school_year_id: selectedSchoolYearEntry.id }}
                        columns={facultyColumns}
                        tableName="Faculty Grade Submissions"
                        searchPlaceholder="Search by name, ID number, or role..."
                    />
                ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                        Select a school year and semester in the sidebar to inspect grade submissions.
                    </p>
                )}
            </CardContent>
            <Dialog open={Boolean(inspectedUser)} onOpenChange={(open) => { if (!open) setInspection(null); }}>
                {inspectedUser && (
                    <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-5xl">
                        <DialogHeader>
                            <DialogTitle>Subjects · {userName(inspectedUser)}</DialogTitle>
                            <DialogDescription>
                                {inspectedUser.user_id_no} · {selectedSchoolYearEntry.start_year}–{selectedSchoolYearEntry.end_year}
                                {semesterLabel ? ` · ${semesterLabel}` : ''}
                            </DialogDescription>
                        </DialogHeader>
                        <UseQueryTable
                            key={`${inspectedUser.id}-${schoolYearId}`}
                            queryKeyPrefix={`academic-dean-grade-submission-subjects-${inspectedUser.id}-${schoolYearId}`}
                            routeName="academic-dean.grade-submissions.subjects"
                            routeParams={{ user: inspectedUser.id }}
                            extraData={{ school_year_id: schoolYearId }}
                            columns={subjectColumns}
                            tableName="Subjects and Grade Statuses"
                            searchPlaceholder="Search subjects, classes, or sections..."
                        />
                    </DialogContent>
                )}
            </Dialog>
        </Card>
    );
}

GradeSubmissions.layout = (page) => (
    <AuthenticatedLayout title="Grade Submissions">{page}</AuthenticatedLayout>
);
