import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Button } from '@/Components/ui/button';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';

function SchoolYearPicker({ layout = 'vertical' }) {
    const [schoolYears, setSchoolYears] = useState([]);

    const [selectedSchoolYear, setSelectedSchoolYear] = useState(
        () => localStorage.getItem("selectedSchoolYear") || ""
    );
    const [selectedSemester, setSelectedSemester] = useState(
        () => localStorage.getItem("selectedSemester") || ""
    );

    const [availableSemesters, setAvailableSemesters] = useState([]);

    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem("isCollapsed");
        return saved === "true";
    });

    const allSemesters = ["First", "Second", "Summer"];

    // Fetch with daily cache
    const getSchoolYears = async () => {
        const cached = localStorage.getItem("schoolYears");
        const cachedDate = localStorage.getItem("schoolYears_savedAt");
        const today = new Date().toDateString();

        if (cached && cachedDate === today) {
            const parsed = JSON.parse(cached);
            setSchoolYears(parsed);

            if (!localStorage.getItem("selectedSchoolYear") || !localStorage.getItem("selectedSemester")) {
                processDefaultSelection(parsed);
            }
            return;
        }

        try {
            const response = await axios.post("school-years-data");
            const data = response.data || [];

            setSchoolYears(data);
            localStorage.setItem("schoolYears", JSON.stringify(data));
            localStorage.setItem("schoolYears_savedAt", today);

            if (!localStorage.getItem("selectedSchoolYear") || !localStorage.getItem("selectedSemester")) {
                processDefaultSelection(data);
            }
        } catch (error) {
            console.error("Error loading school years:", error);
        }
    };

    const processDefaultSelection = (data) => {
        let defaultYear = data.find(sy => sy.is_current === 1);

        if (!defaultYear && data.length > 0) {
            defaultYear = [...data].sort((a, b) =>
                b.start_year !== a.start_year
                    ? b.start_year - a.start_year
                    : b.end_year - a.end_year
            )[0];
        }

        if (defaultYear) {
            const schoolYearString = `${defaultYear.start_year}-${defaultYear.end_year}`;
            const semesterName = defaultYear.semester.semester_name;

            setSelectedSchoolYear(schoolYearString);
            setSelectedSemester(semesterName);

            const availableSems = data
                .filter(sy =>
                    sy.start_year === defaultYear.start_year &&
                    sy.end_year === defaultYear.end_year
                )
                .map(sy => sy.semester.semester_name);

            setAvailableSemesters(availableSems);
        }
    };

    useEffect(() => {
        getSchoolYears();
    }, []);

    useEffect(() => {
        if (selectedSchoolYear) {
            localStorage.setItem("selectedSchoolYear", selectedSchoolYear);
        }
    }, [selectedSchoolYear]);

    useEffect(() => {
        if (selectedSemester) {
            localStorage.setItem("selectedSemester", selectedSemester);
        }
    }, [selectedSemester]);

    useEffect(() => {
        if (selectedSchoolYear) {
            const [startYear, endYear] = selectedSchoolYear.split("-").map(Number);
            const availableSems = schoolYears
                .filter(sy => sy.start_year === startYear && sy.end_year === endYear)
                .map(sy => sy.semester.semester_name);

            setAvailableSemesters(availableSems);

            if (!availableSems.includes(selectedSemester)) {
                setSelectedSemester(availableSems[0] || "");
            }
        }
    }, [selectedSchoolYear, schoolYears, selectedSemester]);

    const handleSchoolYearChange = (value) => {
        setSelectedSchoolYear(value);
    };
    
    const handleSemesterChange = (value) => {
        setSelectedSemester(value);
    };

    const toggleCollapse = () => {
        setIsCollapsed(prev => {
            const newValue = !prev;
            localStorage.setItem("isCollapsed", newValue);
            return newValue;
        });
    };

    useEffect(() => {
        localStorage.setItem("isCollapsed", isCollapsed);
    }, [isCollapsed]);

    const uniqueSchoolYears = [...new Set(schoolYears.map(sy => `${sy.start_year}-${sy.end_year}`))];

    if (layout === 'horizontal') {
        return (
            <div>
                <div className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                    {/* Collapsed horizontal view - shows as arrow button */}
                    <Button
                        onClick={toggleCollapse}
                        size="sm"
                        variant="outline"
                        className="flex items-center"
                    >
                        <ChevronDown className="h-4 w-4" />
                        <span className="text-xs">{selectedSchoolYear} - {selectedSemester}</span>
                    </Button>
                </div>

                <div className={`transition-all duration-300 ease-in-out ${!isCollapsed ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
                    {/* Expanded horizontal view */}
                    <Card className="max-w-max">
                        <CardHeader className='pb-2 px-2 mt-2 flex flex-row items-center justify-between space-y-0'>
                            <CardTitle>School Year</CardTitle>
                            <Button
                                onClick={toggleCollapse}
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 m-0"
                            >
                                <ChevronUp className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className='p-2 pt-0'>
                            <div className="flex gap-4 items-start">
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
            </div>
        );
    }

    // Vertical layout
    return (
        <div className="relative flex flex-row">
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
                        {selectedSchoolYear}
                    </div>
                    <div className="text-xs [writing-mode:vertical-lr] rotate-180">
                        {selectedSemester}
                    </div>
                </Button>
            </div>

            <div className={`transition-all duration-300 ease-in-out ${!isCollapsed ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'}`}>
                {/* Expanded vertical view */}
                <Card className="w-min h-min">
                    <CardHeader className='px-2 mt-2 flex flex-row items-center justify-between space-y-0'>
                        <CardTitle>School Year</CardTitle>
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
        </div>
    );
}

export default SchoolYearPicker;