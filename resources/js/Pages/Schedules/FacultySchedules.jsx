import TimetableSkeleton from '@/Components/Skeletons/TimTableSckeleton';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatFullName, getRandomNumber } from '@/Lib/Utils';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import React, { useMemo, useState } from 'react';
import TimeTable from '../ScheduleFormats/ModernTimtable/TimeTable';
import TabularSchedule from '../ScheduleFormats/TabularSchedule';
import DayFilter from './DayFilter';
import { filterSchedulesByDays } from './scheduleDayFilter';
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

// ============================================================
// Utility Functions
// ============================================================

/**
 * Calculate total hours from schedules (lecture + laboratory)
 */
const calculateTotalHours = (schedules = []) => {
    return schedules.reduce((total, schedule) => {
        return total + (schedule.lecture_hours || 0) + (schedule.laboratory_hours || 0);
    }, 0);
};

/**
 * Filter faculties based on search and selected days.
 */
const filterFaculties = (faculties, searchQuery, selectedDays) => {
    if (!faculties) return [];

    return faculties.filter(faculty => {
        const matchesSearch = formatFullName(faculty)
            .toLowerCase()
            .includes(searchQuery.toLowerCase());

        if (!selectedDays.length) return matchesSearch;

        const matchesDay = filterSchedulesByDays(faculty.schedules, selectedDays).length > 0;

        return matchesSearch && matchesDay;
    });
};

// ============================================================
// Sub-components
// ============================================================

function SearchFilter({ data, searchOpen, onSearchOpenChange, onSelectFaculty }) {
    return (
        <CommandDialog open={searchOpen} onOpenChange={onSearchOpenChange}>
            <Command>
                <CommandInput placeholder="Search faculty..." />
                <CommandList>
                    <CommandEmpty>No faculty found.</CommandEmpty>
                    <CommandGroup heading="Faculty">
                        {data?.map(faculty => (
                            <CommandItem
                                key={faculty.id}
                                value={formatFullName(faculty)}
                                onSelect={(value) => {
                                    onSelectFaculty(value);
                                }}
                            >
                                <span>{formatFullName(faculty)}</span>
                            </CommandItem>
                        ))}
                    </CommandGroup>
                </CommandList>
            </Command>
        </CommandDialog>
    );
}

function FilterBar({ searchQuery, selectedDays, scheduleType, onSearchOpen, onClearSearch, onDayChange, onScheduleTypeChange }) {
    return (
        <Card>
            <CardContent className="p-2">
                <div className="flex gap-2 items-center">
                    {/* Faculty Search */}
                    <div className="flex-1 relative">
                        <Button
                            variant="outline"
                            className="w-full justify-start text-muted-foreground"
                            onClick={() => onSearchOpen(true)}
                        >
                            <Search />
                            <span className="ml-2">
                                {searchQuery ? `Faculty: ${searchQuery}` : 'Search faculty...'}
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
                    <DayFilter selectedDays={selectedDays} onChange={onDayChange} />

                    {/* Schedule View Toggle */}
                    <Tabs value={scheduleType} onValueChange={onScheduleTypeChange} className="w-max">
                        <TabsList className="grid max-w-max grid-cols-2">
                            <TabsTrigger value="tabular" className="w-28">Tabular</TabsTrigger>
                            <TabsTrigger value="timetable" className="w-28">Timetable</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </CardContent>
        </Card>
    );
}

function FacultyCard({ faculty, scheduleType, selectedDays }) {
    const filteredSchedules = useMemo(
        () => filterSchedulesByDays(faculty.schedules, selectedDays),
        [faculty.schedules, selectedDays]
    );

    const totalHours = useMemo(
        () => calculateTotalHours(filteredSchedules),
        [filteredSchedules]
    );

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="text-3xl pb-4">
                    {formatFullName(faculty)} | {totalHours.toFixed(1)} hr
                </CardTitle>
            </CardHeader>
            <CardContent>
                {scheduleType === 'timetable' ? (
                    <TimeTable data={filteredSchedules} />
                ) : (
                    <TabularSchedule data={filteredSchedules} type="faculty" />
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
                        Page {currentPage} of {totalPages} ({totalSchedules} total)
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

function ContentRenderer({ isLoading, isError, error, data, filteredData, paginatedData, scheduleType, selectedDays }) {
    if (isLoading) {
        return Array.from({ length: getRandomNumber(4, 8) }).map((_, i) => (
            <TimetableSkeleton key={i} />
        ));
    }

    if (isError) {
        return (
            <p className="text-center text-red-500">
                Error getting faculty schedules: {error?.message}
            </p>
        );
    }

    if (!data?.length) {
        return <p className="text-center text-gray-500">No faculty schedules available.</p>;
    }

    if (!filteredData.length) {
        return <p className="text-center text-gray-500">No schedules found.</p>;
    }

    return paginatedData.map(faculty => (
        <FacultyCard key={faculty.id} faculty={faculty} scheduleType={scheduleType} selectedDays={selectedDays} />
    ));
}

// ============================================================
// Main Component
// ============================================================

export default function FacultySchedules() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const [scheduleType, setScheduleType] = useState('timetable');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDays, setSelectedDays] = useState([]);
    const [searchOpen, setSearchOpen] = useState(false);

    // Fetch faculty schedules
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['facultySchedules', selectedSchoolYearEntry?.id],
        queryFn: async () => {
            const response = await axios.post(
                route('schedules.get-faculty-schedules'),
                { schoolYearId: selectedSchoolYearEntry.id }
            );
            return response.data;
        },
        enabled: !!selectedSchoolYearEntry?.id,
        staleTime: 1000 * 60 * 5,
    });

    // Filter faculties
    const filteredData = useMemo(
        () => filterFaculties(data, searchQuery, selectedDays),
        [data, searchQuery, selectedDays]
    );

    // Pagination
    const totalSchedules = filteredData.length;
    const totalPages = Math.ceil(totalSchedules / SCHEDULES_PER_PAGE);
    const paginatedData = filteredData.slice(
        (currentPage - 1) * SCHEDULES_PER_PAGE,
        currentPage * SCHEDULES_PER_PAGE
    );

    // Handlers
    const handleSelectFaculty = (value) => {
        setSearchQuery(value);
        setCurrentPage(1);
        setSearchOpen(false);
    };

    const handleClearSearch = () => {
        setSearchQuery('');
        setCurrentPage(1);
    };

    const handleDaysChange = (days) => {
        setSelectedDays(days);
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
                selectedDays={selectedDays}
                scheduleType={scheduleType}
                onSearchOpen={setSearchOpen}
                onClearSearch={handleClearSearch}
                onDayChange={handleDaysChange}
                onScheduleTypeChange={setScheduleType}
            />

            <SearchFilter
                data={data}
                searchOpen={searchOpen}
                onSearchOpenChange={setSearchOpen}
                onSelectFaculty={handleSelectFaculty}
            />

            <ContentRenderer
                isLoading={isLoading}
                isError={isError}
                error={error}
                data={data}
                filteredData={filteredData}
                paginatedData={paginatedData}
                scheduleType={scheduleType}
                selectedDays={selectedDays}
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

FacultySchedules.layout = page => (
    <AuthenticatedLayout children={page} title="Faculty Schedules" />
);
