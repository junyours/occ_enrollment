import React from 'react';
import { Mail, Phone, Users } from 'lucide-react';
import { Badge } from '@/Components/ui/badge';
import { Card, CardContent } from '@/Components/ui/card';
import { formatFullName } from '@/Lib/Utils';
import StudentList from './Students/StudentList';

function ContactRow({ icon: Icon, label, value, href }) {
    const Element = href ? 'a' : 'div';

    return (
        <Element
            href={href || undefined}
            className={[
                'flex min-h-[44px] min-w-0 items-center gap-3 rounded-lg px-2 py-2',
                href
                    ? 'transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card'
                    : '',
            ].join(' ')}
        >
            <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-muted-foreground" />

            <div className="min-w-0 flex-1">
                <span className="block text-xs text-muted-foreground">{label}</span>
                <span
                    className={[
                        'mt-0.5 block text-sm leading-5 [overflow-wrap:anywhere]',
                        value ? 'text-foreground' : 'text-muted-foreground',
                    ].join(' ')}
                >
                    {value || 'Not provided'}
                </span>
            </div>
        </Element>
    );
}

function StudentCardSkeleton() {
    return (
        <Card aria-hidden="true" className="overflow-hidden rounded-2xl py-0 shadow-sm">
            <CardContent className="p-4 motion-safe:animate-pulse">
                <div className="flex items-start gap-3">
                    <div className="h-11 w-11 shrink-0 rounded-xl bg-muted" />
                    <div className="min-w-0 flex-1 space-y-2 py-1">
                        <div className="h-4 w-3/4 rounded bg-muted" />
                        <div className="h-3 w-1/2 rounded bg-muted" />
                    </div>
                </div>

                <div className="mt-4 space-y-4 border-t pt-4">
                    <div className="h-9 w-4/5 rounded-lg bg-muted" />
                    <div className="h-9 w-3/5 rounded-lg bg-muted" />
                </div>
            </CardContent>
        </Card>
    );
}

function Students({
    students = [],
    currentPage = 1,
    studentsPerPage = 10,
    isLoading = false,
    nameClass,
}) {
    const studentList = Array.isArray(students) ? students : [];
    const startIndex = (currentPage - 1) * studentsPerPage;
    const currentStudents = studentList.slice(startIndex, startIndex + studentsPerPage);
    const endIndex = startIndex + currentStudents.length;

    return (
        <div className="w-full min-w-0">
            {/* Desktop table: StudentList owns its existing table behavior. */}
            <div className="hidden min-w-0 md:block">
                <StudentList
                    students={students}
                    isLoading={isLoading}
                    nameClass={nameClass}
                />
            </div>

            {/* Mobile cards use the pagination supplied by the parent. */}
            <section aria-label="Students" className="space-y-3 md:hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <h2 className="text-sm font-semibold text-foreground">
                        Students
                    </h2>
                    <p role="status" className="text-xs tabular-nums text-muted-foreground">
                        {isLoading ? (
                            'Loading students…'
                        ) : currentStudents.length > 0 ? (
                            <>{startIndex + 1}–{endIndex} of {studentList.length}</>
                        ) : (
                            <>{studentList.length} students</>
                        )}
                    </p>
                </div>

                <div aria-busy={isLoading}>
                    {isLoading ? (
                        <div className="space-y-3">
                            {[0, 1, 2].map((index) => (
                                <StudentCardSkeleton key={index} />
                            ))}
                        </div>
                    ) : currentStudents.length === 0 ? (
                        <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed bg-muted/20 px-6 py-10 text-center">
                            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                                <Users aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <h3 className="text-sm font-semibold">
                                {studentList.length ? 'No students on this page' : 'No students found'}
                            </h3>
                            <p className="mt-1 max-w-xs text-sm text-muted-foreground">
                                {studentList.length
                                    ? 'Use the pagination controls to choose another page.'
                                    : 'There are no student records to display.'}
                            </p>
                        </div>
                    ) : (
                        <ul className="m-0 grid list-none gap-3 p-0">
                            {currentStudents.map((student, index) => {
                                const email = String(student.email_address ?? '').trim();
                                const contact = String(student.contact_number ?? '').trim();
                                const phone = contact.replace(/[^+\d]/g, '');
                                const gender = String(student.gender ?? '').trim();

                                return (
                                    <li key={student.id ?? student.user_id_no ?? startIndex + index}>
                                        <Card className="overflow-hidden rounded-2xl border-border/80 py-0 shadow-sm">
                                            <CardContent className="p-0">
                                                <div className="flex items-start gap-3 p-4">
                                                    <div
                                                        aria-label={'Student ' + (startIndex + index + 1)}
                                                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-semibold tabular-nums text-primary"
                                                    >
                                                        {String(startIndex + index + 1).padStart(2, '0')}
                                                    </div>

                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="text-base font-semibold leading-snug tracking-tight text-foreground [overflow-wrap:anywhere]">
                                                            {formatFullName(student) || 'Unnamed student'}
                                                        </h3>

                                                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1.5">
                                                            <span className="min-w-0 font-mono text-xs text-muted-foreground [overflow-wrap:anywhere]">
                                                                ID: {student.user_id_no || 'Not provided'}
                                                            </span>
                                                            {gender && (
                                                                <Badge
                                                                    variant="secondary"
                                                                    className="max-w-full whitespace-normal rounded-md px-2 py-0.5 text-xs font-normal [overflow-wrap:anywhere]"
                                                                >
                                                                    {gender}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="border-t border-border/60 bg-muted/20 px-2 py-2">
                                                    <ContactRow
                                                        icon={Mail}
                                                        label="Email"
                                                        value={email}
                                                        href={email ? 'mailto:' + encodeURIComponent(email) : undefined}
                                                    />
                                                    <ContactRow
                                                        icon={Phone}
                                                        label="Contact number"
                                                        value={contact}
                                                        href={/\d/.test(phone) ? 'tel:' + phone : undefined}
                                                    />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </section>
        </div>
    );
}

export default Students;

