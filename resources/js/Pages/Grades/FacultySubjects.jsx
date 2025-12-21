import { Card, CardContent } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import FacultySubjectListCard from './FacultySubjectListCard';
import { useQuery } from '@tanstack/react-query';

function FacultySubjects({ faculty, schoolYear }) {
    const fetchFacultySubjects = async () => {
        const response = await axios.post(route('grades.faculty.subjects', { schoolYear: `${schoolYear.start_year}-${schoolYear.end_year}`, semester: schoolYear.semester_name, facultyId: faculty.user_id_no }), {
            facultyId: faculty.id,
            schoolYearId: schoolYear.id,
        });
        return response.data;
    };

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['grades.faculty.subjects', schoolYear?.id, faculty?.id],
        queryFn: fetchFacultySubjects,
        enabled: !!faculty?.id && !!schoolYear?.id,
    });

    return (
        <div className='space-y-4'>
            <Head title='Instructor Subjects' />
            <div className='flex gap-2'>
                <Card className='w-max'>
                    <CardContent className='px-4 py-2'>
                        <h1>{faculty.name.toUpperCase()}</h1>
                    </CardContent>
                </Card>
            </div>
            <FacultySubjectListCard subjects={data} schoolYear={schoolYear} facultyId={faculty.user_id_no} isLoading={isLoading} isError={isError}/>
        </div>
    )
}

export default FacultySubjects
FacultySubjects.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
