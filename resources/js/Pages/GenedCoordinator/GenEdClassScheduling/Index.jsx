import { PageTitle } from '@/Components/ui/PageTitle';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react'
import ClassList from './ClassList';
import ScheduleToolbar from './ScheduleToolbar';
import { AlertCircle, BookOpen } from 'lucide-react';
import Scheduling from './Scheduling';
import useScheduleStore from './useClassScheduleStore';
import InstructorSchedules from './InstructorSchedules';
import RoomSchedules from './RoomSchedules';
import { formatFullName } from '@/Lib/Utils';

export default function Index({ course, yearlevel, section }) {
    const { selectedSchoolYearEntry } = useSchoolYearStore();

    if (!course) return <CourseSectionsSkeleton />

    const getSubjects = async () => {
        const response = await axios.post('', {
            schoolYearId: selectedSchoolYearEntry.id,
        })
        return response.data;
    };

    const { data = [], isLoading, isError, refetch } = useQuery({
        queryKey: ['gened-coordinator.subjects', course.id, selectedSchoolYearEntry?.id, yearlevel, section],
        queryFn: getSubjects,
        enabled: !!selectedSchoolYearEntry?.id && !!course.id,
    });

    const [scheduleType, setScheduleType] = useState('tabular');

    const selectedSubject = useScheduleStore(
        (state) => state.selectedSubject
    )

    const setClasses = useScheduleStore(state => state.setClasses);
    setClasses(data)

    const rooms = useScheduleStore(state => state.rooms);
    const instructors = useScheduleStore(state => state.instructors);

    return (
        <div className='space-y-4'>
            <PageTitle align='center'>{course.course_name_abbreviation} - {yearlevel}{section}</PageTitle>

            <ScheduleToolbar className='border' scheduleType={scheduleType} setScheduleType={setScheduleType} />

            {isLoading ? (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                    Loading...
                </div>
            ) : isError ? (
                <div className="flex flex-col items-center justify-center py-12 text-destructive">
                    <AlertCircle className="w-8 h-8 mb-3" />
                    <p className="text-sm font-medium">Failed to load subjects</p>
                    <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
                </div>
            ) : data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No subjects</p>
                    <p className="text-xs mt-1">Check back later or contact administration</p>
                </div>
            ) : (
                <ClassList classes={data} scheduleType={scheduleType} />
            )}

            {!!selectedSubject.id && (
                <Scheduling refetch={refetch} />
            )}

            <div className='flex gap-4'>
                {(selectedSubject.room_id && rooms.length > 0) ? (
                    <RoomSchedules
                        roomId={selectedSubject.room_id}
                        // yearSectionId={yearSectionId}
                        roomName={rooms.find(room => room.id == selectedSubject.room_id)?.room_name}
                    />
                ) : (
                    <></>
                )}

                {(selectedSubject.faculty_id && instructors.length > 0) ? (
                    <>
                        {(() => {
                            const instructor = instructors.find(instructor => instructor.id == selectedSubject.faculty_id)

                            return (
                                <InstructorSchedules
                                    instructorId={selectedSubject.faculty_id}
                                    // yearSectionId={yearSectionId}
                                    instructorName={formatFullName(instructor)}
                                />
                            )
                        })()}
                    </>
                ) : (
                    <></>
                )}
            </div>
        </div>
    )
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
