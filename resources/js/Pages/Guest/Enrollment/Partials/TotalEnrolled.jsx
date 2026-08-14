import { Card, CardContent } from '@/Components/ui/card'
import { UserCheck } from 'lucide-react'
import React from 'react'

function TotalEnrolled({ total }) {
    const displayTotal = total ?? 0

    return (
        <Card className="h-full overflow-hidden">
            <CardContent className="flex h-full items-center justify-center gap-10 p-6">
                <div className="space-y-3">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">
                            Total Enrolled
                        </p>

                        <p className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                            {displayTotal.toLocaleString()}
                        </p>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Currently enrolled students
                    </p>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
                    <UserCheck className="h-7 w-7 text-primary" />
                </div>
            </CardContent>
        </Card>
    )
}

export default TotalEnrolled