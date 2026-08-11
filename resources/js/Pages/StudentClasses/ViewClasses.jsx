import { Card, CardContent } from '@/Components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import React, { useState } from 'react'
import MobileViewClasses from './MobileViewClasses';
import { useQuery } from '@tanstack/react-query';
import EnrollmentSchedule from './EnrollmentSchedule';
import DownloadableTimetable from './ClassesComponents/DownloadableTimetable';
import { Separator } from '@/Components/ui/separator';
import SchoolYearPicker from '@/Components/SchoolYearPicker';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import DesktopViewClasses from './DesktopViewClasses';
import ClassListSkeleton from './ClassListSkeleton';
import { ErrorState, EmptyState } from './EnhancedStates.jsx';
import CIT_LOGO from "../../../images/departments-logo/cit.webp";
import CBA_LOGO from "../../../images/departments-logo/cba.webp";
import TED_LOGO from "../../../images/departments-logo/ted.webp";
import { Skeleton } from '@/Components/ui/skeleton';

const DAY_ORDER = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7,
    TBA: 99,
};

const Header = ({ scheduleType, setScheduleType, hasSchoolYear }) => (
    <div className='flex flex-col md:flex-row gap-4 items-center md:items-end'>
        <SchoolYearPicker />
        <header className={`flex flex-col md:flex-row gap-4 items-center ${!hasSchoolYear && 'hidden'}`}>
            <Card className='w-min'>
                <CardContent className="p-2">
                    <nav className="flex gap-2 w-min">
                        <Tabs className="w-max" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                            <TabsList className="grid max-w-max grid-cols-2">
                                <TabsTrigger className="w-28" value="list">List</TabsTrigger>
                                <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </nav>
                </CardContent>
            </Card>
        </header>
    </div>
)

function DepartmentHeaderSkeleton() {
    return (
        <div className="flex items-center gap-5  bg-background rounded-lg shadow-sm font-sans">

            {/* Circular Logo Skeleton */}
            <Skeleton className="h-16 w-16 rounded-full shrink-0 bg-muted" />

            {/* Text Container */}
            <div className="flex flex-col gap-3 w-full">
                {/* Title Skeleton (e.g., BSBA-FM — 2F) */}
                <Skeleton className="h-6 w-48 md:w-56 bg-muted" />

                {/* Subtitle Skeleton (e.g., Bachelor Of Science...) */}
                <Skeleton className="h-4 w-[80%] max-w-[600px] bg-muted/80" />
            </div>

        </div>
    );
}

export default function ViewClasses() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();
    const [scheduleType, setScheduleType] = useState('list');

    const toMinutes = (time) => {
        if (!time || time === 'TBA') return Number.MAX_SAFE_INTEGER;
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
    };

    const sortClasses = (classes) => {
        return [...classes].sort((a, b) => {
            const dayDiff =
                (DAY_ORDER[a.day] ?? 99) - (DAY_ORDER[b.day] ?? 99);

            if (dayDiff !== 0) return dayDiff;

            return toMinutes(a.start_time) - toMinutes(b.start_time);
        });
    };

    const fetchStudentCourseSection = async ({ queryKey }) => {
        const [, schoolYearId] = queryKey;

        const response = await axios.post(route('student.course-section'), {
            schoolYearId,
        });

        return response.data;
    }

    const { data: courseSection, error: courseSectionError, isLoading: courseSectionIsLoading, isError: courseSectionIsError } = useQuery({
        queryKey: ['studentCourseSection', selectedSchoolYearEntry?.id],
        queryFn: fetchStudentCourseSection,
        enabled: !!selectedSchoolYearEntry?.id,
    });


    const fetchStudentClasses = async ({ queryKey }) => {
        const [, schoolYearId] = queryKey;

        const response = await axios.post(route('student.classes'), {
            schoolYearId,
        });

        return sortClasses(response.data);
    };

    const { data: classes, error, isLoading, isError } = useQuery({
        queryKey: ['studentClasses', selectedSchoolYearEntry?.id],
        queryFn: fetchStudentClasses,
        enabled: !!selectedSchoolYearEntry?.id,
    });

    const getDepartmentLogo = () => {
        const abbreviation = courseSection?.department_name_abbreviation;

        switch (abbreviation) {
            case 'CIT':
                return CIT_LOGO;
            case 'CBA':
                return CBA_LOGO;
            case 'TED':
                return TED_LOGO;
            default:
                return CIT_LOGO;
        }
    };

    const renderCourseSectionInfo = () => {
        if (courseSectionIsLoading) return <DepartmentHeaderSkeleton />;

        if (courseSectionIsError) {
            return <ErrorState error={courseSectionError} />;
        }

        // Checks if it's null/undefined OR if it's an empty object {}
        if (!courseSection || Object.keys(courseSection).length === 0) {
            return null;
        }

        return (
            <div className="flex flex-col gap-4">
                <div className="flex items-start gap-4">
                    <img src={getDepartmentLogo()} alt="Department Logo" className="h-16 w-16 object-contain" />
                    <div className="flex flex-col space-y-1">
                        <h2 className="text-xl font-bold tracking-tight text-foreground">
                            {courseSection.course_name_abbreviation} &mdash; {courseSection.year_level}{courseSection.section}
                        </h2>
                        <p className="text-sm text-muted-foreground capitalize">
                            {/* Added optional chaining (?.) below */}
                            {courseSection.course_name?.toLowerCase()} {courseSection.major && ` Major in ${courseSection.major.toLowerCase()}`}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const renderContent = () => {
        if (!selectedSchoolYearEntry?.id) return null;

        if (isLoading) return <ClassListSkeleton />;

        if (isError) {
            return <ErrorState error={error} />;
        }

        if (!classes || classes.length === 0) {
            return <EmptyState />;
        }

        if (scheduleType === 'list') {
            return (
                <>
                    {/* Desktop Table View */}
                    <aside className='hidden md:block'>
                        <DesktopViewClasses classes={classes} />
                    </aside>

                    {/* Mobile Card View */}
                    <aside className='md:hidden'>
                        <MobileViewClasses classes={classes} isLoading={isLoading} isError={isError} error={error} />
                    </aside>
                </>
            );
        }

        if (scheduleType === 'timetable') {
            return (
                <DownloadableTimetable classes={classes} schoolYear={selectedSchoolYearEntry} />
            );
        }
    };

    return (
        <main className='space-y-6'>
            <Header scheduleType={scheduleType} setScheduleType={setScheduleType} hasSchoolYear={!!selectedSchoolYearEntry?.id} />

            {renderCourseSectionInfo()}

            {renderContent()}
            <Separator />
            <EnrollmentSchedule />
        </main>
    );
}

ViewClasses.layout = (page) => <AuthenticatedLayout title="Classes" children={page} />;