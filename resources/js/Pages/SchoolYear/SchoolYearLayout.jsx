import React from 'react'
import { usePage, Link, Head } from '@inertiajs/react'
import { PageTitle } from '@/Components/ui/PageTitle'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import {
    Tabs,
    TabsList,
    TabsTrigger,
} from '@/Components/ui/tabs'
import Dashboard from '../Enrollment/Dashboard'
import EnrollmentCourseSection from '../Enrollment/EnrollmentCourseSection'
import ClassScheduling from '../Enrollment/ClassScheduling/ClassScheduling'

export default function SchoolYearLayout({ schoolYear, semester, courses, error, courseId, yearlevel, section, yearSectionId, courseName }) {

    const { url: currentUrl } = usePage()

    const { user } = usePage().props.auth;
    const userRole = user.user_role;

    const basePath = `/school-year/${schoolYear.start_year}-${schoolYear.end_year}/${semester}`

    const course = courses.find(course => `${basePath}/${course.hashed_course_id}` === currentUrl);

    const getTabValue = () => {
        if (currentUrl === basePath) return 'dashboard';
        if (currentUrl === `${basePath}/rooms-schedules`) return 'roomSchedules';
        if (currentUrl === `${basePath}/faculties-schedules`) return 'facultiesSchedules';
        if (currentUrl === `${basePath}/subjects-schedules`) return 'subjectsSchedules';

        if (currentUrl === `${basePath}/subjects-list`) return 'subjectsList';

        const matchedCourse = courses.find(course =>
            currentUrl.startsWith(`${basePath}/${course.hashed_course_id}`)
        );

        if (matchedCourse) {
            return `${basePath}/${matchedCourse.hashed_course_id}`;
        }

        if (yearSectionId) {
            return 'class'
        }

        return 'dashboard';
    };

    return (
        <div className="space-y-4">
            <Head title={`${schoolYear.start_year}-${schoolYear.end_year} ${semester} Semester`} />
            <PageTitle align="center">
                {schoolYear.start_year}-{schoolYear.end_year} {semester} Semester
            </PageTitle>
            <div className='flex gap-4'>

                <Tabs value={getTabValue()} className="">
                    <TabsList>
                        <TabsTrigger value="dashboard" asChild>
                            <Link href={basePath}>Dashboard</Link>
                        </TabsTrigger>
                        {userRole == 'program_head' && (
                            <>
                                <TabsTrigger value="roomSchedules" asChild>
                                    <Link href={`${basePath}/rooms-schedules`}>Rooms</Link>
                                </TabsTrigger>
                                <TabsTrigger value="facultiesSchedules" asChild>
                                    <Link href={`${basePath}/faculties-schedules`}>Faculties</Link>
                                </TabsTrigger>
                                <TabsTrigger value="subjectsSchedules" asChild>
                                    <Link href={`${basePath}/subjects-schedules`}>Subjects</Link>
                                </TabsTrigger>
                            </>
                        )}

                        {userRole == 'registrar' && (
                            <TabsTrigger value="subjectsList" asChild>
                                <Link href={`${basePath}/subjects-list`}>Subjects</Link>
                            </TabsTrigger>
                        )}
                    </TabsList>
                </Tabs>

                {courses.length > 0 && (
                    <Tabs value={getTabValue()}>
                        <TabsList>
                            {courses.map((course) => (
                                <TabsTrigger
                                    value={`${basePath}/${course.hashed_course_id}`}
                                    asChild
                                    key={course.hashed_course_id}
                                >
                                    <Link href={`${basePath}/${course.hashed_course_id}`}>
                                        {course.course_name_abbreviation}
                                    </Link>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                )}
            </div>

            {getTabValue() === "dashboard" && (
                <Dashboard schoolYear={schoolYear} hide={true} />
            )}

            {getTabValue() === "roomSchedules" && (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                    <div className="animate-pulse">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-16 w-16 mx-auto mb-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 8c1.657 0 3 1.343 3 3 0 .68-.232 1.302-.617 1.793A2.995 2.995 0 0012 16m0 0v2m0-2H9m3 0h3"
                            />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold">This section is under construction</h2>
                    <p className="text-sm">We're working on it. Please check back later.</p>
                </div>
            )}

            {getTabValue() === "facultiesSchedules" && (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                    <div className="animate-pulse">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-16 w-16 mx-auto mb-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 8c1.657 0 3 1.343 3 3 0 .68-.232 1.302-.617 1.793A2.995 2.995 0 0012 16m0 0v2m0-2H9m3 0h3"
                            />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold">This section is under construction</h2>
                    <p className="text-sm">We're working on it. Please check back later.</p>
                </div>
            )}

            {getTabValue() === "subjectsSchedules" && (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                    <div className="animate-pulse">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-16 w-16 mx-auto mb-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 8c1.657 0 3 1.343 3 3 0 .68-.232 1.302-.617 1.793A2.995 2.995 0 0012 16m0 0v2m0-2H9m3 0h3"
                            />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold">This section is under construction</h2>
                    <p className="text-sm">We're working on it. Please check back later.</p>
                </div>
            )}

            {getTabValue() === "subjectsList" && (
                <div className="flex flex-col items-center justify-center h-64 text-center text-muted-foreground">
                    <div className="animate-pulse">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-16 w-16 mx-auto mb-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M12 8c1.657 0 3 1.343 3 3 0 .68-.232 1.302-.617 1.793A2.995 2.995 0 0012 16m0 0v2m0-2H9m3 0h3"
                            />
                        </svg>
                    </div>
                    <h2 className="text-lg font-semibold">This section is under construction</h2>
                    <p className="text-sm">We're working on it. Please check back later.</p>
                </div>
            )}

            {course ? (
                <EnrollmentCourseSection
                    error={error}
                    courseId={course.hashed_course_id}
                    course={course}
                    schoolYearId={schoolYear.id}
                    forSchoolYear={true}
                    semester={semester}
                    schoolYear={schoolYear}
                />
            ) : (
                <></>
            )}

            {yearSectionId && (
                <ClassScheduling
                    courseId={courseId}
                    yearlevel={yearlevel}
                    section={section}
                    yearSectionId={yearSectionId}
                    courseName={courseName}
                    forSchoolYear={true}
                    schoolYearId={schoolYear.id}
                />
            )}
        </div>
    )
}

SchoolYearLayout.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
