import React from 'react';
import { Dialog, DialogContent } from '@/Components/ui/dialog';
import UseQueryTable from '@/Components/UseQueryTable';

export default function ViewStudents({ subject, setSubject, schoolYearId }) {

    const columns = [
        {
            header: 'ID Number',
            accessor: 'user_id_no'
        },
        {
            header: 'Student Name',
            render: (row) => {
                const middle = row.middle_name ? ` ${row.middle_name}` : '';
                return `${row.last_name}, ${row.first_name}${middle}`;
            }
        },
        {
            header: 'Course & Year',
            render: (row) => `${row.course_name_abbreviation} - Year ${row.year_level_id}`
        },
        {
            header: 'Section',
            accessor: 'section'
        },
        {
            header: 'Instructor',
            render: (row) => {
                const middle = row.instructor_middle_name ? ` ${row.instructor_middle_name}` : '';
                return `${row.instructor_last_name}, ${row.instructor_first_name}${middle}`;
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
                            tableName={subjectTitle}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}