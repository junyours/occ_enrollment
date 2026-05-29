import { PageTitle } from '@/components/ui/PageTitle';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import SubjectsList from '../Enrollment/SubjectsList';
import SchoolYearPicker from '@/components/SchoolYearPicker';
import { useSchoolYearStore } from '@/components/useSchoolYearStore';

function SubjectsReport() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();

    return (
        <div className='space-y-4'>
            <Head title="Promotional Report" />
            <PageTitle align='center' className='w-full'>Subjects Report</PageTitle>
            <div className='mt-2 flex justify-between'>
                <div className='flex gap-2 w-max'>
                    <SchoolYearPicker />
                </div>
            </div>
            {!!selectedSchoolYearEntry && (
                <div className='flex gap-4 w-full'>
                    <SubjectsList schoolYearId={selectedSchoolYearEntry?.id} />
                </div>
            )}
        </div>
    )
}

export default SubjectsReport
SubjectsReport.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
