"use client"

import React, { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis } from "recharts"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/Components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/Components/ui/chart"

function YearLevelCounts({ data = [] }) {
    const chartData = useMemo(() => {
        const labelMap = {
            "First Year": "1st",
            "Second Year": "2nd",
            "Third Year": "3rd",
            "Fourth Year": "4th",
        }

        const mappedData = data.map((item) => ({
            yearLevel: labelMap[item.year_level_name] || item.year_level_name,
            total: Number(item.total ?? 0),
        }))

        const yearOrder = ["1st", "2nd", "3rd", "4th"]

        const sortedData = mappedData.sort((a, b) => {
            const indexA = yearOrder.indexOf(a.yearLevel)
            const indexB = yearOrder.indexOf(b.yearLevel)

            const weightA = indexA !== -1 ? indexA : 999
            const weightB = indexB !== -1 ? indexB : 999

            return weightA - weightB
        })

        // Monochromatic sequential scale for ordinal data
        const barColors = [
            "#93c5fd", // Blue 300
            "#60a5fa", // Blue 400
            "#3b82f6", // Blue 500
            "#2563eb", // Blue 600
        ];

        return sortedData.map((item, index) => ({
            ...item,
            fill: barColors[index % barColors.length]
        }))

    }, [data])

    const chartConfig = {
        total: {
            label: "Total Students",
        },
    }

    const isLoading = data.length === 0

    return (
        <Card className='h-full'>
            <CardHeader>
                <CardTitle>Year Level</CardTitle>
            </CardHeader>
            <CardContent className='h-full'>
                {isLoading ? (
                    <div className="h-full flex items-center justify-center min-h-[230px]">
                        <p className="text-sm text-muted-foreground">Loading chart...</p>
                    </div>
                ) : (
                    <div className="h-full flex items-center">
                        <ResponsiveContainer width="100%" height={230}>
                            <ChartContainer config={chartConfig}>
                                <BarChart
                                    data={chartData}
                                    margin={{ top: 20 }}
                                >
                                    <CartesianGrid vertical={false} />
                                    <XAxis
                                        dataKey="yearLevel"
                                        // tickLine={false}
                                        tickMargin={10}
                                        // axisLine={false}
                                    />
                                    {/* <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent hideLabel />}
                                    /> */}
                                    <Bar
                                        dataKey="total"
                                        radius={8}
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={entry.fill}
                                            />
                                        ))}
                                        <LabelList
                                            dataKey="total"
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
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default YearLevelCounts