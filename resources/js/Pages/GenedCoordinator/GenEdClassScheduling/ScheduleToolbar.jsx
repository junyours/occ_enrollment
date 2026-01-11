import React from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { cn } from '@/Lib/Utils';
import { Card } from '@/Components/ui/card';

function ScheduleToolbar({ scheduleType, setScheduleType, className }) {
    return (
        <Card className={cn("w-max", className)} >
            <Tabs value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                <TabsList className="grid max-w-max grid-cols-2">
                    <TabsTrigger className="w-28" value="tabular">Tabular</TabsTrigger>
                    <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                </TabsList>
            </Tabs>
        </Card>
    )
}

export default ScheduleToolbar
