"use client"

import React from "react"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis } from "recharts"

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

const dayMap = {
    Monday: "Mon",
    Tuesday: "Tue",
    Wednesday: "Wed",
    Thursday: "Thu",
    Friday: "Fri",
}

const defaultDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
]

const chartConfig = {
    total: {
        label: "Total Enrolled",
        color: "#8ec5ff",
    },
    average: {
        label: "Avg.",
        color: "#2878f2",
    },
}

export default function PeakDaysChart({ data = [] }) {
    const chartData = defaultDays.map((day) => {
        const match = data.find((item) => item.day === day)
        return {
            day: dayMap[day],
            total: match?.total || 0,
            average: match ? parseFloat(match.avg_per_day) : 0,
        }
    })

    return (
        <Card>
            <CardHeader>
                <CardTitle>Peak Days</CardTitle>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={230}>
                    <ChartContainer config={chartConfig}>
                        <BarChart data={chartData}>
                            <CartesianGrid vertical={false} />
                            <XAxis
                                dataKey="day"
                                tickLine={false}
                                tickMargin={10}
                                axisLine={false}
                            />
                            <ChartTooltip
                                cursor={false}
                                content={<ChartTooltipContent indicator="dashed" />}
                            />
                            {/* <Bar dataKey="total" fill="var(--color-total)" radius={4} /> */}
                            <Bar dataKey="average" fill="var(--color-average)" radius={4} />
                        </BarChart>
                    </ChartContainer>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}
