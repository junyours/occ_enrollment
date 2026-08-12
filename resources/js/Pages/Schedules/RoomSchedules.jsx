import TimetableSkeleton from '@/Components/Skeletons/TimTableSckeleton';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/Components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { getRandomNumber } from '@/Lib/Utils';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import TimeTable from '../ScheduleFormats/ModernTimtable/TimeTable';
import TabularSchedule from '../ScheduleFormats/TabularSchedule';
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/Components/ui/command';

// ============================================================
// Constants
// ============================================================

const SCHEDULES_PER_PAGE = 5;

const DAYS_OF_WEEK = [
    'monday', 'tuesday', 'wednesday', 'thursday',
    'friday', 'saturday', 'sunday'
];

const DAY_OPTIONS = [
    { value: 'all', label: 'All Days' },
    ...DAYS_OF_WEEK.map(day => ({
        value: day,
        label: day.charAt(0).toUpperCase() + day.slice(1)
    }))
];

// ============================================================
// Utility Functions
// ============================================================

/**
 * Check if a day format string contains the target day
 * Handles: "Monday", "Monday-Wednesday", "Mon,Wed,Fri"
 */
const hasDayInSchedule = (dayFormat, targetDay) => {
    if (!dayFormat) return false;

    const dayLowercase = dayFormat.toLowerCase();
    const targetLowercase = targetDay.toLowerCase();
    const targetShort = targetLowercase.slice(0, 3);

    // Single day: "Monday"
    if (!dayLowercase.includes('-') && !dayLowercase.includes(',')) {
        return (
            dayLowercase === targetLowercase ||
            dayLowercase === targetShort
        );
    }

    // Consecutive days: "Monday-Wednesday"
    if (dayLowercase.includes('-') && !dayLowercase.includes(',')) {
        return dayLowercase
            .split('-')
            .some(day => {
                const trimmed = day.trim();
                return trimmed === targetLowercase || trimmed === targetShort;
            });
    }

    // Alternating/Multiple days: "Mon,Wed,Fri"
    if (dayLowercase.includes(',')) {
        return dayLowercase
            .split(',')
            .map(day => day.trim())
            .some(day => day === targetLowercase || day === targetShort);
    }

    return false;
};

/**
 * Calculate total hours for a room's schedules
 */
const calculateTotalHours = (schedules = []) => {
    return schedules.reduce((total, schedule) => {
        const { start_time, end_time, day } = schedule;

        // Skip TBA or invalid times
        if (!start_time || !end_time || start_time === 'TBA' || end_time === 'TBA') {
            return total;
        }

        const [startHour, startMinute] = start_time.split(':').map(Number);
        const [endHour, endMinute] = end_time.split(':').map(Number);

        const durationHours = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / 60;
        const dayCount = day?.split(',').filter(Boolean).length || 1;

        return total + (durationHours * dayCount);
    }, 0);
};

/**
 * Filter rooms based on search query and selected day
 */
const filterRooms = (rooms, searchQuery, selectedDay) => {
    if (!rooms) return [];

    return rooms.filter(room => {
        const matchesSearch = room.room_name
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase());

        if (!selectedDay) return matchesSearch;

        const matchesDay = room.schedules?.some(schedule =>
            hasDayInSchedule(schedule.day, selectedDay)
        );

        return matchesSearch && matchesDay;
    });
};

/**
 * Get today's day name (lowercase)
 */
const getTodayDayName = () => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[new Date().getDay()];
};

// ============================================================
// Sub-components
// ============================================================

function SearchFilter({ data, searchOpen, onSearchOpenChange, onSelectRoom }) {
    return (
        <CommandDialog open={searchOpen} onOpenChange={onSearchOpenChange}>
            <Command>
                <CommandInput placeholder="Search room..." />
                <CommandList>
                    <CommandEmpty>No room found.</CommandEmpty>
                    <CommandGroup heading="Rooms">
                        {data?.map(room => (
                            <CommandItem
                                key={room.id}
                                value={room.room_name}
                                onSelect={(value) => {
                                    onSelectRoom(value);
                                }}
                            >
                                <span>{room.room_name}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </CommandDialog>
    );
}

function FilterBar({ searchQuery, selectedDay, scheduleType, onSearchOpen, onClearSearch, onDayChange, onScheduleTypeChange }) {
    const todayDay = getTodayDayName();

    return (
        <Card>
            <CardContent className="p-2">
                <div className="flex gap-2 items-center">
                    {/* Room Search */}
                    <div className="flex-1 relative">
                        <Button
                            variant="outline"
                            className="w-full justify-start text-muted-foreground"
                            onClick={() => onSearchOpen(true)}
                        >
                            <Search />
                            <span className="ml-2">
                                {searchQuery ? `Room: ${searchQuery}` : 'Search rooms...'}
                            </span>
                        </Button>

                        {searchQuery && (
                            <button
                                onClick={onClearSearch}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Day Filter */}
                    <Select value={selectedDay || 'all'} onValueChange={onDayChange}>
                        <SelectTrigger className="w-40">
                            <SelectValue placeholder="Filter by day" />
                        </SelectTrigger>
                        <SelectContent>
                            {DAY_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                    <span className={option.value === todayDay ? 'text-blue-600 font-semibold' : ''}>
                                        {option.label}
                                    </span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* Schedule View Toggle */}
                    <Tabs value={scheduleType} onValueChange={onScheduleTypeChange} className="w-max">
                        <TabsList className="grid max-w-max grid-cols-2">
                            <TabsTrigger value="tabular" className="w-28">Tabular</TabsTrigger>
                            <TabsTrigger value="timetable" className="w-28">Timetable</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardContent>
        </Card >
    );
}

function RoomCard({ room, scheduleType, selectedDay }) {
    const filteredSchedules = useMemo(() => {
        if (!selectedDay || !room.schedules) return room.schedules;

        return room.schedules
            .filter(schedule => hasDayInSchedule(schedule.day, selectedDay))
            .map(schedule => ({
                ...schedule,
                day: selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)
            }));
    }, [room.schedules, selectedDay]);

    const totalHours = useMemo(
        () => calculateTotalHours(filteredSchedules),
        [filteredSchedules]
    );

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-3xl pb-4">
                    {room.room_name} | {totalHours.toFixed(1)} hr
                </CardTitle>
            </CardHeader>
            <CardContent>
                {scheduleType === 'timetable' ? (
                    <TimeTable data={filteredSchedules} />
                ) : (
                    <TabularSchedule data={filteredSchedules} type="room" />
                )}
            </CardContent>
        </Card>
    );
}

function PaginationControls({ currentPage, totalPages, totalSchedules, onPrevPage, onNextPage }) {
    if (totalPages <= 1) return null;

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                        Page {currentPage} of {totalPages} ({totalSchedules} rooms)
                    </p>
                    <div className="flex gap-2">
                        <Button
                            onClick={onPrevPage}
                            disabled={currentPage === 1}
                            variant="outline"
                            size="sm"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            Previous
                        </Button>
                        <Button
                            onClick={onNextPage}
                            disabled={currentPage === totalPages}
                            variant="outline"
                            size="sm"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ContentRenderer({ isLoading, isError, error, data, filteredData, paginatedData, scheduleType, selectedDay }) {
    if (isLoading) {
        return Array.from({ length: getRandomNumber(4, 8) }).map((_, i) => (
            <TimetableSkeleton key={i} />
        ));
    }

    if (isError) {
        return (
            <p className="text-center text-red-500">
                Error getting room schedules: {error?.message}
            </p>
        );
    }

    if (!data?.length) {
        return <p className="text-center text-gray-500">No room schedules available.</p>;
    }

    if (!filteredData.length) {
        return <p className="text-center text-gray-500">No rooms found.</p>;
    }

    return paginatedData.map(room => (
        <RoomCard key={room.id} room={room} scheduleType={scheduleType} selectedDay={selectedDay} />
    ));
}

// ============================================================
// Main Component
// ============================================================

export default function RoomSchedules() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const [scheduleType, setScheduleType] = useState('timetable');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDay, setSelectedDay] = useState('');
    const [searchOpen, setSearchOpen] = useState(false);

    // Fetch room schedules
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['roomSchedules', selectedSchoolYearEntry?.id],
        queryFn: async () => {
            const response = await axios.post(
                route('schedules.get-room-schedules'),
                { schoolYearId: selectedSchoolYearEntry.id }
            );
            return response.data;
        },
        enabled: !!selectedSchoolYearEntry?.id,
        staleTime: 1000 * 60 * 5,
    });

    // Filter rooms
    const filteredData = useMemo(
        () => filterRooms(data, searchQuery, selectedDay),
        [data, searchQuery, selectedDay]
    );

    // Pagination
    const totalSchedules = filteredData.length;
    const totalPages = Math.ceil(totalSchedules / SCHEDULES_PER_PAGE);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * SCHEDULES_PER_PAGE,
        currentPage * SCHEDULES_PER_PAGE
    );

    // Handlers
    const handleSearchChange = (value) => {
        setSearchQuery(value);
        setCurrentPage(1);
    };

    const handleSelectRoom = (value) => {
        setSearchQuery(value);
        setCurrentPage(1);
        setSearchOpen(false);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setCurrentPage(1);
    };

    const handleDayChange = (value) => {
        setSelectedDay(value === 'all' ? '' : value);
        setCurrentPage(1);
    };

    const handlePrevPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1));
    };

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, totalPages));
    };

    return (
        <div className="space-y-4">
            <FilterBar
                searchQuery={searchQuery}
                selectedDay={selectedDay}
                scheduleType={scheduleType}
                onSearchOpen={setSearchOpen}
                onClearSearch={handleClearSearch}
                onDayChange={handleDayChange}
                onScheduleTypeChange={setScheduleType}
            />

            <SearchFilter
                data={data}
                searchOpen={searchOpen}
                onSearchOpenChange={setSearchOpen}
                onSelectRoom={handleSelectRoom}
            />

            <ContentRenderer
                isLoading={isLoading}
                isError={isError}
                error={error}
                data={data}
                filteredData={filteredData}
                paginatedData={paginatedData}
                scheduleType={scheduleType}
                selectedDay={selectedDay}
            />

            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                totalSchedules={totalSchedules}
                onPrevPage={handlePrevPage}
                onNextPage={handleNextPage}
            />
        </div>
    );
}

RoomSchedules.layout = (page) => (
    <AuthenticatedLayout children={page} title="Room Schedules" />
);