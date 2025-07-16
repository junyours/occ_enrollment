import React from "react"
import { Pie, PieChart, LabelList } from "recharts"

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    ChartContainer,
} from "@/components/ui/chart"

function GenderCounts({ data = [] }) {
    const genderTotals = data.reduce((acc, curr) => {
        acc[curr.gender.toLowerCase()] = curr.total
        return acc
    }, { male: 0, female: 0 })

    const chartData = [
        { gender: "Male", count: genderTotals.male, fill: "#0077f8" },
        { gender: "Female", count: genderTotals.female, fill: "#ff69b4" },
    ]

    const chartConfig = {
        count: { label: "Count" },
        male: { label: "Male" },
        female: { label: "Female" },
    }

    return (
        <Card className="flex flex-col w-full ">
            <CardHeader>
                <CardTitle>Gender</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto aspect-square max-h-[250px]"
                >
                    <PieChart width={250} height={250}>
                        <Pie
                            data={chartData}
                            dataKey="count"
                            nameKey="gender"
                            cx="50%"
                            cy="50%"
                            outerRadius={100}
                            stroke="none"
                            labelLine={false}
                            label={({ percent, gender }) =>
                                `${gender} ${(percent * 100).toFixed(0)}%`
                            }
                            fill="#8884d8"
                        >
                            <LabelList
                                dataKey="count"
                                position="inside"
                                fill="#fff"
                                fontSize={14}
                                fontWeight="bold"
                            />
                        </Pie>
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

export default GenderCounts
