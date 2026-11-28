import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import StudentSearch from '@/Components/StudentSearch';
import StudentGrades from '../components/StudentGrades';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Button } from '@/Components/ui/button';
import { Search } from 'lucide-react';
import CurriculumAudit from './CurriculumAudit';
import PendingMatches from './PendingMatches';

// By term: the grades as recorded. By curriculum: the grades laid over the student's curriculum.
const VIEWS = [{ key: 'term', label: 'By term' }, { key: 'curriculum', label: 'By curriculum' }];
const VIEW_KEY = 'student-grades-view';
const readView = () => {
    try { return window.localStorage.getItem(VIEW_KEY) === 'curriculum' ? 'curriculum' : 'term'; } catch { return 'term'; }
};

export default function StudentGradesView() {
    const [student, setStudent] = useState('');
    const [view, setView] = useState(readView);
    const [auditVersion, setAuditVersion] = useState(0);     // reloads the curriculum view after an approval in the panel
    const [pendingVersion, setPendingVersion] = useState(0); // reloads the panel after a change in the curriculum view

    const chooseView = (key) => {
        setView(key);
        try { window.localStorage.setItem(VIEW_KEY, key); } catch { /* not critical */ }
    };

    return (
        <div className="container space-y-6">
            <div className='flex gap-4'>
                <StudentSearch onSelect={(data) => setStudent(data)} className='w-full max-w-md h-14' />
                <PageTitle align='center' className='w-full'>Academic Records</PageTitle>
            </div>

            <PendingMatches
                key={pendingVersion}
                onOpenStudent={(idNo) => { setStudent({ user_id_no: idNo }); chooseView('curriculum'); }}
                onDecided={() => setAuditVersion((v) => v + 1)}
            />

            {student ? (
                <div className='space-y-3'>
                    <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="View">
                        {VIEWS.map(({ key, label }) => (
                            <Button key={key} type="button" size="sm" variant={view === key ? 'secondary' : 'ghost'} aria-pressed={view === key} className="h-8 px-3 text-[13px]" onClick={() => chooseView(key)}>
                                {label}
                            </Button>
                        ))}
                    </div>
                    <div className='max-h-[calc(100vh-12rem)] overflow-y-auto'>
                        {view === 'curriculum'
                            ? <CurriculumAudit key={`${student.user_id_no}-${auditVersion}`} idNo={student.user_id_no} onChanged={() => setPendingVersion((v) => v + 1)} />
                            : <StudentGrades studentId={student?.user_id_no} />}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
                    <Search className="h-12 w-12 mb-4" />
                    <p>Select a student to view their academic records.</p>
                </div>
            )}
        </div>
    );
}

StudentGradesView.layout = (page) => <AuthenticatedLayout children={page} title='Academic Records' />
