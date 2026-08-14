import React, { useMemo } from "react"
import {
    Bar,
    BarChart,
    CartesianGrid,
    LabelList,
    XAxis,
    ResponsiveContainer,
    Cell,
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

function CourseEnrollments({ data = [], departmentCounts = [] }) {
    // Department colors - matching the Departments card style
    const departmentColors = {
        1: "#800000", // CIT - Maroon
        2: "#007bff", // TED - Blue
        3: "#FFD700"  // CBA - Yellow
    }

    // Build a department map for quick lookup
    const departmentMap = useMemo(() => {
        const map = {}
        departmentCounts.forEach(dept => {
            map[dept.id] = {
                ...dept,
                color: departmentColors[dept.id] || "#888888"
            }
        })
        return map
    }, [departmentCounts])

    // Filter, combine OS courses, and sort
    const filteredAndSortedCourses = useMemo(() => {
        // First, hide courses with no enrollment
        let filtered = data.filter(course => (course.enrolled_students_count || 0) > 0)

        // Combine OS (Off Semester) courses with regular courses
        const courseMap = new Map()
        filtered.forEach(course => {
            // More robust regex: removes " (OS)", " OS", "-OS", etc.
            const baseCode = course.course_name_abbreviation.replace(/[\s-]*\(?OS\)?$/i, "").trim()

            // Use base code and department as key. 
            const key = `${course.department_id}-${baseCode}`

            if (courseMap.has(key)) {
                // If this course already exists, add the enrollment numbers
                const existing = courseMap.get(key)
                existing.enrolled_students_count += course.enrolled_students_count || 0
            } else {
                // First time seeing this course (with or without OS)
                courseMap.set(key, {
                    ...course,
                    course_name_abbreviation: baseCode, // Use clean code without (OS)
                    enrolled_students_count: course.enrolled_students_count || 0
                })
            }
        })

        const combined = Array.from(courseMap.values())

        // Sort by department first (CIT -> TED -> CBA), then by enrollment descending
        const sorted = combined.sort((a, b) => {
            const deptA = departmentMap[a.department_id]?.department_name_abbreviation || ""
            const deptB = departmentMap[b.department_id]?.department_name_abbreviation || ""

            // Define the custom order
            const deptOrder = ["CIT", "TED", "CBA"]

            const indexA = deptOrder.indexOf(deptA)
            const indexB = deptOrder.indexOf(deptB)

            // If a department isn't in the list, give it a high index so it goes to the end
            const weightA = indexA !== -1 ? indexA : 999
            const weightB = indexB !== -1 ? indexB : 999

            // Sort by department weight if they are different
            if (weightA !== weightB) {
                return weightA - weightB
            }

            // Secondary sorting: highest enrollment first
            return (b.enrolled_students_count || 0) - (a.enrolled_students_count || 0)
        })

        return sorted
    }, [data, departmentMap])

    // Transform data for chart
    const chartData = useMemo(() => {
        return filteredAndSortedCourses.map(course => ({
            courseCode: course.course_name_abbreviation,
            enrolled: Number(course.enrolled_students_count ?? 0),
            fill: departmentMap[course.department_id]?.color || "#888888",
            fullName: course.course_name,
            major: course.major,
        }))
    }, [filteredAndSortedCourses, departmentMap])

    const chartConfig = {
        enrolled: {
            label: "Enrollment",
            color: "var(--chart-1)",
        },
    }

    const isLoading = data.length === 0

    return (
        <Card>
            <CardHeader>
                <CardTitle>Programs</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p className="text-center text-muted-foreground">Loading chart...</p>
                ) : chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                        <ChartContainer config={chartConfig}>
                            <BarChart data={chartData} margin={{ top: 20 }}>
                                <CartesianGrid vertical={false} />
                                <XAxis
                                    dataKey="courseCode"
                                    // tickLine={false}
                                    tickMargin={10}
                                    // axisLine={false}
                                    fontSize={12}
                                />
                                <Bar dataKey="enrolled" radius={8}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} />
                                    ))}
                                    <LabelList
                                        dataKey="enrolled"
                                        position="top"
                                        offset={12}
                                        className="fill-foreground"
                                        fontSize={12}
                                        formatter={(value) => Number(value).toLocaleString()}
                                    />
                                </Bar>
                            </BarChart>
                        </ChartContainer>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-center text-muted-foreground">No courses found</p>
                )}
            </CardContent>
        </Card>
    )
}

export default CourseEnrollments