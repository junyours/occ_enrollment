import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { UserCheck } from 'lucide-react'
import React from 'react'

function TotalEnrolled({ total }) {
    return (
        <Card className="items-center flex flex-col justify-center">
            <CardHeader className="flex items-center justify-between">
                <CardTitle>Total Enrolled</CardTitle>
                <UserCheck className="w-6 h-6 text-gray-500" />
            </CardHeader>

            <CardContent className="flex flex-col items-center gap-2 pt-4">
                {total > 0 ? (
                    <>
                        <span className="text-md sm:text-4xl font-bold">{total}</span>
                        <span className="text-gray-500 text-sm">students enrolled</span>
                    </>
                ) : (
                    <span className="text-gray-400 text-sm">No data available</span>
                )}
            </CardContent>
        </Card>
    )
}

export default TotalEnrolled
