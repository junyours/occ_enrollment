import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageTitle } from '@/components/ui/PageTitle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { FileDown, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import SubjectsList from '../Enrollment/SubjectsList';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { convertToAMPM, formatFullName, formatFullNameFML } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import SchoolYearPicker from '@/components/SchoolYearPicker';
import { useSchoolYearStore } from '@/components/useSchoolYearStore';
import SearchBar from '@/components/ui/SearchBar';
export default function FacultiesReport() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();

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
            setFacultyList(response.data.data);
            setLastPage(response.data.last_page);
        });
    };

    useEffect(() => {
        if (selectedSchoolYearEntry?.id) {
            getEnrollmentRecord();
        }
    }, [selectedSchoolYearEntry?.id, page]);

    const handleReset = async () => {
        setSearch('');
        await axios.post(
            route('faculties-subjects', {
                schoolYearId: selectedSchoolYearEntry.id,
                page: page,
                search: ''
            })
        ).then(response => {
            setFacultyList(response.data.data);
            setLastPage(response.data.last_page);
        });
    };

    const searchOnChange = (e) => {
        console.log("hello")
        setSearch(e.target.value);
    }

    const handleDownload = () => {
        window.open(route('subjects.faculties-download', {
            schoolYearId: selectedSchoolYearEntry.id,
        }), '_blank');
    };

    return (
        <div className='space-y-4'>
            <Head title="Faculty Teaching Load" />
            <PageTitle align='center' className='w-full'>Faculty Teaching Load</PageTitle>

            {/* Enhanced Action Bar Layout */}
            <div className='mt-6 flex flex-col xl:flex-row gap-4 w-full items-start xl:items-stretch'>

                {/* Left Side: Filter and Download */}
                <div className='flex flex-col sm:flex-row gap-4 items-stretch sm:items-center w-full xl:w-auto'>
                    <SchoolYearPicker />

                    <Button
                        onClick={handleDownload}
                        className='bg-green-600 hover:bg-green-700 text-white flex justify-center items-center gap-2 shadow-sm h-full min-h-[44px] px-6 transition-all duration-200'
                    >
                        Download
                        <FileDown size={18} />
                    </Button>
                </div>

                {/* Right Side: Search Bar */}
                <div className='flex-1 w-full flex items-center'>
                    <div className='w-full'>
                        <SearchBar
                            value={search}
                            onSearch={getEnrollmentRecord}
                            onClear={handleReset}
                            onChange={searchOnChange}
                        />
                    </div>
                </div>
            </div>

            {/* Card Layout Below */}
            <Card className='shadow-sm'>
                <CardContent className='pt-4'>
                    <div className="flex flex-1 items-center justify-between text-sm font-medium transition-all text-left [&[data-state=open]>svg]:rotate-180 hover:no-underline py-2 border-b">
                        <div className="w-80">Faculty Name</div>
                        <div className="ml-2 w-72">Schedules</div>
                        <div className="w-4 text-transparent">.</div>
                    </div>
                    <Accordion
                        type="single"
                        collapsible
                        className="w-full"
                        defaultValue="item-1"
                    >
                        {facultyList.map(faculty => (
                            <AccordionItem key={faculty.id} value={faculty.id}>
                                <AccordionTrigger className="hover:no-underline py-2">
                                    <span className="font-semibold w-96">{formatFullName(faculty)}</span>
                                    <span className="ml-2 text-sm font-normal w-72">
                                        {faculty.schedules.length}
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent className="flex flex-col gap-4 text-balance">
                                    <Card className="border shadow-none">
                                        <CardContent className='p-0 overflow-x-auto'>
                                            <Table className="min-w-full">
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Subject</TableHead>
                                                        <TableHead>Day</TableHead>
                                                        <TableHead>Time</TableHead>
                                                        <TableHead>Course & Section</TableHead>
                                                        <TableHead className='text-center'>Units</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {faculty.schedules.map(subjects => (
                                                        <React.Fragment key={subjects.id}>
                                                            <TableRow>
                                                                <TableCell className="font-medium">{subjects.descriptive_title}</TableCell>
                                                                <TableCell>{subjects.day}</TableCell>
                                                                <TableCell>
                                                                    {subjects.start_time === "-" ? "-" : `${convertToAMPM(subjects.start_time)} - ${convertToAMPM(subjects.end_time)}`}
                                                                </TableCell>
                                                                <TableCell rowSpan={subjects.secondary_schedule ? 2 : 1} className=''>
                                                                    {subjects.course_name_abbreviation}-{subjects.year_level_id}{subjects.section}
                                                                </TableCell>
                                                                <TableCell rowSpan={subjects.secondary_schedule ? 2 : 1} className='text-center font-medium'>
                                                                    {subjects.credit_units}
                                                                </TableCell>
                                                            </TableRow>
                                                            {subjects.secondary_schedule && (
                                                                <TableRow>
                                                                    <TableCell>
                                                                        {subjects.descriptive_title} <span className='text-xs italic px-2 py-0.5 rounded-full ml-1'>(2nd schedule)</span>
                                                                    </TableCell>
                                                                    <TableCell>{subjects.secondary_schedule.day}</TableCell>
                                                                    <TableCell >
                                                                        {subjects.secondary_schedule.start_time === "-" ? "-" : `${convertToAMPM(subjects.secondary_schedule.start_time)} - ${convertToAMPM(subjects.secondary_schedule.end_time)}`}
                                                                    </TableCell>
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
                <CardFooter className="border-t rounded-b-lg py-4">
                    <div className='flex w-full justify-between items-center'>
                        <p className="text-sm">
                            Showing page <span className="font-medium ">{page}</span> of <span className="font-medium">{lastPage}</span>
                        </p>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(prev => prev - 1)}
                                className="px-4 py-2 border text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                Previous
                            </button>
                            <button
                                disabled={page === lastPage}
                                onClick={() => setPage(prev => prev + 1)}
                                className="px-4 py-2 border text-sm font-medium rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

FacultiesReport.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
