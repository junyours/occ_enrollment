import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Calendar, Clock } from 'lucide-react'
import React from 'react'

const ScheduleItem = ({ dates, title, subtitle }) => (
    <article className="flex flex-col sm:flex-row sm:justify-between sm:items-start sm:items-center p-4 border border-border rounded-lg bg-card text-card-foreground shadow-sm gap-3 transition-colors hover:bg-muted/50">
        <span className="flex flex-col gap-1">
            <span className="font-semibold text-base sm:text-lg leading-none">{title}</span>
            {subtitle && <span className="text-xs text-muted-foreground leading-snug">{subtitle}</span>}
        </span>
        <span className="inline-flex shrink-0 items-center rounded-md bg-muted px-2.5 py-1 text-sm font-medium text-foreground">
            {dates}
        </span>
    </article>
);

export default function EnrollmentSchedule() {
    return (
        <Card className="mt-8 border-border">
            <CardHeader className="space-y-4 pb-4">
                <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight">Enrollment Schedule</CardTitle>
                <span className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-sm text-muted-foreground font-medium">
                    <span className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Monday - Friday
                    </span>
                    <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-border"></span>
                    <span className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        8:00 AM - 4:00 PM
                    </span>
                </span>
            </CardHeader>
            <CardContent>
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <ScheduleItem dates="July 6 - 10" title="Freshmen" />
                    <ScheduleItem dates="July 13 - 17" title="2nd Year" />
                    <ScheduleItem dates="July 20 - 24" title="3rd Year" />
                    <ScheduleItem dates="July 27 - 31" title="4th Year" />
                    <ScheduleItem dates="August 3 - 7" title="Transferees & Returnees" />
                    <ScheduleItem dates="August 10 - 14" title="Late Enrollment" />
                    <ScheduleItem
                        dates="August 17 - 21"
                        title="Adjusting Period"
                        subtitle="Adding/dropping of subjects and withdrawal of enrollment"
                    />
                </section>
            </CardContent>
        </Card>
    )
}