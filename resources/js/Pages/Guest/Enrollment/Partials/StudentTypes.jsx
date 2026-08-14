import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { ChartContainer, ChartTooltip } from '@/Components/ui/chart'
import { Separator } from '@/Components/ui/separator'
import React, { useMemo } from 'react'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    ResponsiveContainer,
} from 'recharts'

// Intentional palette: saturation creates visual hierarchy
const studentCompositionConfig = {
    Old: { color: "#7c3aed" },
    Freshman: { color: "#a78bfa" },
    Returnee: { color: "#c4b5fd" },
    Transferee: { color: "#e9d5ff" },
}

// Custom tooltip to show detailed information
const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const categoryName = payload[0].name
        const count = payload[0].value
        const data = payload[0].payload
        const percentage = data.percentages[categoryName]

        return (
            <div className="bg-slate-900 border border-slate-700 rounded p-3 shadow-lg">
                <p className="text-white text-sm font-medium">
                    {categoryName}
                </p>

                <p className="text-slate-300 text-sm">
                    <span className="font-mono font-semibold">
                        {count.toLocaleString()}
                    </span>{' '}
                    students
                </p>

                <p className="text-slate-300 text-sm">
                    <span className="font-mono font-semibold">
                        {percentage}%
                    </span>
                </p>
            </div>
        )
    }

    return null
}

// Custom label renderer for stacked bars
const renderSegmentLabel = (dataKey) => (props) => {
    const {
        x,
        y,
        width,
        height,
        payload,
    } = props

    const value = payload?.[dataKey]

    // Only render labels for larger segments
    if (!value || width < 80) {
        return null
    }

    return (
        <text
            x={x + width / 2}
            y={y + height / 2}
            fill="white"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontWeight={500}
        >
            {Number(value).toLocaleString()}
        </text>
    )
}

function StudentComposition({ data = [] }) {
    const calculations = useMemo(() => {
        const counts = {
            Old: 0,
            Freshman: 0,
            Returnee: 0,
            Transferee: 0,
        }

        data.forEach((item) => {
            const studentType = item.student_type_name

            // Support both existing "Old" data
            // and "Continuing" if it still exists in the API.
            if (
                studentType === 'Old' ||
                studentType === 'Continuing'
            ) {
                counts.Old += Number(item.total || 0)
            } else if (studentType === 'Freshman') {
                counts.Freshman += Number(item.total || 0)
            } else if (studentType === 'Returnee') {
                counts.Returnee += Number(item.total || 0)
            } else if (studentType === 'Transferee') {
                counts.Transferee += Number(item.total || 0)
            }
        })

        const total =
            counts.Old +
            counts.Freshman +
            counts.Returnee +
            counts.Transferee

        const percentages = {
            Old:
                total > 0
                    ? Math.round((counts.Old / total) * 100)
                    : 0,

            Freshman:
                total > 0
                    ? Math.round((counts.Freshman / total) * 100)
                    : 0,

            Returnee:
                total > 0
                    ? Math.round((counts.Returnee / total) * 100)
                    : 0,

            Transferee:
                total > 0
                    ? Math.round((counts.Transferee / total) * 100)
                    : 0,
        }

        if (process.env.NODE_ENV === 'development') {
            console.log(
                'StudentComposition Data Validation:',
                {
                    Old: counts.Old,
                    Freshman: counts.Freshman,
                    Returnee: counts.Returnee,
                    Transferee: counts.Transferee,
                    total,
                    percentages,
                }
            )
        }

        return {
            counts,
            percentages,
            total,
        }
    }, [data])

    const chartData = [
        {
            name: 'Student Composition',

            Old: calculations.counts.Old,
            Freshman: calculations.counts.Freshman,
            Returnee: calculations.counts.Returnee,
            Transferee: calculations.counts.Transferee,

            percentages: calculations.percentages,
        },
    ]

    // Legend items
    const legendItems = [
        {
            key: 'Old',
            label: 'Old',
            count: calculations.counts.Old,
            percentage: calculations.percentages.Old,
        },
        {
            key: 'Freshman',
            label: 'Freshman',
            count: calculations.counts.Freshman,
            percentage: calculations.percentages.Freshman,
        },
        {
            key: 'Returnee',
            label: 'Returnee',
            count: calculations.counts.Returnee,
            percentage: calculations.percentages.Returnee,
        },
        {
            key: 'Transferee',
            label: 'Transferee',
            count: calculations.counts.Transferee,
            percentage: calculations.percentages.Transferee,
        },
    ]

    return (
        <Card className="flex flex-col w-full">
            <CardHeader>
                <CardTitle>
                    Student Types
                </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col pb-4 py-10">
                <div className="flex flex-col flex-1 w-full justify-between">
                    {/* Stacked Bar Chart */}
                    <div className="w-full">
                        <ResponsiveContainer
                            width="100%"
                            height={100}
                        >
                            <ChartContainer
                                config={studentCompositionConfig}
                            >
                                <BarChart
                                    data={chartData}
                                    layout="vertical"
                                    margin={{
                                        top: 0,
                                        right: 0, // <-- Changed from 80 to 0
                                        left: 0,
                                        bottom: 0,
                                    }}
                                >
                                    <CartesianGrid
                                        // vertical={false}
                                        // horizontal={false}
                                    />

                                    <XAxis
                                        type="number"
                                        hide
                                    />

                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        hide
                                    />

                                    {/* <ChartTooltip
                                        content={
                                            <CustomTooltip />
                                        }
                                        cursor={{
                                            fill: 'rgba(255,255,255,0.1)',
                                        }}
                                    /> */}

                                    {/* Old */}
                                    <Bar
                                        dataKey="Old"
                                        name="Old"
                                        stackId="composition"
                                        fill={
                                            studentCompositionConfig
                                                .Old.color
                                        }
                                        radius={[
                                            4,
                                            0,
                                            0,
                                            4,
                                        ]}
                                        label={renderSegmentLabel(
                                            'Old'
                                        )}
                                    />

                                    {/* Freshman */}
                                    <Bar
                                        dataKey="Freshman"
                                        name="Freshman"
                                        stackId="composition"
                                        fill={
                                            studentCompositionConfig
                                                .Freshman.color
                                        }
                                        label={renderSegmentLabel(
                                            'Freshman'
                                        )}
                                    />

                                    {/* Returnee */}
                                    <Bar
                                        dataKey="Returnee"
                                        name="Returnee"
                                        stackId="composition"
                                        fill={
                                            studentCompositionConfig
                                                .Returnee.color
                                        }
                                    />

                                    {/* Transferee */}
                                    <Bar
                                        dataKey="Transferee"
                                        name="Transferee"
                                        stackId="composition"
                                        fill={
                                            studentCompositionConfig
                                                .Transferee.color
                                        }
                                        radius={[
                                            0,
                                            4,
                                            4,
                                            0,
                                        ]}
                                    />
                                </BarChart>
                            </ChartContainer>
                        </ResponsiveContainer>
                    </div>

                    <Separator className="my-4" />

                    {/* Legend Grid */}
                    <div className="grid grid-cols-4 gap-4">
                        {legendItems.map((item) => (
                            <div
                                key={item.key}
                                className="flex flex-col gap-1"
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-4 h-4 rounded"
                                        style={{
                                            backgroundColor:
                                                studentCompositionConfig[
                                                    item.key
                                                ].color,
                                        }}
                                    />

                                    <span className="text-sm font-medium text-foreground">
                                        {item.label}
                                    </span>
                                </div>

                                <div className="text-xs text-muted-foreground">
                                    {item.count.toLocaleString()}{' '}
                                    students
                                </div>

                                <div
                                    className="text-sm font-semibold"
                                    style={{
                                        color:
                                            studentCompositionConfig[
                                                item.key
                                            ].color,
                                    }}
                                >
                                    {item.percentage}%
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default StudentComposition