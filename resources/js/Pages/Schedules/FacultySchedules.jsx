import TimetableSkeleton from '@/Components/Skeletons/TimTableSckeleton';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/Components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { formatFullName, getRandomNumber } from '@/Lib/Utils';
import { useQuery } from '@tanstack/react-query';
import { FileDown, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import React, { useState } from 'react'
import TimeTable from '../ScheduleFormats/ModernTimtable/TimeTable';
import TabularSchedule from '../ScheduleFormats/TabularSchedule';

const SCHEDULES_PER_PAGE = 5;

export default function FacultySchedules() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();
    const [scheduleType, setScheduleType] = useState('timetable');
    const [currentPage, setCurrentPage] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDay, setSelectedDay] = useState('');

    const getFacultySchedules = async (id) => {
        const response = await axios.post(
            route('schedules.get-faculty-schedules'),
            {
                schoolYearId: id,
            }
        );

        return response.data;
    };

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['facultySchedules', selectedSchoolYearEntry?.id],
        queryFn: () => getFacultySchedules(selectedSchoolYearEntry.id),
        enabled: !!selectedSchoolYearEntry?.id,
        staletime: 1000 * 60 * 5,
    });

    // Helper function to parse day format and check if day is in schedule
    const hasDayInSchedule = (dayFormat, targetDay) => {
        if (!dayFormat) return false;

        const dayLowercase = dayFormat.toLowerCase();
        const targetDayLowercase = targetDay.toLowerCase();

        // Single day format: "monday"
        if (!dayLowercase.includes('-') && !dayLowercase.includes(',')) {
            return dayLowercase === targetDayLowercase ||
                dayLowercase.startsWith(targetDayLowercase.slice(0, 3));
        }

        // Consecutive format: "monday-tuesday"
        if (dayLowercase.includes('-')) {
            const parts = dayLowercase.split('-');
            return parts.some(day =>
                day.trim() === targetDayLowercase ||
                day.trim().startsWith(targetDayLowercase.slice(0, 3))
            );
        }

        // Alternating format: "mon,tue,fri"
        if (dayLowercase.includes(',')) {
            const days = dayLowercase.split(',').map(d => d.trim());
            return days.some(day =>
                day === targetDayLowercase ||
                day === targetDayLowercase.slice(0, 3)
            );
        }

        return false;
    };

    // Filter data by search query and day
    const filteredData = data?.filter(faculty => {
        const matchesSearch = formatFullName(faculty).toLowerCase().includes(searchQuery.toLowerCase());

        if (!selectedDay) return matchesSearch;

        const matchesDay = faculty.schedules.some(schedule =>
            hasDayInSchedule(schedule.day, selectedDay)
        );

        return matchesSearch && matchesDay;
    }) || [];

    // Calculate pagination
    const totalSchedules = filteredData.length;
    const totalPages = Math.ceil(totalSchedules / SCHEDULES_PER_PAGE);
    const startIndex = (currentPage - 1) * SCHEDULES_PER_PAGE;
    const endIndex = startIndex + SCHEDULES_PER_PAGE;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    const handleSearchChange = (e) => {
        setSearchQuery(e.target.value);
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
            <Card>
                <CardContent className="p-2">
                    <div className="flex gap-2 items-center">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Search faculty by name..."
                                value={searchQuery}
                                onChange={handleSearchChange}
                                className="pl-10 pr-10"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setCurrentPage(1);
                                    }}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        <Select value={selectedDay || 'all'} onValueChange={handleDayChange}>
                            <SelectTrigger className="w-40">
                                <SelectValue placeholder="Filter by day" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Days</SelectItem>
                                <SelectItem value="monday">Monday</SelectItem>
                                <SelectItem value="tuesday">Tuesday</SelectItem>
                                <SelectItem value="wednesday">Wednesday</SelectItem>
                                <SelectItem value="thursday">Thursday</SelectItem>
                                <SelectItem value="friday">Friday</SelectItem>
                                <SelectItem value="saturday">Saturday</SelectItem>
                                <SelectItem value="sunday">Sunday</SelectItem>
                            </SelectContent>
                        </Select>

                        <Tabs className="w-max" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                            <TabsList className="grid max-w-max grid-cols-2">
                                <TabsTrigger className="w-28" value="tabular">Tabular</TabsTrigger>
                                <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* <Button
                            onClick={() => donwloadExcel()}
                            className="bg-green-600 hover:bg-green-500"
                            variant=""
                        >
                            <FileDown />
                            Excel
                        </Button> */}
                    </div>
                </CardContent>
            </Card>

            {(() => {
                if (isLoading) return (
                    Array.from({ length: getRandomNumber(4, 8) }).map((_, i) => (
                        <TimetableSkeleton key={i} />
                    ))
                )

                if (isError) return (
                    <p className="text-center text-red-500">Error getting faculty schedules: {error.message}</p>
                )

                if (!data) return (
                    <p className="text-center text-gray-500">No faculty schedules available.</p>
                )

                if (filteredData.length === 0) return (
                    <p className="text-center text-gray-500">No schedules found matching "{searchQuery}".</p>
                )

                return (
                    <>
                        {paginatedData.map((faculty) => (
                            <Card id={faculty.id} className="w-full" key={faculty.id}>
                                <CardHeader>
                                    <CardTitle className="text-3xl pb-4">
                                        {formatFullName(faculty)} | {faculty.schedules.reduce((acc, sched) => acc + sched.lecture_hours + sched.laboratory_hours, 0)} hr
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {scheduleType === 'timetable' ? (
                                        <TimeTable data={faculty.schedules} />
                                    ) : (
                                        <TabularSchedule data={faculty.schedules} type="faculty" />
                                    )}
                                </CardContent>
                            </Card>
                        ))}

                        {/* Pagination Controls */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600">
                                        Page {currentPage} of {totalPages} ({totalSchedules} total)
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={handlePrevPage}
                                            disabled={currentPage === 1}
                                            variant="outline"
                                            size="sm"
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                            Previous
                                        </Button>
                                        <Button
                                            onClick={handleNextPage}
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
                    </>
                );
            })()}
        </div>
    );
}

FacultySchedules.layout = page => <AuthenticatedLayout children={page} title={'Faculty Schedules'} />