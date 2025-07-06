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
import EnrolledStudentList from '../Enrollment/EnrolledStudentList'
import StudentCor from '../Enrollment/StudentCor'
import RoomSchedules from '../Enrollment/ClassScheduling/RoomsSchedules'
import FacultySchedules from '../Enrollment/ClassScheduling/FacultiesSchedules'
import SubjectsSchedules from '../Enrollment/ClassScheduling/SubjectsSchedules'
import SubjectsList from '../Enrollment/SubjectsList'

export default function SchoolYearLayout({ schoolYear, semester, courses, error, courseId, yearlevel, section, yearSectionId, courseName, hashedCourseId, studentIdNo, departmentId }) {

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
                <RoomSchedules schoolYearId={schoolYear.id} departmentId={departmentId} />
            )}

            {getTabValue() === "facultiesSchedules" && (
                <FacultySchedules schoolYearId={schoolYear.id} departmentId={departmentId} />
            )}

            {getTabValue() === "subjectsSchedules" && (
                <SubjectsSchedules schoolYearId={schoolYear.id} departmentId={departmentId} />
            )}

            {getTabValue() === "subjectsList" && (
                <SubjectsList schoolYearId={schoolYear.id}/>
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

            {(yearSectionId && !hashedCourseId) && (
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

            {(yearSectionId && hashedCourseId) && (
                <EnrolledStudentList
                    hashedCourseId={hashedCourseId}
                    courseId={courseId}
                    yearlevel={yearlevel}
                    section={section}
                    yearSectionId={yearSectionId}
                    courseName={courseName}
                    forSchoolYear={true}
                    schoolYear={schoolYear}
                    semester={semester}
                />
            )}

            {(studentIdNo) && (
                <StudentCor
                    courseId={courseId}
                    section={section}
                    yearlevel={yearlevel}
                    studentIdNo={studentIdNo}
                    schoolYearId={schoolYear.id}
                />
            )}
        </div>
    )
}

SchoolYearLayout.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
