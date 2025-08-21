import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { FileDown, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import SubjectsList from '../Enrollment/SubjectsList';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/Components/ui/accordion';
import { convertToAMPM, formatFullName, formatFullNameFML } from '@/Lib/Utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Card, CardContent, CardFooter } from '@/Components/ui/card';

function FacultiesReport({ schoolYears }) {
    const uniqueSchoolYears = Array.from(
        new Set(schoolYears.map((sy) => `${sy.start_year}-${sy.end_year}`))
    );

    const [selectedSchoolYear, setSelectedSchoolYear] = useState(uniqueSchoolYears[0] || '');

    const getSemestersForYear = (year) =>
        schoolYears
            .filter((sy) => `${sy.start_year}-${sy.end_year}` === year)
            .map((sy) => sy.semester_name);

    const [selectedSemester, setSelectedSemester] = useState(() => {
        const semesters = getSemestersForYear(selectedSchoolYear);
        return semesters.includes('First') ? 'First' : semesters[0] || '';
    });

    const handleSchoolYearChange = (value) => {
        setSelectedSchoolYear(value);
        const available = getSemestersForYear(value);
        setSelectedSemester(available.includes('First') ? 'First' : available[0] || '');
    };

    const handleSemesterChange = (value) => {
        setSelectedSemester(value);
    };

    const allSemesters = ['First', 'Second', 'Summer'];
    const availableSemesters = getSemestersForYear(selectedSchoolYear);

    // 🔥 FINAL: Find the exact object matching both selected school year AND semester
    const selectedSchoolYearEntry = schoolYears.find(
        (sy) =>
            `${sy.start_year}-${sy.end_year}` === selectedSchoolYear &&
            sy.semester_name === selectedSemester
    );

    const [facultyList, setFacultyList] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [search, setSearch] = useState('');

    const getEnrollmentRecord = async () => {
        await axios.post(
            route('faculties-subjects', {
                schoolYearId: selectedSchoolYearEntry.id,
                page: page,
                search: search
            })
        ).then(response => {
            setFacultyList(response.data.data); // "data" inside paginator
            setLastPage(response.data.last_page); // store last page for controls
        });
    };

    useEffect(() => {
        if (selectedSchoolYearEntry?.id) {
            getEnrollmentRecord();
        }
    }, [selectedSchoolYearEntry?.id, page]); // refetch when page changes

    const handleReset = async () => {
        setSearch('');
        await axios.post(
            route('faculties-subjects', {
                schoolYearId: selectedSchoolYearEntry.id,
                page: page,
                search: ''
            })
        ).then(response => {
            setFacultyList(response.data.data); // "data" inside paginator
            setLastPage(response.data.last_page); // store last page for controls
        });
    };

    const searchOnChange = (e) => {
        setSearch(e.target.value);
    }

    const handleDownload = () => {
        window.open(route('subjects.faculties-download', {
            schoolYearId: selectedSchoolYearEntry.id,
        }), '_blank');
    };

    return (
        <div className='space-y-4'>
            <Head title="Promotional Report" />
            <PageTitle align='center' className='w-full'>Faculties Subjects</PageTitle>
            <div className='mt-2 flex justify-between'>
                <div className='flex gap-2 w-max'>
                    {/* School Year Select */}
                    <div className="flex items-center gap-2">
                        <Select value={selectedSchoolYear} onValueChange={handleSchoolYearChange}>
                            <SelectTrigger className='w-36'>
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
                    <div className="flex items-center gap-2">
                        <Select value={selectedSemester} onValueChange={handleSemesterChange}>
                            <SelectTrigger className='w-28' >
                                <SelectValue placeholder="Select Semester" />
                            </SelectTrigger>
                            <SelectContent >
                                {allSemesters.map((sem) => (
                                    <SelectItem key={sem} value={sem} disabled={!availableSemesters.includes(sem)}>
                                        {sem}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button
                        onClick={handleDownload}
                        size='lg'
                        className={`bg-green-600 hover:bg-green-500`}
                    >
                        Download
                        <FileDown />
                    </Button>
                </div>
                <form
                    className='flex gap-2'
                    onSubmit={(e) => {
                        e.preventDefault(); // stops page reload
                        getEnrollmentRecord();
                    }}
                >
                    <Input
                        className='w-56'
                        value={search}
                        placeholder='search'
                        onChange={searchOnChange}
                    />
                    <Button type="submit">
                        <Search />
                    </Button>
                    {search && (
                        <Button type="button" onClick={handleReset} variant="outline">
                            Reset
                        </Button>
                    )}
                </form>
            </div>

            <Card className=''>
                <CardContent className='pt-2'>
                    <Accordion
                        type="single"
                        collapsible
                        className="w-full"
                        defaultValue="item-1"
                    >
                        {facultyList.map(faculty => (
                            <AccordionItem key={faculty.id} value={faculty.id}>
                                <AccordionTrigger>{formatFullName(faculty)} - {faculty.schedules.length}</AccordionTrigger>
                                <AccordionContent className="flex flex-col gap-4 text-balance">
                                    <Card>
                                        <CardContent className='p-0'>
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Subject</TableHead>
                                                        <TableHead>Day</TableHead>
                                                        <TableHead>Time</TableHead>
                                                        <TableHead className='text-center'>Units</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {faculty.schedules.map(subjects => (
                                                        <React.Fragment key={subjects.id}>
                                                            <TableRow>
                                                                <TableCell>{subjects.descriptive_title}</TableCell>
                                                                <TableCell>{subjects.day}</TableCell>
                                                                <TableCell>
                                                                    {subjects.start_time === "-" ? "-" : `${convertToAMPM(subjects.start_time)} - ${convertToAMPM(subjects.end_time)}`}
                                                                </TableCell>
                                                                <TableCell rowSpan={subjects.secondary_schedule ? 2 : 1} className='text-center'>{subjects.credit_units}</TableCell>
                                                            </TableRow>
                                                            {subjects.secondary_schedule && (
                                                                <TableRow>
                                                                    <TableCell>{subjects.descriptive_title} <span className='text-xs italic'>(2nd schedule)</span></TableCell>
                                                                    <TableCell>{subjects.secondary_schedule.day}</TableCell>
                                                                    <TableCell>
                                                                        {subjects.secondary_schedule.start_time === "-" ? "-" : `${convertToAMPM(subjects.secondary_schedule.start_time)} - ${convertToAMPM(subjects.secondary_schedule.end_time)}`}
                                                                    </TableCell>
                                                                    {/* <TableCell className='text-center'>{subjects.credit_units}</TableCell> */}
                                                                </TableRow>
                                                            )}
                                                        </React.Fragment>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </CardContent>
                                    </Card>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </CardContent>
                <CardFooter>
                    <div className='flex gap-2'>
                        <div className="flex justify-center items-center gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(prev => prev - 1)}
                                className="px-3 py-1 border rounded"
                            >
                                Prev
                            </button>

                            <span>Page {page} of {lastPage}</span>

                            <button
                                disabled={page === lastPage}
                                onClick={() => setPage(prev => prev + 1)}
                                className="px-3 py-1 border rounded"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </CardFooter>
            </Card>

        </div>
    )
}

export default FacultiesReport
FacultiesReport.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
