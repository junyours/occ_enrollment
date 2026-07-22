import React from 'react'
import { Badge } from '@/Components/ui/badge'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/Components/ui/card'
import { convertToAMPM, formatFullName } from '@/Lib/Utils'
import { Clock, MapPin, User, BookOpen, Loader2, AlertCircle, Calendar } from 'lucide-react'

const today = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(new Date());

function MobileViewClasses({ classes, isLoading, isError, error }) {

    return (
        <div>
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                    <p className="text-sm">Loading classes...</p>
                </div>
            ) : isError ? (
                <div className="flex flex-col items-center justify-center py-12 text-destructive">
                    <AlertCircle className="w-8 h-8 mb-3" />
                    <p className="text-sm font-medium">Failed to load classes</p>
                    <p className="text-xs text-muted-foreground mt-1">{error.response?.data?.error ?? 'Please try again later'}</p>

                </div>
            ) : classes?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No classes</p>
                    <p className="text-xs mt-1">Check back later or contact administration</p>
                </div>
            ) : (
                <>
                    {classes.map((classInfo) => {
                        // Check if today matches
                        const isPrimaryToday = classInfo.day === today;
                        const isSecondaryToday = classInfo.secondary_schedule?.day === today;

                        // Aesthetic highlight: Glowing left border and subtle tinted background
                        const activeCardClass = "border-l-4 border-l-primary bg-primary/[0.03] dark:bg-primary/[0.07] shadow-md ring-1 ring-primary/10";

                        return (
                            <React.Fragment key={classInfo.id}>
                                {/* Primary Schedule */}
                                <Card className={`mb-4 transition-all duration-300 ${isPrimaryToday ? activeCardClass : ""}`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center space-x-3">
                                                {/* Visual Indicator Dot */}
                                                <div className="relative flex h-3 w-3">
                                                    {isPrimaryToday && (
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                    )}
                                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isPrimaryToday ? 'bg-primary' : 'bg-muted-foreground/30'}`}></span>
                                                </div>

                                                <div>
                                                    <CardTitle className={`text-base leading-tight ${isPrimaryToday ? 'text-primary font-bold' : ''}`}>
                                                        {classInfo.descriptive_title}
                                                    </CardTitle>
                                                    <CardDescription className="flex items-center gap-1 mt-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {classInfo.day === 'TBA' ? '-' : classInfo.day}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="pt-0">
                                        {classInfo.type === 'nstp' && !classInfo.nstp_student_schedule_id ? (
                                            <div className="mt-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-4 flex gap-3">
                                                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                                                <div className="flex flex-col gap-1 text-left">
                                                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-400">Action Required</span>
                                                    <span className="text-sm text-amber-700/80 dark:text-amber-300/80">
                                                        Visit the NSTP office to finalize your schedule assignment.
                                                    </span>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-y-3">
                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <Clock className={`w-4 h-4 ${isPrimaryToday ? 'text-primary' : ''}`} />
                                                    <span className="tabular-nums">
                                                        {classInfo.start_time === 'TBA' ? '-' : `${convertToAMPM(classInfo.start_time)} – ${convertToAMPM(classInfo.end_time)}`}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <MapPin className={`w-4 h-4 ${isPrimaryToday ? 'text-primary' : ''}`} />
                                                    <span className={isPrimaryToday ? "font-medium text-foreground" : ""}>
                                                        {classInfo.room_name || 'TBA'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground col-span-2 border-t pt-2 mt-1">
                                                    <User className="w-4 h-4 opacity-70" />
                                                    <span className="text-xs italic truncate">
                                                        {classInfo.first_name ? formatFullName(classInfo) : 'No instructor assigned'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Secondary Schedule */}
                                {classInfo.secondary_schedule && (
                                    <Card className={`mb-4 transition-all duration-300 ${isSecondaryToday ? activeCardClass : ""}`}>
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start space-x-3">
                                                <div className="relative flex h-3 w-3 mt-1">
                                                    {isSecondaryToday && (
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                                    )}
                                                    <span className={`relative inline-flex rounded-full h-3 w-3 ${isSecondaryToday ? 'bg-primary' : 'bg-muted-foreground/30'}`}></span>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <CardTitle className={`text-base ${isSecondaryToday ? 'text-primary font-bold' : ''}`}>
                                                            {classInfo.descriptive_title}
                                                        </CardTitle>
                                                        <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter h-4 px-1">2nd</Badge>
                                                    </div>
                                                    <CardDescription className="flex items-center gap-1 mt-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {classInfo.secondary_schedule.day}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="grid grid-cols-2 gap-y-3">
                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <Clock className={`w-4 h-4 ${isSecondaryToday ? 'text-primary' : ''}`} />
                                                    <span className="tabular-nums">
                                                        {convertToAMPM(classInfo.secondary_schedule.start_time)} - {convertToAMPM(classInfo.secondary_schedule.end_time)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                    <MapPin className={`w-4 h-4 ${isSecondaryToday ? 'text-primary' : ''}`} />
                                                    <span className={isSecondaryToday ? "font-medium text-foreground" : ""}>
                                                        {classInfo.secondary_schedule.room_name || 'TBA'}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </React.Fragment>
                        );
                    })}
                </>
            )}
        </div>
    )
}

export default MobileViewClasses
