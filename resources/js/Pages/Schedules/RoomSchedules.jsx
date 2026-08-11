import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import React, { useState } from 'react'

export default function RoomSchedules() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();
    const [scheduleType, setScheduleType] = useState('timetable');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDay, setSelectedDay] = useState('');

    const getRoomSchedules = async (id) => {
        const response = await axios.post(
            route('schedules.get-room-schedules'),
            {
                schoolYearId: id,
            }
        );

        return response.data;
    };

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['roomSchedules', selectedSchoolYearEntry?.id],
        queryFn: () => getRoomSchedules(selectedSchoolYearEntry.id),
        enabled: !!selectedSchoolYearEntry?.id,
        staletime: 1000 * 60 * 5,
    });
    return (
        <div>RoomSchedules</div>
    )
}

RoomSchedules.layout = page => <AuthenticatedLayout children={page} title={'Room Schedules'} />
