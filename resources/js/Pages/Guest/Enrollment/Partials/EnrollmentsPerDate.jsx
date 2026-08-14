import React from 'react'
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card'
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/Components/ui/chart'
import {
    AreaChart,
    Area,
    CartesianGrid,
    XAxis,
    YAxis,
} from 'recharts'

// Config for chart line/area colors
const chartConfig = {
    cumulative_students: {
        label: "Total Enrolled",
        color: "#6366f1",
    },
    daily_enrollment: {
        label: "New Enrollments",
        color: "#22c55e",
    }
};

// Convert input into a cumulative chart-compatible structure
function getEnrollmentStatisticsData(data = []) {
    let cumulativeTotal = 0
    let previousDaily = null

    return data.map((item) => {
        const dailyTotal = Number(item.total ?? 0)

        cumulativeTotal += dailyTotal

        const acceleration =
            previousDaily !== null
                ? dailyTotal - previousDaily
                : 0

        previousDaily = dailyTotal

        return {
            date: item.date_enrolled,
            cumulative_students: cumulativeTotal,
            daily_enrollment: dailyTotal,
            acceleration,
        }
    })
}

function EnrollmentsPerDate({ data = [] }) {
    const formattedData = getEnrollmentStatisticsData(data)

    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>Cumulative Enrollment Timeline</CardTitle>
            </CardHeader>
            <CardContent className="px-2 sm:p-6">
                <ChartContainer config={chartConfig} className="aspect-auto h-[300px] w-full">
                    <AreaChart
                        data={formattedData}
                        margin={{ top: 20, left: 12, right: 12 }}
                    >
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />

                        <XAxis
                            dataKey="date"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={12} // Lowered from 30 to allow labels to sit closer together
                            interval="preserveStart" // Tells Recharts to maintain an even cadence from the left, rather than forcing the final label
                            tickFormatter={(value) =>
                                new Date(value).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                })
                            }
                        />

                        <YAxis width={40} domain={[0, 'auto']} />

                        <ChartTooltip
                            content={
                                <ChartTooltipContent
                                    className="w-[200px]"
                                    labelFormatter={(value) =>
                                        new Date(value).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric',
                                        })
                                    }
                                    formatter={(_, name, props) => {
                                        const payload = props?.payload || {}
                                        return [
                                            <div key="tooltip-content" className='flex flex-col'>
                                                <div>
                                                    <strong>Total Enrolled:</strong>{" "}
                                                    {Number(payload.cumulative_students ?? 0).toLocaleString()}
                                                </div>

                                                <div className="text-muted-foreground mt-1">
                                                    <strong>New Today:</strong>{" "}
                                                    {Number(payload.daily_enrollment ?? 0).toLocaleString()}
                                                </div>

                                                <div className="text-muted-foreground">
                                                    <strong>Momentum:</strong>{" "}
                                                    {payload.acceleration > 0 ? "+" : ""}
                                                    {Number(payload.acceleration ?? 0).toLocaleString()}
                                                </div>
                                            </div>
                                        ]
                                    }}
                                />
                            }
                        />

                        {/* Cumulative Enrollment Area */}
                        <Area
                            type="linear" // Changed from natural to linear to prevent dips below the actual data points
                            dataKey="cumulative_students"
                            stroke={chartConfig.cumulative_students.color}
                            fill={chartConfig.cumulative_students.color}
                            fillOpacity={0.3}
                            strokeWidth={2}
                            dot={false}
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

export default EnrollmentsPerDate