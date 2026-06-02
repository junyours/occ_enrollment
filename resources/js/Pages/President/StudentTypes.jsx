import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/Components/ui/chart'
import React from 'react'
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, XAxis } from 'recharts';

const studentTypeChartConfig = {
    Freshman: { color: "#FFD700" },  // Yellow
    Old: { color: "#8A2BE2" },       // Purple
    Returnee: { color: "#20B2AA" },  // Greenish
    Transferee: { color: "#FF1493" } // Pink
};

function StudentTypes({ data = [] }) {
    const desiredOrder = ["Freshman", "Old", "Returnee", "Transferee"];

    // Sort and map to match chart format
    const chartData = desiredOrder.map(name => {
        const match = data.find(d => d.student_type_name === name);
        return {
            name,
            count: match ? match.total : 0,
        };
    });

    return (
        <Card className="flex flex-col w-full ">
            <CardHeader>
                <CardTitle>Student Types</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-2">
                <ResponsiveContainer width="100%" height={230}>
                    <ChartContainer config={studentTypeChartConfig}>
                        <BarChart
                            data={chartData}
                            margin={{ top: 20 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <ChartTooltip content={<ChartTooltipContent hideIndicator={true} />} />
                            <Bar dataKey="count" radius={8}>
                                <LabelList dataKey="count" position="top" fontSize={14} />
                                {chartData.map((entry) => (
                                    <Cell
                                        key={entry.name}
                                        fill={studentTypeChartConfig[entry.name]?.color || "#000"}
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ChartContainer>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

export default StudentTypes
