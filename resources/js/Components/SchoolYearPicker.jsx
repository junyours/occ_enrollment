import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Button } from '@/Components/ui/button';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import { useSchoolYearStore } from './useSchoolYearStore';

function SchoolYearPicker({ layout = 'horizontal' }) {
    const {
        schoolYears,
        selectedSchoolYear,
        selectedSemester,
        isLoaded,
        isCollapsed, // Get from store instead of local state
        initializeSchoolYears,
        setSelectedSchoolYear,
        setSelectedSemester,
        getAvailableSemesters,
        getSelectedSchoolYearEntry,
        toggleCollapse // Use store's toggle function
    } = useSchoolYearStore();

    const allSemesters = ['First', 'Second', 'Summer'];
    const uniqueSchoolYears = [...new Set(schoolYears.map(sy => `${sy.start_year}–${sy.end_year}`))];
    const availableSemesters = getAvailableSemesters(selectedSchoolYear);

    useEffect(() => {
        initializeSchoolYears();
    }, []);

    // Update semester when school year changes
    useEffect(() => {
        if (selectedSchoolYear && isLoaded) {
            const availableSems = getAvailableSemesters(selectedSchoolYear);
            if (!availableSems.includes(selectedSemester)) {
                setSelectedSemester(availableSems[0] || '');
            }
        }
    }, [selectedSchoolYear, isLoaded]);

    const handleSchoolYearChange = (value) => {
        setSelectedSchoolYear(value);
    };

    const handleSemesterChange = (value) => {
        setSelectedSemester(value);
    };

    const selectedSchoolYearEntry = getSelectedSchoolYearEntry();

    if (!isLoaded) {
        return <div className="p-4">Loading...</div>;
    }

    if (layout === 'vertical') {
        return (
            <div className="relative flex flex-row w-max">
                <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                    {/* Collapsed vertical view - shows as arrow button */}
                    <Button
                        onClick={toggleCollapse}
                        size="sm"
                        variant="outline"
                        className="h-min w-8 px-0 py-2 flex flex-col items-center justify-center gap-1"
                    >
                        <ChevronRight className="h-4 w-4" />
                        <div className="text-xs [writing-mode:vertical-lr] rotate-180">
                            {selectedSemester} sem
                        </div>
                        <div className='[writing-mode:vertical-lr] rotate-180'>
                            <span>|</span>
                        </div>
                        <div className="text-xs [writing-mode:vertical-lr] rotate-180">
                            {selectedSchoolYear}
                        </div>
                    </Button>
                </div>

                {!isCollapsed && (
                    <div className={`transition-all duration-300 ease-in-out ${!isCollapsed ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                        {/* Expanded vertical view */}
                        <Card className="w-min h-min">
                            <CardHeader className='px-2 mt-2 flex flex-row items-center justify-between space-y-0'>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className='pl-2'>School Year</CardTitle>
                                        {!!selectedSchoolYearEntry?.is_current && (
                                            <div className="flex items-center gap-1 text-xs text-primary px-2 py-0.5 rounded bg-primary/10">
                                                <Calendar className="h-3 w-3" />
                                                <span>Current</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <Button
                                    onClick={toggleCollapse}
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-2 px-2 pb-2">
                                <div>
                                    {/* School Year Select */}
                                    <div className="w-52 mt-2">
                                        <Select value={selectedSchoolYear} onValueChange={handleSchoolYearChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select School Year" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {uniqueSchoolYears.map((year) => (
                                                    <SelectItem key={year} value={year}>
                                                        {year}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Semester Select */}
                                    <div className="w-52 mt-2">
                                        <Select value={selectedSemester} onValueChange={handleSemesterChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Semester" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allSemesters.map((sem) => (
                                                    <SelectItem
                                                        key={sem}
                                                        value={sem}
                                                        disabled={!availableSemesters.includes(sem)}
                                                    >
                                                        {sem}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        );
    }

    if (layout === 'horizontal-select-only') {
        return (
            <div className='w-max'>
                <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                    {/* Collapsed horizontal view - shows as arrow button */}
                    <Button
                        onClick={toggleCollapse}
                        size="sm"
                        variant="outline"
                        className="flex items-center"
                    >
                        <ChevronDown className="h-4 w-4" />
                        <span className="text-xs">{selectedSchoolYear} | {selectedSemester} sem</span>
                    </Button>
                </div>
                {!isCollapsed && (
                    <div className={`transition-all duration-300 ease-in-out ${!isCollapsed ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                        {/* Expanded horizontal view */}
                            <CardContent className='p-0'>
                                <div className="flex gap-1 items-start">
                                    {/* <div className='h-9 flex items-center'>
                                        <div>SY:</div>
                                    </div> */}
                                    {/* School Year Select */}
                                    <div className="w-32">
                                        <Select value={selectedSchoolYear} onValueChange={handleSchoolYearChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select School Year" />
                                            </SelectTrigger>
                                            <SelectContent className='gap-0'>
                                                {uniqueSchoolYears.map((year) => (
                                                    <SelectItem key={year} value={year}>
                                                        {year}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Semester Select */}
                                    <div className="w-24">
                                        <Select value={selectedSemester} onValueChange={handleSemesterChange}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select Semester" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allSemesters.map((sem) => (
                                                    <SelectItem
                                                        key={sem}
                                                        value={sem}
                                                        disabled={!availableSemesters.includes(sem)}
                                                    >
                                                        {sem}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </CardContent>
                    </div>
                )}
            </div>
        );
    }

    // Vertical layout
    return (
        <div className='w-max'>
            <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                {/* Collapsed horizontal view - shows as arrow button */}
                <Button
                    onClick={toggleCollapse}
                    size="sm"
                    variant="outline"
                    className="flex items-center"
                >
                    <ChevronDown className="h-4 w-4" />
                    <span className="text-xs">{selectedSchoolYear} | {selectedSemester} sem</span>
                </Button>
            </div>
            {!isCollapsed && (

                <div className={`transition-all duration-300 ease-in-out ${!isCollapsed ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                    {/* Expanded horizontal view */}
                    <Card className="max-w-max p-2 space-y-2">
                        <CardHeader className='p-0 m-0 flex flex-row items-center justify-between space-y-0'>
                            <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2">
                                    <CardTitle className='pl-2'>School Year</CardTitle>
                                    {!!selectedSchoolYearEntry?.is_current && (
                                        <div className="flex items-center gap-1 text-xs text-primary px-2 py-0.5 rounded bg-primary/10">
                                            <Calendar className="h-3 w-3" />
                                            <span>Current</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button
                                onClick={toggleCollapse}
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 m-0"
                            >
                                <ChevronUp className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className='p-0'>
                            <div className="flex gap-2 items-start">
                                {/* School Year Select */}
                                <div className="w-44">
                                    <Select value={selectedSchoolYear} onValueChange={handleSchoolYearChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select School Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {uniqueSchoolYears.map((year) => (
                                                <SelectItem key={year} value={year}>
                                                    {year}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Semester Select */}
                                <div className="w-28">
                                    <Select value={selectedSemester} onValueChange={handleSemesterChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Semester" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allSemesters.map((sem) => (
                                                <SelectItem
                                                    key={sem}
                                                    value={sem}
                                                    disabled={!availableSemesters.includes(sem)}
                                                >
                                                    {sem}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}

export default SchoolYearPicker;