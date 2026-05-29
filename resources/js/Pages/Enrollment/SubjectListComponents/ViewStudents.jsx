import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import UseQueryTable from '@/components/UseQueryTable/Index';
import CopyButton from '@/components/ui/CopyButton';
import { formatName } from '@/lib/infoUtils';

export default function ViewStudents({ subject, setSubject, schoolYearId }) {

    const columns = [
        {
            header: 'ID Number',
            accessor: 'user_id_no',
            render: (row) => (
                <div>
                    <CopyButton text={row.user_id_no} size='xs' />
                    <span>{row.user_id_no}</span>
                </div>
            )
        },
        {
            header: 'Student Name',
            render: (row) => {
                const middle = row.middle_name ? ` ${row.middle_name}` : '';
                return `${formatName(row, { format: 'LFM' })}`;
            }
        },
        {
            header: 'Course',
            render: (row) => `${row.course_name_abbreviation}`
        },
        {
            header: 'Year & Section',
            render: (row) => (
                <div>{row.year_level_id}{row.section}</div>
            )
        },
        {
            header: 'Instructor',
            render: (row) => {
                const middle = row.instructor_middle_name ? ` ${row.instructor_middle_name}` : '';
                return `${formatName({first_name: row.instructor_first_name, last_name: row.instructor_last_name, middle_name: row.instructor_middle_name}, { format: 'LFM' })}`;
            }
        },
    ];

    const subjectTitle = subject ? ` Student List: ${subject.subject_code} - ${subject.descriptive_title}` : 'Subject Students';

    return (
        <Dialog open={!!subject} onOpenChange={() => setSubject(null)}>
            <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col px-8 pb-6 pt-4">
                <div className="mt-4 flex-1 overflow-y-autopy-2">
                    {subject && (
                        <UseQueryTable
                            queryKeyPrefix={`subject-students-${subject.id}`}
                            routeName="enrollment.schoolyear.view-subject-students"
                            routeParams={{ schoolYearId }}
                            method="POST"
                            extraData={{ subjectId: subject.id }}
                            columns={columns}
                            limit={10}
                            searchPlaceholder="Search by ID, Name or Instructor..."
                            tableName={subjectTitle}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}