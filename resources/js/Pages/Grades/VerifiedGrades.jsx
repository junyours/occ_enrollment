import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import React, { useEffect, useState } from 'react'

function VerifiedGrades({ schoolYears }) {
    const [facultyList, setFacultyList] = useState([])
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

    const getFacultiesSubmittedGrades = async () => {
        await axios.post(route('faculty-list.submitted-grades'), {
            schoolYearId: selectedSchoolYearEntry.id,
        })
            .then(response => {
                setFacultyList(response.data);
            });
    }

    useEffect(() => {
        if (selectedSchoolYearEntry?.id) {
            getFacultiesSubmittedGrades();
        }
    }, [selectedSchoolYearEntry?.id]);

    return (
        <div className="space-y-4">
            <Head title='Verified Grades' />
            <div className='flex gap-4'>
                <Card className='w-min h-min'>
                    <CardHeader>
                        <CardTitle>School Year and Semester</CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-2'>
                        <div>
                            {/* School Year Select */}
                            <div className="w-52 mt-2">
                                <label className="block mb-1 text-sm font-medium text-gray-700">School Year</label>
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
                            <div className="w-52">
                                <label className="block mb-1 text-sm font-medium text-gray-700">Semester</label>
                                <Select value={selectedSemester} onValueChange={handleSemesterChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Semester" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allSemesters.map((sem) => (
                                            <SelectItem key={sem} value={sem} disabled={!availableSemesters.includes(sem)}>
                                                {sem}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        {/* <div className='text-sm mt-2'>
                            <p>School Year: {selectedSchoolYear}</p>
                            <p>Semester: {selectedSemester}</p>
                        </div>
                        <Button onClick={getFacultiesSubmittedGrades}>Look for</Button> */}
                    </CardContent>
                </Card>

                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>Faculty List</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 mt-2">
                        <div className="border rounded-md">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40px] text-center">#</TableHead>
                                            <TableHead className="w-[140px]">FACULTY ID</TableHead>
                                            <TableHead>NAME</TableHead>
                                            <TableHead className="text-right">ACTION</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                </Table>
                            </div>
                            <div className=" max-h-[calc(100vh-12rem)] min-h-[calc(100vh-12rem)] overflow-y-auto">
                                <Table>
                                    <TableBody>
                                        {facultyList.map((faculty, index) => (
                                            <TableRow key={faculty.user_id_no}>
                                                <TableCell className="text-center">{index + 1}.</TableCell>
                                                <TableCell>{faculty.user_id_no}</TableCell>
                                                <TableCell>{faculty.name}</TableCell>
                                                <TableCell className="flex justify-end">
                                                    <div className="relative">
                                                        <a
                                                            href={route('verified.faculty.subjects', {
                                                                schoolYear: `${selectedSchoolYearEntry.start_year}-${selectedSchoolYearEntry.end_year}`,
                                                                semester: selectedSchoolYearEntry.semester_name,
                                                                facultyId: faculty.user_id_no
                                                            })}
                                                            className="relative inline-block"
                                                        >
                                                            <Button size="sm" className="h-7">Subjects</Button>
                                                            {faculty.verified_count > 0 && (
                                                                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                                                    {faculty.verified_count}
                                                                </div>
                                                            )}
                                                        </a>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default VerifiedGrades
VerifiedGrades.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
