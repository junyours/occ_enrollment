import { Card, CardContent } from '@/Components/ui/card';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/Components/ui/command';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Switch } from '@/Components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import React from 'react';

const TimeTableSkeleton = () => {
    const Blink = ({ className }) => (
        <div className={`animate-pulse rounded ${className}`}></div>
    );

    return (
        <div className="rounded-lg shadow-sm space-y-4">
            {/* Header Info */}
            <Card>
                <CardContent className="p-2">
                    <div className="flex gap-2 w-min">
                        <Tabs className="w-max" value="timetable" defaultValue="timetable" >
                            <TabsList className="grid max-w-max grid-cols-2">
                                <TabsTrigger className="w-28" value="tabular" >Tabular</TabsTrigger>
                                <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                            </TabsList>
                        </Tabs>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Input
                                    placeholder="All"
                                    readOnly
                                    value="All"
                                    className="cursor-pointer text-start border w-60 truncate overflow-hidden"
                                />
                            </PopoverTrigger>
                            <PopoverContent className="w-60 p-0">
                                <Command>
                                    <CommandInput placeholder="Search room..." className="h-9 border-0 outline-none p-0" />
                                    <CommandList>
                                        <CommandEmpty>No room found.</CommandEmpty>
                                        <CommandGroup>
                                            <CommandItem
                                                value="All"
                                            >
                                                All
                                            </CommandItem>
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked='true'
                                id="color"
                            />
                            <Label htmlFor="airplane-mode">Color</Label>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Timetable Grid */}
            <div className="grid grid-cols-8 border">
                {/* Days Header */}
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="border p-2">
                        <Blink className="h-4 w-full" />
                    </div>
                ))}

                {/* Time Slots (Rows) */}
                {[...Array(12)].map((_, rowIdx) => (
                    <React.Fragment key={rowIdx}>
                        {/* Time Column */}
                        <div className="border p-2"><Blink className="h-4 w-full" /></div>

                        {/* Day Columns */}
                        {[...Array(7)].map((_, colIdx) => (
                            <div key={colIdx} className="border p-1 h-16 relative">
                                {/* Randomly place "Course Blocks" to mimic the visual density */}
                                {(rowIdx + colIdx) % 5 === 0 && (
                                    <div className="absolute inset-1 flex flex-col gap-1">
                                        <Blink className="h-full w-full opacity-60" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default TimeTableSkeleton;