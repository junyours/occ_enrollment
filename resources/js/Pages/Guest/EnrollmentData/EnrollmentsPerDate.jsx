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
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
} from 'recharts'

// Config for chart line/area colors
const chartConfig = {
    total_students: {
        label: "Total",
        color: "#6366f1",
    },
    growth: {
        label: "Growth",
        color: "#22c55e",
    },
    acceleration: {
        label: "Acceleration",
        color: "#f97316",
    },
};


// Convert input into chart-compatible structure
function getEnrollmentStatisticsData(data = []) {
    let previousTotal = null
    let previousGrowth = null

    return data.map((item) => {
        const total = item.total
        const growth = previousTotal !== null ? total - previousTotal : 0
        const acceleration = previousGrowth !== null ? growth - previousGrowth : 0

        previousTotal = total
        previousGrowth = growth

        return {
            date: item.date_enrolled,
            total_students: total,
            growth,
            acceleration,
        }
    })
}

function EnrollmentsPerDate({ data = [] }) {
    const formattedData = getEnrollmentStatisticsData(data)


    return (
        <Card className="col-span-full">
            <CardHeader>
                <CardTitle>Enrollment Timeline</CardTitle>
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
                            interval={0}
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
                                            <div className='flex flex-col'>
                                                <div><strong>Total:</strong> {payload.total_students}</div>
                                                <div><strong>Growth:</strong> {payload.growth ?? '—'}</div>
                                                <div><strong>Acceleration:</strong> {payload.acceleration ?? '—'}</div>
                                            </div>
                                        ]
                                    }}
                                />
                            }
                        />

                        {/* Total Enrollment Area */}
                        <Area
                            type="natural"
                            dataKey="total_students"
                            stroke={chartConfig.total_students.color}
                            fill={chartConfig.total_students.color}
                            fillOpacity={0.3}
                            strokeWidth={2}
                            dot={false}
                        />

                        {/* Growth Line */}
                        {/* <Area
                            type="monotone"
                            dataKey="growth"
                            stroke={chartConfig.growth.color}
                            strokeWidth={2}
                            dot={false}
                        /> */}

                        {/* Acceleration Line */}
                        {/* <Area
                            type="monotone"
                            dataKey="acceleration"
                            stroke={chartConfig.acceleration.color}
                            strokeWidth={2}
                            strokeDasharray="4 2"
                            dot={false}
                        /> */}
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

export default EnrollmentsPerDate
