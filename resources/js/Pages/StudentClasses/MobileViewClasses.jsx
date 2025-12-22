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
import { Clock, MapPin, User, BookOpen, Loader2, AlertCircle } from 'lucide-react'

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
                    {classes.map((classInfo) => (
                        <React.Fragment key={classInfo.id}>
                            {/* Primary Schedule */}
                            <Card className="mb-3">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center space-x-3">
                                        <div
                                            className={`w-3 h-3 rounded-full ${classInfo.day ===
                                                new Date().toLocaleString('en-US', {
                                                    weekday: 'long',
                                                })
                                                ? 'bg-green-500'
                                                : 'bg-blue-700'
                                                }`}
                                        />
                                        <div>
                                            <CardTitle className="text-base">
                                                {classInfo.descriptive_title}
                                            </CardTitle>
                                            <CardDescription>
                                                {classInfo.day === 'TBA'
                                                    ? '-'
                                                    : classInfo.day}
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-0">
                                    <div className="space-y-2">
                                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                            <Clock className="w-4 h-4" />
                                            <span>
                                                {classInfo.start_time === 'TBA'
                                                    ? '-'
                                                    : `${convertToAMPM(
                                                        classInfo.start_time
                                                    )} - ${convertToAMPM(
                                                        classInfo.end_time
                                                    )}`}
                                            </span>
                                        </div>

                                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                            <MapPin className="w-4 h-4" />
                                            <span>
                                                {classInfo.room_name || '-'}
                                            </span>
                                        </div>

                                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                            <User className="w-4 h-4" />
                                            <span>
                                                {classInfo.first_name
                                                    ? formatFullName(classInfo)
                                                    : '-'}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Secondary Schedule */}
                            {classInfo.secondary_schedule && (
                                <Card className="mb-3">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className={`w-3 h-3 rounded-full ${classInfo.secondary_schedule.day ===
                                                    new Date().toLocaleString('en-US', {
                                                        weekday: 'long',
                                                    })
                                                    ? 'bg-green-500'
                                                    : 'bg-blue-500'
                                                    }`}
                                            />
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <CardTitle className="text-base">
                                                        {
                                                            classInfo.descriptive_title
                                                        }
                                                    </CardTitle>
                                                    <Badge
                                                        variant="secondary"
                                                        className="text-xs"
                                                    >
                                                        2nd Schedule
                                                    </Badge>
                                                </div>
                                                <CardDescription>
                                                    {classInfo.secondary_schedule
                                                        .day === 'TBA'
                                                        ? '-'
                                                        : classInfo.secondary_schedule
                                                            .day}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>

                                    <CardContent className="pt-0">
                                        <div className="space-y-2">
                                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                <Clock className="w-4 h-4" />
                                                <span>
                                                    {classInfo.secondary_schedule
                                                        .start_time === 'TBA'
                                                        ? '-'
                                                        : `${convertToAMPM(
                                                            classInfo
                                                                .secondary_schedule
                                                                .start_time
                                                        )} - ${convertToAMPM(
                                                            classInfo
                                                                .secondary_schedule
                                                                .end_time
                                                        )}`}
                                                </span>
                                            </div>

                                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                <MapPin className="w-4 h-4" />
                                                <span>
                                                    {classInfo.secondary_schedule
                                                        .room_name || '-'}
                                                </span>
                                            </div>

                                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                <User className="w-4 h-4" />
                                                <span>
                                                    {classInfo.first_name
                                                        ? formatFullName(classInfo)
                                                        : '-'}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}
                        </React.Fragment>
                    ))}
                </>
            )}
        </div>
    )
}

export default MobileViewClasses
