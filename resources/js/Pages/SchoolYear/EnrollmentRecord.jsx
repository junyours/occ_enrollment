import { useEffect } from 'react'; // 1. Import useEffect
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { FileDown } from 'lucide-react';
import SchoolYearPicker from '@/Components/SchoolYearPicker';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import UseQueryTable from '@/Components/UseQueryTable/Index';
import CopyButton from '@/Components/ui/CopyButton';
import { formatName } from '@/Lib/InfoUtils';

function EnrollmentRecord() {
    // 2. Destructure initializeSchoolYears from your store
    const { selectedSchoolYearEntry, isLoaded, initializeSchoolYears } = useSchoolYearStore();

    // 3. Add useEffect to trigger the fetch when the component mounts
    useEffect(() => {
        initializeSchoolYears();
    }, [initializeSchoolYears]);

    const handleDownload = () => {
        // Added a safe navigation operator (?) just in case
        if (!selectedSchoolYearEntry) return;

        window.open(route('subjects.students-download', {
            schoolYearId: selectedSchoolYearEntry.id,
        }), '_blank');
    };

    const columns = [
        {
            header: 'STUDENT ID',
            accessor: 'user_id_no',
            render: (row) => (
                <div>
                    <CopyButton text={row.user_id_no} size='xs' />
                    <span>{row.user_id_no}</span>
                </div>
            )
        },
        {
            header: 'NAME',
            render: (row) => {
                return `${formatName(row, { format: 'LFM' })}`;
            }
        },
        {
            header: 'COURSE & SECTION',
            render: (row) => `${row.course_name_abbreviation}-${row.year_level_id}${row.section}`,
        },
        {
            header: 'SUBJECTS',
            className: 'text-center',
            accessor: 'total_subjects',
        },
        {
            header: 'DATE ENROLLED',
            accessor: 'date_enrolled',
        },
    ];

    if (!isLoaded || !selectedSchoolYearEntry) {
        return <div></div>;
    }

    return (
        <div className='space-y-4'>
            <Head title="Enrollment Record" />
            <div className='mt-6 flex flex-col xl:flex-row gap-4 w-full items-start xl:items-stretch'>
                <div className='flex flex-col sm:flex-row gap-4 items-stretch sm:items-center w-full xl:w-auto'>
                    {/* School Year Select */}
                    <SchoolYearPicker />

                    <Button
                        onClick={handleDownload}
                        className='bg-green-600 hover:bg-green-700 text-white flex justify-center items-center gap-2 shadow-sm h-full min-h-[44px] px-6 transition-all duration-200'
                    >
                        Download
                        <FileDown size={18} />
                    </Button>
                </div>
            </div>
            <Card>
                <CardContent className='pt-4'>
                    <UseQueryTable
                        queryKeyPrefix={`enrollment-record-${selectedSchoolYearEntry.id}`}
                        routeName="enrollment-record.students"
                        routeParams={{ schoolYearId: selectedSchoolYearEntry.id }}
                        method="GET"
                        columns={columns}
                        limit={10}
                        searchPlaceholder="Search by ID, Name..."
                        tableName={'Enrollment Record'}
                    />
                </CardContent>
            </Card>
        </div>
    )
}

export default EnrollmentRecord
EnrollmentRecord.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;