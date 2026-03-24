import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Button } from '@/Components/ui/button';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Calendar } from 'lucide-react';
import { useSchoolYearStore } from './useSchoolYearStore';
import { motion } from 'framer-motion';

function SchoolYearPicker({ layout = 'horizontal' }) {
    const {
        schoolYears,
        selectedSchoolYear,
        selectedSemester,
        isLoaded,
        isCollapsed,
        initializeSchoolYears,
        setSelectedSchoolYear,
        setSelectedSemester,
        getAvailableSemesters,
        getSelectedSchoolYearEntry,
        toggleCollapse
    } = useSchoolYearStore();

    const allSemesters = ['First', 'Second', 'Summer'];
    const uniqueSchoolYears = [...new Set(schoolYears.map(sy => `${sy.start_year}–${sy.end_year}`))];
    const availableSemesters = getAvailableSemesters(selectedSchoolYear);

    useEffect(() => {
        initializeSchoolYears();
    }, []);

    useEffect(() => {
        if (selectedSchoolYear && isLoaded) {
            const availableSems = getAvailableSemesters(selectedSchoolYear);
            if (!availableSems.includes(selectedSemester)) {
                setSelectedSemester(availableSems[0] || '');
            }
        }
    }, [selectedSchoolYear, isLoaded]);

    const handleSchoolYearChange = (value) => setSelectedSchoolYear(value);
    const handleSemesterChange = (value) => setSelectedSemester(value);
    const selectedSchoolYearEntry = getSelectedSchoolYearEntry();

    if (!isLoaded) return <div className="p-4"></div>;

    // Smooth easing curve
    const expandTransition = { duration: 0.3, ease: [0.04, 0.62, 0.23, 0.98] };

    // --- VERTICAL LAYOUT ---
    if (layout === 'vertical') {
        return (
            <div className="flex flex-row items-start">
                <motion.div
                    initial={false}
                    animate={{ width: isCollapsed ? "auto" : 0, opacity: isCollapsed ? 1 : 0 }}
                    transition={expandTransition}
                    className="overflow-hidden"
                >
                    <motion.div
                        initial={false}
                        animate={{ x: isCollapsed ? 0 : -20 }}
                        transition={expandTransition}
                        className="w-max"
                    >
                        <Button
                            onClick={toggleCollapse}
                            size="sm"
                            variant="outline"
                            className="h-min w-8 px-0 py-2 flex flex-col items-center justify-center gap-1"
                        >
                            <ChevronRight className="h-4 w-4" />
                            <div className="text-xs [writing-mode:vertical-lr] rotate-180 whitespace-nowrap">
                                {selectedSemester} sem
                            </div>
                            <div className='[writing-mode:vertical-lr] rotate-180'>|</div>
                            <div className="text-xs [writing-mode:vertical-lr] rotate-180 whitespace-nowrap">
                                {selectedSchoolYear}
                            </div>
                        </Button>
                    </motion.div>
                </motion.div>

                <motion.div
                    initial={false}
                    animate={{ width: isCollapsed ? 0 : "auto", opacity: isCollapsed ? 0 : 1 }}
                    transition={expandTransition}
                    className="overflow-hidden"
                >
                    <motion.div
                        initial={false}
                        animate={{ x: isCollapsed ? -20 : 0 }}
                        transition={expandTransition}
                        className="min-w-max"
                    >
                        <Card className="w-min h-min">
                            <CardHeader className='px-2 mt-2 flex flex-row items-center justify-between space-y-0'>
                                <div className="flex items-center gap-2 pr-4">
                                    <CardTitle className='pl-2 text-sm'>School Year</CardTitle>
                                    {!!selectedSchoolYearEntry?.is_current && (
                                        <div className="flex items-center gap-1 text-[10px] text-primary px-1.5 py-0.5 rounded bg-primary/10">
                                            <Calendar className="h-3 w-3" />
                                            <span>Current</span>
                                        </div>
                                    )}
                                </div>
                                <Button onClick={toggleCollapse} size="sm" variant="ghost" className="h-6 w-6 p-0">
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                            </CardHeader>
                            <CardContent className="space-y-2 px-2 pb-2">
                                <div className="w-52 mt-2">
                                    <Select value={selectedSchoolYear} onValueChange={handleSchoolYearChange}>
                                        <SelectTrigger><SelectValue placeholder="Select School Year" /></SelectTrigger>
                                        <SelectContent>
                                            {uniqueSchoolYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-52 mt-2">
                                    <Select value={selectedSemester} onValueChange={handleSemesterChange}>
                                        <SelectTrigger><SelectValue placeholder="Select Semester" /></SelectTrigger>
                                        <SelectContent>
                                            {allSemesters.map(sem => (
                                                <SelectItem key={sem} value={sem} disabled={!availableSemesters.includes(sem)}>{sem}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </motion.div>
            </div>
        );
    }

    // --- HORIZONTAL SELECT ONLY ---
    if (layout === 'horizontal-select-only') {
        return (
            <div className='w-max'>
                <CardContent className='p-0'>
                    <div className="flex gap-1 items-start">
                        <div className="w-32">
                            <Select value={selectedSchoolYear} onValueChange={handleSchoolYearChange}>
                                <SelectTrigger><SelectValue placeholder="Select School Year" /></SelectTrigger>
                                <SelectContent className='gap-0'>
                                    {uniqueSchoolYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-24">
                            <Select value={selectedSemester} onValueChange={handleSemesterChange}>
                                <SelectTrigger><SelectValue placeholder="Select Semester" /></SelectTrigger>
                                <SelectContent>
                                    {allSemesters.map(sem => (
                                        <SelectItem key={sem} value={sem} disabled={!availableSemesters.includes(sem)}>{sem}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </div>
        );
    }

    // --- DEFAULT HORIZONTAL LAYOUT ---
    return (
        <div className='w-max'>
            <motion.div
                initial={false}
                animate={{
                    height: isCollapsed ? "auto" : 0,
                    opacity: isCollapsed ? 1 : 0
                }}
                transition={expandTransition}
                className="overflow-hidden"
            >
                <motion.div
                    initial={false}
                    animate={{ y: isCollapsed ? 0 : -20 }}
                    transition={expandTransition}
                    className="w-max"
                >
                    <Button onClick={toggleCollapse} size="sm" variant="outline" className="flex items-center gap-2">
                        <ChevronDown className="h-4 w-4" />
                        <span className="text-xs">{selectedSchoolYear} | {selectedSemester} sem</span>
                    </Button>
                </motion.div>
            </motion.div>

            <motion.div
                initial={false}
                animate={{
                    height: isCollapsed ? 0 : "auto",
                    width: isCollapsed ? 188 : "auto",
                    opacity: isCollapsed ? 0 : 1
                }}
                transition={expandTransition}
                className="overflow-hidden"
            >
                <motion.div
                    initial={false}
                    animate={{ y: isCollapsed ? -20 : 0 }}
                    transition={expandTransition}
                    className="w-max min-h-max"
                >
                    <Card className="max-w-max p-2 space-y-2">
                        <CardHeader className='p-0 m-0 flex flex-row items-center justify-between space-y-0'>
                            <div className="flex items-center gap-2 pr-4">
                                <CardTitle className='pl-2 text-sm'>School Year</CardTitle>
                                {!!selectedSchoolYearEntry?.is_current && (
                                    <div className="flex items-center gap-1 text-[10px] text-primary px-1.5 py-0.5 rounded bg-primary/10">
                                        <Calendar className="h-3 w-3" />
                                        <span>Current</span>
                                    </div>
                                )}
                            </div>
                            <Button onClick={toggleCollapse} size="sm" variant="ghost" className="h-6 w-6 p-0 m-0">
                                <ChevronUp className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className='p-0'>
                            <div className="flex gap-2 items-start">
                                <div className="w-44">
                                    <Select value={selectedSchoolYear} onValueChange={handleSchoolYearChange}>
                                        <SelectTrigger><SelectValue placeholder="Select School Year" /></SelectTrigger>
                                        <SelectContent>
                                            {uniqueSchoolYears.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="w-28">
                                    <Select value={selectedSemester} onValueChange={handleSemesterChange}>
                                        <SelectTrigger><SelectValue placeholder="Select Semester" /></SelectTrigger>
                                        <SelectContent>
                                            {allSemesters.map(sem => (
                                                <SelectItem key={sem} value={sem} disabled={!availableSemesters.includes(sem)}>{sem}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        </div>
    );
}

export default SchoolYearPicker;