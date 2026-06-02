"use client"

import React, { useEffect, useState } from "react"
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    XAxis,
    ResponsiveContainer,
    Cell,
    Tooltip,
} from "recharts"

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/Components/ui/card"

import {
    ChartContainer,
} from "@/Components/ui/chart"

function CoursesCounts({ data }) {

    const [isSmallScreen, setIsSmallScreen] = useState(false);

    useEffect(() => {
        const checkScreen = () => setIsSmallScreen(window.innerWidth < 640); // 640px = Tailwind's "sm"
        checkScreen(); // initial check
        window.addEventListener("resize", checkScreen);
        return () => window.removeEventListener("resize", checkScreen);
    }, []);

    const colorMap = {
        1: "#800000", // CIT - maroon
        2: "#007bff", // TED - blue
        3: "#FFD700", // CBA - yellow
    }

    // Prepare chart data
    const chartData = data.map((c) => ({
        course: c.course_name_abbreviation,        // Short label for X-axis
        fullCourseName: `${c.course_name}${c.major ? ` MAJOR IN ${c.major}` : ''}`,       // Full name for tooltip
        course_name_abb: c.course_name_abbreviation,       // Full name for tooltip
        totalEnrolled: c.enrolled_students_count,
        fill: colorMap[c.department_id] || "#ccc",  // Bar color
    }))

    const chartConfig = {
        totalEnrolled: {
            label: "Total Enrolled",
            color: "var(--chart-1)",
        },
    }

    const isLoading = data.length === 0

    // Custom tooltip
    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const { fullCourseName, totalEnrolled, course_name_abb } = payload[0].payload
            return (
                <div className="bg-white border border-gray-300 p-2 rounded shadow text-sm
                      dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100">
                    <p className="font-semibold">{fullCourseName}</p>
                    <p className="">{course_name_abb}</p>
                    <p>Enrolled: {totalEnrolled}</p>
                </div>
            )
        }
        return null
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Courses</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p className="text-center text-muted-foreground">Loading chart...</p>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <ChartContainer config={chartConfig}>
                            <BarChart data={chartData} margin={{ top: 20 }}>
                                <CartesianGrid vertical={false} />
                                {!isSmallScreen && (
                                    <XAxis
                                        dataKey="course"
                                        tickLine={false}
                                        tickMargin={10}
                                        axisLine={false}
                                    />
                                )}
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                                <Bar dataKey="totalEnrolled" radius={8}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                    <LabelList
                                        dataKey="totalEnrolled"
                                        position="top"
                                        offset={12}
                                        className="fill-foreground"
                                        fontSize={12}
                                    />
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    )
}

export default CoursesCounts
