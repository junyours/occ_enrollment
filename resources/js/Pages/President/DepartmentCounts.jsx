"use client"

import React from "react"
import { TrendingUp } from "lucide-react"
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
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/Components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/Components/ui/chart"

function DepartmentCounts({ data }) {
    // Assign color based on department abbreviation
    const colorMap = {
        CIT: "#800000", // maroon
        TED: "#007bff", // blue
        CBA: "#FFD700", // yellow
    }

    const chartData = data.map((d) => ({
        department: d.department_name_abbreviation,  // used for X-axis
        totalEnrolled: d.totalEnrolled,
        tooltipLabel: `${d.department_name_abbreviation} - ${d.totalEnrolled}`,
        fill: colorMap[d.department_name_abbreviation] || "#ccc",
    }))


    const chartConfig = {
        totalEnrolled: {
            label: "Total Enrolled",
            color: "var(--chart-1)",
        },
    }

    const isLoading = data.length === 0

    return (
        <Card>
            <CardHeader>
                <CardTitle>Departments</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <p className="text-center text-muted-foreground">Loading chart...</p>
                ) : (
                    <ResponsiveContainer width="100%" height={230}>
                        <ChartContainer config={chartConfig}>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData} margin={{ top: 20 }}>
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="department"
                                        tickLine={false}
                                        tickMargin={10}
                                        axisLine={false}
                                    />
                                    {/* <ChartTooltip
                                    cursor={false}
                                    content={<ChartTooltipContent hideLabel />}
                                /> */}
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
                            </ResponsiveContainer>
                        </ChartContainer>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    )
}

export default DepartmentCounts
