import React from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert'
import { ClipboardList, Info } from 'lucide-react'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent } from '@/Components/ui/card'

function Materials() {
    return (
        <div className="flex min-h-[320px] w-full items-center justify-center p-4 sm:p-6">
            <Card className="w-full max-w-md rounded-2xl border-dashed bg-muted/20 py-0 shadow-none">
                <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:px-10">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <ClipboardList
                            aria-hidden="true"
                            className="h-8 w-8"
                            strokeWidth={1.5}
                        />
                    </div>

                    <Badge
                        variant="secondary"
                        className="mb-3 gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    >
                        <span
                            aria-hidden="true"
                            className="h-1.5 w-1.5 rounded-full bg-primary"
                        />
                        In development
                    </Badge>

                    <h3 className="text-lg font-semibold tracking-tight text-foreground">
                        Not complete yet
                    </h3>

                    <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                        The grading module is still being developed.
                        Please check back for updates.
                    </p>
                </CardContent>
            </Card>
        </div>
    )

}

export default Materials
