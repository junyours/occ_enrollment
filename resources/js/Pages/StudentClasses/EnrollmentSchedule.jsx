import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Calendar, Clock, CheckCircle2, Circle, ArrowRightCircle } from 'lucide-react'
import React from 'react'

/**
 * Utility to determine schedule status based on the date string.
 * Uses July 22, 2026, as the reference current date (based on system context).
 */
const getScheduleStatus = (dateStr) => {
    const currentDate = new Date('2026-07-22T00:00:00');

    // Parses formats like "July 6 - 10"
    const match = dateStr.match(/([a-zA-Z]+)\s+(\d+)\s*-\s*(\d+)/);
    if (!match) return 'upcoming';

    const [_, month, startDay, endDay] = match;
    const startDate = new Date(`2026 ${month} ${startDay}`);
    const endDate = new Date(`2026 ${month} ${endDay}`);
    endDate.setHours(23, 59, 59, 999);

    if (currentDate > endDate) return 'completed';
    if (currentDate >= startDate && currentDate <= endDate) return 'ongoing';
    return 'upcoming';
};

const ScheduleItem = ({ dates, title, subtitle }) => {
    const status = getScheduleStatus(dates);

    // Visual configuration dictionary based on automatically detected status
    const styles = {
        ongoing: {
            wrapper: "border-primary/40 bg-primary/[0.03] shadow-md shadow-primary/5 ring-1 ring-primary/10 hover:shadow-lg hover:shadow-primary/10",
            accent: "bg-primary",
            title: "text-primary font-bold",
            icon: <ArrowRightCircle className="w-5 h-5 text-primary animate-pulse" />,
            dateBadge: "bg-primary text-primary-foreground border-primary",
            dateIcon: "text-primary-foreground/80"
        },
        upcoming: {
            wrapper: "border-border bg-card shadow-sm hover:shadow-md hover:border-border/80",
            accent: "bg-transparent",
            title: "text-foreground font-semibold",
            icon: <Circle className="w-5 h-5 text-muted-foreground/40" />,
            dateBadge: "bg-muted/50 text-foreground border-border/50",
            dateIcon: "text-muted-foreground"
        },
        completed: {
            wrapper: "border-border/50 bg-muted/20 opacity-80 hover:opacity-100 transition-opacity",
            accent: "bg-muted-foreground/20",
            title: "text-muted-foreground font-medium line-through decoration-muted-foreground/30",
            icon: <CheckCircle2 className="w-5 h-5 text-muted-foreground/50" />,
            dateBadge: "bg-transparent text-muted-foreground border-transparent",
            dateIcon: "text-muted-foreground/50"
        }
    };

    const currentStyle = styles[status];

    return (
        <article className={`relative overflow-hidden group flex flex-col sm:flex-row sm:justify-between sm:items-center p-5 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 ${currentStyle.wrapper}`}>
            {/* Left Accent Line */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${currentStyle.accent}`} />

            <div className="flex items-start gap-3 pl-2">
                <div className="mt-0.5 shrink-0 transition-transform group-hover:scale-110">
                    {currentStyle.icon}
                </div>
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2.5">
                        <span className={`text-base sm:text-lg leading-none tracking-tight ${currentStyle.title}`}>
                            {title}
                        </span>
                        {status === 'ongoing' && (
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] uppercase font-bold tracking-wider">
                                Active Now
                            </span>
                        )}
                    </div>
                    {subtitle && (
                        <span className="text-sm text-muted-foreground/90 leading-snug max-w-[280px]">
                            {subtitle}
                        </span>
                    )}
                </div>
            </div>

            <div className="mt-4 sm:mt-0 pl-10 sm:pl-0 shrink-0">
                <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold border transition-colors ${currentStyle.dateBadge}`}>
                    <Calendar className={`w-4 h-4 ${currentStyle.dateIcon}`} />
                    {dates}
                </div>
            </div>
        </article>
    );
};

export default function EnrollmentSchedule() {
    return (
        <Card className="mt-8 border-border/60 shadow-sm overflow-hidden rounded-2xl">
            {/* Subtle header gradient for a premium feel */}
            <CardHeader className="space-y-6 pb-6 bg-gradient-to-b from-muted/30 to-transparent border-b border-border/40">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                    <div className="space-y-1.5">
                        <CardTitle className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                            Enrollment Schedule
                        </CardTitle>
                        <p className="text-muted-foreground text-sm font-medium">
                            Please secure your enrollment during your designated period.
                        </p>
                    </div>

                    {/* Redesigned Office Hours section using chips */}
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 bg-background border border-border/60 shadow-sm rounded-full px-4 py-1.5 text-sm font-medium text-foreground">
                            <Calendar className="w-4 h-4 text-primary/70" />
                            Monday - Friday
                        </div>
                        <div className="flex items-center gap-2 bg-background border border-border/60 shadow-sm rounded-full px-4 py-1.5 text-sm font-medium text-foreground">
                            <Clock className="w-4 h-4 text-primary/70" />
                            8:00 AM - 4:00 PM
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="pt-6 px-4 md:px-6">
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
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