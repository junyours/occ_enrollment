import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { convertToAMPM } from '@/Lib/Utils';
import { AlertCircle, BookOpen, Eye, Loader2 } from 'lucide-react';
import { Link } from '@inertiajs/react';

function FacultyVerifiedSubjectListCard({ subjects, schoolYear, facultyId, isLoading, isError }) {

    // Helper function - extract to utils file
    const convertToAMPM = (time) => {
        if (!time) return '';
        const [hour, minute] = time.split(':');
        const hourNum = parseInt(hour);
        const period = hourNum >= 12 ? 'PM' : 'AM';
        const hour12 = hourNum % 12 || 12;
        return `${hour12}:${minute} ${period}`;
    };

    // Helper function to format datetime
    const formatDateTime = (datetime) => {
        if (!datetime) return { date: '—', time: '' };

        const [date, timeRaw] = datetime.split(' ');
        const [hour, minute] = timeRaw?.split(':') || [];
        const time = hour && minute ? convertToAMPM(`${hour}:${minute}`) : '';

        return { date: date || '—', time };
    };

    // Status badge component
    const StatusBadge = ({ status }) => {
        const statusConfig = {
            deployed: { label: 'Deployed', className: 'bg-green-600' },
            verified: { label: 'Ready to Deploy', className: 'bg-blue-600' },
            rejected: { label: 'Rejected', className: 'bg-red-600' },
            submitted: { label: 'Submitted', className: 'bg-gray-500' }
        };

        const config = statusConfig[status];

        if (!config) {
            return <span className="text-gray-400">—</span>;
        }

        return (
            <span className={`inline-block px-2 py-1 text-sm font-medium text-white rounded ${config.className}`}>
                {config.label}
            </span>
        );
    };

    // DateTime display component
    const DateTimeCell = ({ datetime }) => {
        const { date, time } = formatDateTime(datetime);
        return (
            <div>
                <div>{date}</div>
                {time && <div className="text-sm text-gray-600">{time}</div>}
            </div>
        );
    };


    return (
        <Card>
            <CardHeader>
                <CardTitle className='text-lg'>Subject List</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <Loader2 className="w-8 h-8 animate-spin mb-3" />
                        <p className="text-sm">Loading requests...</p>
                    </div>
                ) : isError ? (
                    <div className="flex flex-col items-center justify-center py-12 text-destructive">
                        <AlertCircle className="w-8 h-8 mb-3" />
                        <p className="text-sm font-medium">Failed to load requests</p>
                        <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
                    </div>
                ) : subjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                        <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                        <p className="text-sm font-medium">No requests</p>
                        <p className="text-xs mt-1">Check back later or contact administration</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>#</TableHead>
                                <TableHead>SUBJECT</TableHead>
                                <TableHead>PERIOD</TableHead>
                                <TableHead>VERIFIED AT</TableHead>
                                <TableHead>DEPLOYED AT</TableHead>
                                <TableHead>STATUS</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>

                            {subjects.map((subject, index) => (
                                <>
                                    {/* Midterm Row */}
                                    <TableRow key={`${subject.id}-midterm`}>
                                        <TableCell rowSpan={2} className="align-middle">
                                            {index + 1}.
                                        </TableCell>

                                        <TableCell rowSpan={2} className="align-middle">
                                            {subject.descriptive_title}
                                        </TableCell>

                                        <TableCell>
                                            <span className="text-xs font-semibold text-gray-600 uppercase">Midterm</span>
                                        </TableCell>

                                        <TableCell>
                                            <DateTimeCell datetime={subject.midterm_verified_at} />
                                        </TableCell>

                                        <TableCell>
                                            <DateTimeCell datetime={subject.midterm_deployed_at} />
                                        </TableCell>

                                        <TableCell>
                                            <StatusBadge status={subject.midterm_status} />
                                        </TableCell>

                                        <TableCell rowSpan={2} className="align-middle">
                                            <Link href={route('verified.faculty.subject.students', {
                                                schoolYear: `${schoolYear.start_year}-${schoolYear.end_year}`,
                                                semester: schoolYear.semester_name,
                                                facultyId: facultyId,
                                                yearSectionSubjectsId: subject.hashed_year_section_subject_id
                                            })}>
                                                <Eye className="text-blue-700 cursor-pointer hover:text-blue-900" />
                                            </Link>
                                        </TableCell>
                                    </TableRow>

                                    {/* Final Row */}
                                    <TableRow key={`${subject.id}-final`} className="border-b-2">
                                        <TableCell>
                                            <span className="text-xs font-semibold text-gray-600 uppercase">Final</span>
                                        </TableCell>

                                        <TableCell>
                                            <DateTimeCell datetime={subject.final_verified_at} />
                                        </TableCell>

                                        <TableCell>
                                            <DateTimeCell datetime={subject.final_deployed_at} />
                                        </TableCell>

                                        <TableCell>
                                            <StatusBadge status={subject.final_status} />
                                        </TableCell>
                                    </TableRow>
                                </>
                            ))}
                        </TableBody>
                    </Table>
                )}

            </CardContent>
        </Card>
    )
}

export default FacultyVerifiedSubjectListCard
