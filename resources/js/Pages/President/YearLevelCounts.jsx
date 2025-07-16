"use client"

import React from "react"
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis } from "recharts"
import { TrendingUp } from "lucide-react"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import { Skeleton } from "@/components/ui/skeleton"

function YearLevelCounts({ data = [] }) {

    const labelMap = {
        "First Year": "1st",
        "Second Year": "2nd",
        "Third Year": "3rd",
        "Fourth Year": "4th",
    }

    const chartData = data.map((item) => ({
        yearLevel: labelMap[item.year_level_name] || item.year_level_name,
        total: item.total,
    }))

    const chartConfig = {
        total: {
            label: "Total",
            color: "",
        },
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Year Level</CardTitle>
            </CardHeader>

            <CardContent>
                <ResponsiveContainer width="100%" height={230}>

                <ChartContainer config={chartConfig}>
                    <BarChart
                        data={chartData}
                        margin={{ top: 20 }}
                        width={500}
                        height={300}
                    >
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="yearLevel"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={({ payload, active }) => {
                                if (!active || !payload?.length) return null
                                const { yearLevel, total } = payload[0].payload
                                return (
                                    <ChartTooltipContent>
                                        <div className="text-sm font-medium">
                                            {yearLevel} – {total}
                                        </div>
                                    </ChartTooltipContent>
                                )
                            }}
                        />
                        <Bar
                            dataKey="total"
                            fill="#8ec5ff"
                            radius={8}
                        >
                            <LabelList
                                position="top"
                                offset={12}
                                className="fill-foreground"
                                fontSize={12}
                            />
                        </Bar>
                    </BarChart>
                </ChartContainer>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}

export default YearLevelCounts
