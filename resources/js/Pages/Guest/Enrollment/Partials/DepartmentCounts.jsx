import React from "react"
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

function DepartmentCounts({ data }) {
    // Assign color based on department abbreviation
    const colorMap = {
        CIT: "#800000", // maroon
        TED: "#007bff", // blue
        CBA: "#FFD700", // yellow
    }

    const chartData = data.map((d) => ({
        department: d.department_name_abbreviation,
        totalEnrolled: Number(d.totalEnrolled),
        tooltipLabel: `${d.department_name_abbreviation} - ${Number(d.totalEnrolled).toLocaleString()}`,
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
                    <div className="h-[230px] sm:h-[250px] md:h-[280px] lg:h-[320px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 20, right: 10, left: 10, bottom: 5 }}
                                >
                                    <CartesianGrid vertical={false} />

                                    <XAxis
                                        dataKey="department"
                                        // tickLine={false}
                                        tickMargin={10}
                                        // axisLine={false}
                                    />

                                    <Bar dataKey="totalEnrolled" radius={8}>
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.fill}
                                            />
                                        ))}

                                        <LabelList
                                            dataKey="totalEnrolled"
                                            position="top"
                                            offset={12}
                                            className="fill-foreground"
                                            fontSize={12}
                                            formatter={(value) => value.toLocaleString()}
                                        />
                                    </Bar>
                                </BarChart>
                            </ChartContainer>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default DepartmentCounts
