import React, { useMemo } from "react"
import { Pie, PieChart, Label } from "recharts"

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/Components/ui/card"

import {
    ChartContainer,
} from "@/Components/ui/chart"

function GenderCounts({ data = [] }) {
    const chartData = useMemo(() => {
        return data.map((item) => ({
            gender:
                item.gender.charAt(0).toUpperCase() +
                item.gender.slice(1),

            count: Number(item.total) || 0,

            fill:
                item.gender.toLowerCase() === "male"
                    ? "#0077f8"
                    : "#ff69b4",
        }))
    }, [data])

    const totalStudents = useMemo(() => {
        return data.reduce(
            (acc, curr) => acc + (Number(curr.total) || 0),
            0
        )
    }, [data])

    const maleCount =
        chartData.find(
            (item) => item.gender === "Male"
        )?.count || 0

    const femaleCount =
        chartData.find(
            (item) => item.gender === "Female"
        )?.count || 0

    const malePercent =
        totalStudents > 0
            ? (maleCount / totalStudents) * 100
            : 0

    const femalePercent =
        totalStudents > 0
            ? (femaleCount / totalStudents) * 100
            : 0

    /*
     * Center Male at 12 o'clock
     */
    const maleAngle =
        totalStudents > 0
            ? (maleCount / totalStudents) * 360
            : 0

    const startAngle = 90 + maleAngle / 2
    const endAngle = startAngle - 360

    const chartConfig = {
        count: { label: "Count" },
        male: { label: "Male" },
        female: { label: "Female" },
    }

    return (
        <Card className="flex flex-col w-full h-full">
            <CardHeader>
                <CardTitle>Gender</CardTitle>
            </CardHeader>

            <CardContent className="flex-1 pb-4">
                <ChartContainer
                    config={chartConfig}
                    className="mx-auto w-[250px] h-[300px]"
                >
                    <PieChart
                        width={250}
                        height={300}
                    >
                        <Pie
                            data={chartData}
                            dataKey="count"
                            nameKey="gender"
                            cx={125}
                            cy={150}
                            innerRadius={70}
                            outerRadius={97.8}
                            startAngle={startAngle}
                            endAngle={endAngle}
                            stroke="hsl(var(--card))"
                            strokeWidth={2}
                            labelLine={false}
                        >
                            <Label
                                content={({ viewBox }) => {
                                    if (
                                        viewBox &&
                                        "cx" in viewBox &&
                                        "cy" in viewBox
                                    ) {
                                        return (
                                            <text
                                                x={viewBox.cx}
                                                y={viewBox.cy}
                                                textAnchor="middle"
                                                dominantBaseline="middle"
                                            >
                                                {/* Male count */}
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) - 60}
                                                    fill="#0077f8"
                                                    fontSize="14"
                                                    fontWeight="700"
                                                >
                                                    {maleCount.toLocaleString()}
                                                </tspan>

                                                {/* Male percentage BELOW count */}
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) - 46}
                                                    fill="#0077f8"
                                                    fontSize="11"
                                                    fontWeight="500"
                                                >
                                                    {malePercent.toFixed(0)}%
                                                </tspan>

                                                {/* Female percentage ABOVE count */}
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 46}
                                                    fill="#ff69b4"
                                                    fontSize="11"
                                                    fontWeight="500"
                                                >
                                                    {femalePercent.toFixed(0)}%
                                                </tspan>

                                                {/* Female count */}
                                                <tspan
                                                    x={viewBox.cx}
                                                    y={(viewBox.cy || 0) + 62}
                                                    fill="#ff69b4"
                                                    fontSize="14"
                                                    fontWeight="700"
                                                >
                                                    {femaleCount.toLocaleString()}
                                                </tspan>
                                            </text>
                                        )
                                    }

                                    return null
                                }}
                            />
                        </Pie>

                        {/* ==========================
                            MALE LABEL
                        =========================== */}
                        <text
                            x={130}
                            y={53}
                            textAnchor="middle"
                            fill="#0077f8"
                            fontSize={15}
                            fontWeight={500}
                        >
                            Male
                        </text>

                        {/* ==========================
                            FEMALE LABEL
                        =========================== */}
                        <text
                            x={128}
                            y={270}
                            textAnchor="middle"
                            fill="#ff69b4"
                            fontSize={15}
                            fontWeight={500}
                        >
                            Female
                        </text>
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    )
}

export default GenderCounts