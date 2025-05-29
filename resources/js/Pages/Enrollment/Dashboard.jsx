import React, { useEffect, useMemo, useState } from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import { Head, usePage } from '@inertiajs/react';
import PreLoader from '@/Components/preloader/PreLoader';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/Components/ui/chart';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart, XAxis, YAxis } from 'recharts';
import { GraduationCap, TrendingUp } from 'lucide-react';
import { PageTitle } from '@/Components/ui/PageTitle';
import { UserCheck } from "lucide-react";

const studentTypeChartConfig = {
    Freshman: { color: "#FFD700" },  // Yellow
    Old: { color: "#8A2BE2" },       // Purple
    Returnee: { color: "#20B2AA" },  // Greenish
    Transferee: { color: "#FF1493" } // Pink
};

const genderStatChartConfig = {
    male: { label: "Male", color: "#007BFF" }, // Blue
    female: { label: "Female", color: "#FF69B4" }, // Pink
};

const chartConfig = {
    total_students: {
        label: "Total",
        color: "hsl(var(--chart-1))",
    },
}

export default function Dashboard() {
    const [loading, setLoading] = useState(true);

    const { schoolYear } = usePage().props;
    const { user } = usePage().props.auth;
    const [reports, setReports] = useState([]);
    const [schoolYearDetails, setSchoolYearDetails] = useState([]);

    const [selectedCourse, setSelectedCourse] = useState(0);

    const getEnrollmentDashboardData = async () => {
        await axios.post(route('get.enrollment.dashboard.data'), { schoolYearId: schoolYear.id })
            .then(response => {
                if (user.user_role == 'registrar') {
                    setReports(response.data.coursesReports);
                    setSchoolYearDetails(response.data.schoolYearDetails);
                } else {
                    setReports(response.data.coursesReports.department.course);
                    setSchoolYearDetails(response.data.schoolYearDetails);
                }
            })
            .finally(() => {
                setLoading(false)
            })
    }

    useEffect(() => {
        getEnrollmentDashboardData()
    }, [schoolYear])


    if (loading) return <PreLoader title="Dashboard" />

    const getStudentTypeData = (reports, selectedCourse) => {
        if (!reports || !Array.isArray(reports)) return [];

        const filteredCourses = reports
            .filter(course => course.id == selectedCourse || selectedCourse == 0);

        const studentTypeTotals = filteredCourses.reduce(
            (totals, course) => ({
                Freshman: totals.Freshman + (course.freshman_count || 0),
                Old: totals.Old + (course.old_count || 0),
                Returnee: totals.Returnee + (course.returnee_count || 0),
                Transferee: totals.Transferee + (course.transferee_count || 0),
            }),
            { Freshman: 0, Old: 0, Returnee: 0, Transferee: 0 }
        );

        return Object.entries(studentTypeTotals).map(([name, count]) => ({ name, count }));
    };

    const getGenderStatisticsData = (reports, selectedCourse) => {
        if (!reports || !Array.isArray(reports)) return [];

        const filteredCourses = reports
            .filter(course => course.id == selectedCourse || selectedCourse == 0);

        const genderTotals = filteredCourses.reduce(
            (totals, course) => ({
                "1st Year": {
                    Male: (totals["1st Year"]?.Male || 0) + (course.first_year_male_count || 0),
                    Female: (totals["1st Year"]?.Female || 0) + (course.first_year_female_count || 0),
                },
                "2nd Year": {
                    Male: (totals["2nd Year"]?.Male || 0) + (course.second_year_male_count || 0),
                    Female: (totals["2nd Year"]?.Female || 0) + (course.second_year_female_count || 0),
                },
                "3rd Year": {
                    Male: (totals["3rd Year"]?.Male || 0) + (course.third_year_male_count || 0),
                    Female: (totals["3rd Year"]?.Female || 0) + (course.third_year_female_count || 0),
                },
                "4th Year": {
                    Male: (totals["4th Year"]?.Male || 0) + (course.fourth_year_male_count || 0),
                    Female: (totals["4th Year"]?.Female || 0) + (course.fourth_year_female_count || 0),
                }
            }),
            {
                "1st Year": { Male: 0, Female: 0 },
                "2nd Year": { Male: 0, Female: 0 },
                "3rd Year": { Male: 0, Female: 0 },
                "4th Year": { Male: 0, Female: 0 }
            }
        );

        return Object.entries(genderTotals).map(([year, { Male, Female }]) => ({
            year,
            male: Male,
            female: Female
        }));
    };

    const getEnrollmentStatisticsData = (reports, selectedCourse) => {
        if (!reports || !Array.isArray(reports)) return [];

        const filteredCourses = reports
            .filter(course => course.id == selectedCourse || selectedCourse == 0);

        const enrollmentTotals = filteredCourses.reduce((totals, course) => {
            course.year_section.forEach(entry => {
                const date = entry.date_enrolled;
                totals[date] = (totals[date] || 0) + entry.total_students;
            });

            return totals;
        }, {});

        return Object.entries(enrollmentTotals).map(([date, totalStudents]) => ({
            date,
            total_students: totalStudents
        }));
    };

    const AnimatedCount = ({ target }) => {
        const [count, setCount] = useState(() => {
            return Number(localStorage.getItem("total")) || 0; // Load last count
        });

        useEffect(() => {
            const prevTotal = Number(localStorage.getItem("total")) || 0; // Get last count
            const difference = target - prevTotal;
            const duration = 450;
            const stepTime = 30;
            const steps = Math.ceil(duration / stepTime);
            let step = 0;

            if (difference !== 0) {
                const timer = setInterval(() => {
                    step++;
                    const progress = step / steps;
                    const currentValue = Math.round(prevTotal + difference * progress);

                    if (step >= steps) {
                        setCount(target);
                        localStorage.setItem("total", target); // Save to localStorage
                        clearInterval(timer);
                    } else {
                        setCount(currentValue);
                    }
                }, stepTime);

                return () => clearInterval(timer);
            }
        }, [target]);

        return <span className="text-md sm:text-4xl font-bold">{count}</span>;
    };

    const EnrolledCard = ({ reports, selectedCourse }) => {
        const totalEnrolled = reports
            .filter((report) => selectedCourse == 0 || report.id == selectedCourse)
            .reduce((total, report) => total + report.enrolled_student_count, 0);

        return (
            <Card className="items-center flex flex-col justify-center">
                {/* <div> */}
                <CardHeader className="flex items-center justify-between">
                    <CardTitle>Total Enrolled</CardTitle>
                    <UserCheck className="w-6 h-6 text-gray-500" />
                </CardHeader>

                <CardContent className="flex flex-col items-center gap-2 pt-4">
                    {reports.length > 0 ? (
                        <>
                            <AnimatedCount target={totalEnrolled} />
                            <span className="text-gray-500 text-sm">students enrolled</span>
                        </>
                    ) : (
                        <span className="text-gray-400 text-sm">No data available</span>
                    )}
                </CardContent>
                {/* </div> */}
            </Card>
        );
    };

    const selectCourse = (value) => {
        setSelectedCourse(value)
    }

    return (
        <div className='space-y-4'>
            <Head title="Dashboard" />
            <PageTitle align="center" className="l">
                {schoolYearDetails.start_year}-{schoolYearDetails.end_year} {schoolYearDetails.semester.semester_name} Semester
            </PageTitle>
            {reports?.length > 1 ? (
                <Tabs value={selectedCourse} onValueChange={(value) => selectCourse(value)} defaultValue="">
                    <TabsList>
                        <TabsTrigger value={0}>
                            All
                        </TabsTrigger>
                        {reports.map((course, index) => (
                            <TabsTrigger key={index} value={String(course.id)}>
                                {course.course_name_abbreviation}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </Tabs>
            ) : (
                <PageTitle align="center" size="md" className="">{reports?.[0]?.course_name || "No Data"}</PageTitle>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                <EnrolledCard reports={reports} selectedCourse={selectedCourse} />
                <Card>
                    <CardHeader>
                        <CardTitle>Student Types</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ChartContainer config={studentTypeChartConfig}>
                            <BarChart
                                width={600}
                                height={300}
                                data={getStudentTypeData(reports, selectedCourse)}
                                margin={{ top: 20 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="name" />
                                <ChartTooltip content={<ChartTooltipContent hideIndicator={true} />} />
                                <Bar dataKey="count" radius={8}>
                                    <LabelList dataKey="count" position="top" fontSize={14} />
                                    {getStudentTypeData(reports, selectedCourse).map((entry) => (
                                        <Cell key={entry.name} fill={studentTypeChartConfig[entry.name]?.color || "#000"} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>

                <Card className="">
                    <CardHeader>
                        <CardTitle>Gender Statistics</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pb-2 pt-0">
                        <ChartContainer config={genderStatChartConfig}>
                            <BarChart width={600} height={300} data={getGenderStatisticsData(reports, selectedCourse)}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="year"
                                    tickLine={false}
                                    tickMargin={10}
                                    axisLine={false}
                                    tickFormatter={(value) => value.slice(0, 3)}
                                />
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                <ChartLegend content={<ChartLegendContent />} />

                                {/* Male Bar */}
                                <Bar dataKey="male" stackId="a" fill="var(--color-male)" radius={[0, 0, 4, 4]}>
                                    <LabelList dataKey="male" position="insideTop" fill="hsl(var(--male-label-color))" />
                                </Bar>

                                {/* Female Bar */}
                                <Bar dataKey="female" stackId="a" fill="var(--color-female)" radius={[4, 4, 0, 0]}>
                                    <LabelList dataKey="female" position="center" fill="hsl(var(--female-label-color))" />
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
                <Card className="col-span-full">
                    <CardHeader>
                        <CardTitle>Enrollment Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="px-2 sm:p-6">
                        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                            <AreaChart
                                accessibilityLayer
                                data={getEnrollmentStatisticsData(reports, selectedCourse)}
                                margin={{
                                    left: 12,
                                    right: 12,
                                }}
                                className='overflow-visible'
                            >
                                <CartesianGrid vertical={false} />
                                <YAxis
                                    width={20}
                                    tickCount={5}
                                />
                                <XAxis
                                    dataKey="date"
                                    tickLine={false}
                                    axisLine={false}
                                    tickMargin={8}

                                    interval={0}
                                    tickFormatter={(value) => {
                                        const date = new Date(value);
                                        return date.toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                        });
                                    }}
                                />

                                <ChartTooltip
                                    content={
                                        <ChartTooltipContent
                                            className="w-[150px]"
                                            nameKey="total_students" // Ensure this matches your data structure
                                            labelFormatter={(value) => {
                                                return new Date(value).toLocaleDateString("en-US", {
                                                    month: "short",
                                                    day: "numeric",
                                                    year: "numeric",
                                                });
                                            }}
                                        />
                                    }
                                />
                                <Area
                                    dataKey="total_students" // This ensures it maps to your data correctly
                                    type="monotone"
                                    stroke={chartConfig.total_students.color} // Corrected color reference
                                    strokeWidth={2}
                                    dot={false}
                                    fillOpacity={0.3}
                                />
                            </AreaChart>
                        </ChartContainer>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

Dashboard.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
