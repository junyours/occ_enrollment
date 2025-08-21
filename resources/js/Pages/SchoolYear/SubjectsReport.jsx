import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { FileDown, Search } from 'lucide-react';
import React, { useState } from 'react'
import SubjectsList from '../Enrollment/SubjectsList';

function SubjectsReport({ schoolYears }) {
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

    const [studentList, setStudentList] = useState([]);
    const [page, setPage] = useState(1);
    const [lastPage, setLastPage] = useState(1);
    const [search, setSearch] = useState('');

    const searchOnChange = (e) => {
        setSearch(e.target.value);
    }

    return (
        <div className='space-y-4'>
            <Head title="Promotional Report" />
            <PageTitle align='center' className='w-full'>Subjects Report</PageTitle>
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
                </div>
            </div>
            <div className='flex gap-4 w-full'>
                <SubjectsList schoolYearId={selectedSchoolYearEntry.id} />
            </div>
        </div>
    )
}

export default SubjectsReport
SubjectsReport.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
