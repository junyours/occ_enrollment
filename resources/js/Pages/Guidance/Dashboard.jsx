import React, { useState, useEffect } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { Head, Link } from "@inertiajs/react";
import { Card, CardHeader, CardTitle, CardContent } from "@/Components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/Components/ui/tabs";
import { PageTitle } from "@/Components/ui/PageTitle";


export default function Dashboard({ auth, schoolYear, title, totalEnrolled, facultyCount}) {


    const [loading, setLoading] = useState(false);
    const [reports, setReports] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(0);

    // useEffect(() => {
    //     // Simulate fetching data
    //     setLoading(true);
    //     setTimeout(() => {
    //         setReports([
    //             { id: 1, course_name_abbreviation: "BSIT" },
    //             { id: 2, course_name_abbreviation: "BSBA" },
    //         ]);
    //         setLoading(false);
    //     }, 500);
    // }, []);

    // const selectCourse = (value) => setSelectedCourse(value);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64 text-lg font-medium">
                Loading Dashboard...
            </div>
        );
    }


    return (
        <AuthenticatedLayout user={auth.user}>

            <Head title={title} />

           <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
    {/* Title */}
    <div className="text-center">
        <PageTitle align="center">
            {schoolYear
                ? `${schoolYear.start_year}-${schoolYear.end_year} ${schoolYear.semester.semester_name} Semester`
                : "No Active School Year"}
        </PageTitle>
    </div>


                {/* Tabs */}
                {reports.length > 0 && (
                    <div className="flex justify-left">
                        <Tabs value={selectedCourse} onValueChange={selectCourse}>
                            <TabsList>
                                <TabsTrigger value={0}>All</TabsTrigger>
                                {reports.map((course) => (
                                    <TabsTrigger
                                        key={course.id}
                                        value={String(course.id)}
                                    >
                                        {course.course_name_abbreviation}
                                    </TabsTrigger>
                                ))}
                            </TabsList>
                        </Tabs>
                    </div>
                )}

                {/* Dashboard Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4 ">
                   
                    <Card className="flex flex-col items-center justify-center text-center shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle>Total Enrolled</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Link
                                href={route('guidance.student.index')}
                                className="text-4xl font-bold text-blue-600 hover:text-blue-800 transition duration-200"
                            >
                                {totalEnrolled}
                            </Link>
                            <p className="text-gray-500 text-sm">Students enrolled</p>
                        </CardContent>
                    </Card>

                    {/* Total Faculty */}
                    <Card className="flex flex-col items-center justify-center text-center shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle>Total Faculty</CardTitle>
                        </CardHeader>
                        <CardContent>
                           <Link
                                href={route('guidance.faculty.index')}
                                className="text-4xl font-bold text-blue-600 hover:text-blue-800 transition duration-200"
                            >
                                {facultyCount}
                            </Link>
                            <p className="text-gray-500 text-sm">Faculty Member</p>
                        </CardContent>
                    </Card>

                
                    <Card className="text-center shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle>Unsubmitted Evaluation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-500 text-sm"></p>
                        </CardContent>
                    </Card>

                    <Card className="text-center shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle>Submitted Evaluation</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-500 text-sm"></p>
                        </CardContent>
                    </Card>

                    {/* Enrollment Timeline */}
                    <Card className="col-span-full text-center shadow-md">
                        <CardHeader className="pb-2">
                            <CardTitle>Enrollment Timeline</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-gray-500 text-sm">Chart Placeholder</p>
                        </CardContent>
                    </Card>
                    
                </div>

            </div>
        </AuthenticatedLayout>
    );
}
