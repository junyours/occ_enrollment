import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card'
import { convertToAMPM } from '@/lib/utils'
import { Link } from '@inertiajs/react'
import { BookOpen, ChevronRight, ClipboardList, Clock, List, MapPin } from 'lucide-react'
import React from 'react'

const CellData = ({ icon, value }) => (
    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
        {icon}
        <span>{value}</span>
    </div>
)


function MobileViewClasses({ classes }) {
    return (
        <div>
            {/* mobile view */}
            {classes.map(classInfo => {
                const day = classInfo.day == "TBA" ? '-' : classInfo.day;
                const subject = classInfo.descriptive_title || '-';
                const time = classInfo.start_time == 'TBA' ? '-' : `${convertToAMPM(classInfo.start_time)} - ${convertToAMPM(classInfo.end_time)}`;
                const room = classInfo.room_name || '-';
                const section = classInfo.class_type == 'nstp' ? `${classInfo.component_name}-${classInfo.section}` : `${classInfo.course_name_abbreviation}-${classInfo.year_level_id}${classInfo.section}`;
                const openClassLink = classInfo.class_type != 'nstp' ? `/classes/classroom/${classInfo.hashed_year_section_subject_id}` : `/classes/nstp-classroom/${classInfo.hashed_nstp_sections_id}`;

                return (
                    <React.Fragment key={classInfo.id}>
                        {/* Primary Schedule */}
                        <Card className="mb-3">
                            <CardHeader className="pb-3">
                                <div className="flex items-center space-x-3">
                                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                                    <div>
                                        <CardTitle className="text-base">{subject}</CardTitle>
                                        <CardDescription>{day}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="py-0">
                                <div className="space-y-2 mb-4">
                                    <CellData icon={<Clock className="w-4 h-4" />} value={time} />
                                    <CellData icon={<MapPin className="w-4 h-4" />} value={room} />
                                    <CellData icon={<ClipboardList className="w-4 h-4" />} value={section} />
                                </div>
                            </CardContent>
                            <CardFooter className="pt-0">
                                <Link href={openClassLink} className="w-full">
                                    <Button className="w-full">
                                        <BookOpen className="w-4 h-4 mr-2" />
                                        Open Class
                                        <ChevronRight className="w-4 h-4 ml-2" />
                                    </Button>
                                </Link>
                            </CardFooter>
                        </Card>

                        {/* Secondary Schedule */}
                        {(() => {
                            if (!classInfo.secondary_schedule) return null;
                            const day = classInfo.secondary_schedule.day == "TBA" ? '-' : classInfo.secondary_schedule.day;
                            const time = classInfo.secondary_schedule.start_time == 'TBA' ? '-' : `${convertToAMPM(classInfo.secondary_schedule.start_time)} - ${convertToAMPM(classInfo.secondary_schedule.end_time)}`;
                            const room = classInfo.secondary_schedule.room_name || '-';

                            return (
                                <Card className="mb-3">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <CardTitle className="text-base">{subject}</CardTitle>
                                                    <Badge variant="secondary" className="text-xs">
                                                        2nd Schedule
                                                    </Badge>
                                                </div>
                                                <CardDescription>
                                                    {day}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="pt-0">
                                        <div className="space-y-2 mb-4">

                                            <CellData icon={<Clock className="w-4 h-4" />} value={time} />
                                            <CellData icon={<MapPin className="w-4 h-4" />} value={room} />
                                            <CellData icon={<ClipboardList className="w-4 h-4" />} value={section} />
                                        </div>
                                    </CardContent>
                                    <CardFooter className="pt-0">
                                        
                                                                            <Link href={`classes/classroom/${classInfo.hashed_year_section_subject_id}`} className="w-full">
                                            <Button className="w-full">
                                                <BookOpen className="w-4 h-4 mr-2" />
                                                Open Class
                                                <ChevronRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            )
                        })()}

                    </React.Fragment>
                )
            })}
        </div>
    )
}

export default MobileViewClasses
