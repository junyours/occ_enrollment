import { Badge } from '@/Components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card'
import { convertToAMPM, formatFullName } from '@/Lib/Utils'
import { Clock, MapPin, User } from 'lucide-react'
import React from 'react'

function MobileViewClasses({ classes }) {
    return (
        <div>
            {/* mobile view */}
            {classes.map(classInfo => (
                <React.Fragment key={classInfo.id}>
                    {/* Primary Schedule */}
                    <Card className="mb-3">
                        <CardHeader className="pb-3">
                            <div className="flex items-center space-x-3">
                                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                <div>
                                    <CardTitle className="text-base">{classInfo.descriptive_title}</CardTitle>
                                    <CardDescription>{classInfo.day === "TBA" ? '-' : classInfo.day}</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-2 ">
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                        {classInfo.start_time === 'TBA'
                                            ? '-'
                                            : `${convertToAMPM(classInfo.start_time)} - ${convertToAMPM(classInfo.end_time)}`
                                        }
                                    </span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                    <MapPin className="w-4 h-4" />
                                    <span>{classInfo.room_name || '-'}</span>
                                </div>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                    <User className="w-4 h-4" />
                                    <span>{classInfo.first_name ? formatFullName(classInfo) : '-'}</span>
                                </div>
                            </div>
                        </CardContent>
                        {/* <CardFooter className="pt-0">
                            <Link href={`classes/classroom/${classInfo.hashed_year_section_subject_id}`} className="w-full">
                                <Button className="w-full">
                                    <BookOpen className="w-4 h-4 mr-2" />
                                    Open Class
                                    <ChevronRight className="w-4 h-4 ml-2" />
                                </Button>
                            </Link>
                        </CardFooter> */}
                    </Card>

                    {/* Secondary Schedule */}
                    {classInfo.secondary_schedule && (
                        <Card className="mb-3">
                            <CardHeader className="pb-3">
                                <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <CardTitle className="text-base">{classInfo.descriptive_title}</CardTitle>
                                            <Badge variant="secondary" className="text-xs">
                                                2nd Schedule
                                            </Badge>
                                        </div>
                                        <CardDescription>
                                            {classInfo.secondary_schedule.day === "TBA" ? '-' : classInfo.secondary_schedule.day}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                <div className="space-y-2 ">
                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                        <Clock className="w-4 h-4" />
                                        <span>
                                            {classInfo.secondary_schedule.start_time === 'TBA'
                                                ? '-'
                                                : `${convertToAMPM(classInfo.secondary_schedule.start_time)} - ${convertToAMPM(classInfo.secondary_schedule.end_time)}`
                                            }
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                        <MapPin className="w-4 h-4" />
                                        <span>{classInfo.secondary_schedule.room_name || '-'}</span>
                                    </div>
                                </div>
                            </CardContent>
                            {/* <CardFooter className="pt-0">
                                <Link href={`classes/classroom/${classInfo.hashed_year_section_subject_id}`} className="w-full">
                                    <Button className="w-full">
                                        <BookOpen className="w-4 h-4 mr-2" />
                                        Open Class
                                        <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                            </CardFooter> */}
                        </Card>
                    )}
                </React.Fragment>
            ))}
        </div>
    )
}

export default MobileViewClasses
