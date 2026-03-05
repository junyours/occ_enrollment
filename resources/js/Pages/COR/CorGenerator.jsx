import OCC_LOGO from '../../../images/OCC_LOGO.png'
import { formatFullName } from '@/Lib/Utils';
import CorStudentSubjects from './CorStudentSubjects';
import CorStudentInfo from './CorStudentInfo';
import CorFees from './CorFees';
import Signatories from './Signatories';
import { useState, useEffect } from 'react'; // Added useEffect

// Shadcn UI Imports (Adjust paths based on your aliases, usually @/components/ui/...)
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Settings2 } from "lucide-react";

// Define defaults outside the component so we can fallback to them easily
const defaultSettings = {
    showSubjectCode: true,
    showCourseSection: true,
    showDescriptiveTitle: true,
    showUnits: true,
    showLecUnits: true,
    showLabUnits: true,
    showCreditUnits: true,
    showSchedule: true,
    showDay: true,
    showTime: true,
    showRoom: true,
    showInstructor: true
};

function CorGenerator({ data, showSeal }) {
    // 1. Initialize state from localStorage, fallback to defaultSettings
    const [settings, setSettings] = useState(() => {
        // Ensure we are in a browser environment (important for Next.js/SSR)
        if (typeof window !== 'undefined') {
            const savedSettings = localStorage.getItem('cor_table_settings');
            if (savedSettings) {
                try {
                    return JSON.parse(savedSettings);
                } catch (error) {
                    console.error("Failed to parse local storage settings:", error);
                }
            }
        }
        return defaultSettings;
    });

    // 2. Save to localStorage whenever settings change
    useEffect(() => {
        localStorage.setItem('cor_table_settings', JSON.stringify(settings));
    }, [settings]);

    const toggle = (key) => setSettings(s => ({ ...s, [key]: !s[key] }));

    if (!data) return <>No Data</>

    return (
        <div className="flex flex-col items-center min-h-screen">

            <div className="fixed top-6 right-6 z-50 print:hidden">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="shadow-sm flex items-center gap-2 bg-white">
                            <Settings2 className="w-4 h-4" />
                            Customize View
                        </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-80 p-5 shadow-xl rounded-xl" align="end">
                        <div className="space-y-4">
                            <div>
                                <h3 className="font-semibold leading-none tracking-tight">Table Settings</h3>
                                <p className="text-sm text-muted-foreground mt-1.5">Toggle column visibility for printing.</p>
                            </div>

                            <Separator />

                            {/* Main Columns */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Main Columns</h4>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="showSubjectCode" checked={settings.showSubjectCode} onCheckedChange={() => toggle('showSubjectCode')} />
                                        <Label htmlFor="showSubjectCode" className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Subject Code</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="showCourseSection" checked={settings.showCourseSection} onCheckedChange={() => toggle('showCourseSection')} />
                                        <Label htmlFor="showCourseSection" className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Course Section</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="showDescriptiveTitle" checked={settings.showDescriptiveTitle} onCheckedChange={() => toggle('showDescriptiveTitle')} />
                                        <Label htmlFor="showDescriptiveTitle" className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Descriptive Title</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="showInstructor" checked={settings.showInstructor} onCheckedChange={() => toggle('showInstructor')} />
                                        <Label htmlFor="showInstructor" className="cursor-pointer text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Instructor</Label>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Units Settings */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Units Display</h4>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="showUnits" checked={settings.showUnits} onCheckedChange={() => toggle('showUnits')} />
                                        <Label htmlFor="showUnits" className="cursor-pointer font-bold text-sm leading-none">Show All Units</Label>
                                    </div>
                                    <div className="flex flex-col gap-3 ml-6">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="showLecUnits" checked={settings.showLecUnits} onCheckedChange={() => toggle('showLecUnits')} disabled={!settings.showUnits} />
                                            <Label htmlFor="showLecUnits" className={`cursor-pointer text-sm font-medium leading-none ${!settings.showUnits && 'text-muted-foreground opacity-70'}`}>Lecture</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="showLabUnits" checked={settings.showLabUnits} onCheckedChange={() => toggle('showLabUnits')} disabled={!settings.showUnits} />
                                            <Label htmlFor="showLabUnits" className={`cursor-pointer text-sm font-medium leading-none ${!settings.showUnits && 'text-muted-foreground opacity-70'}`}>Laboratory</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="showCreditUnits" checked={settings.showCreditUnits} onCheckedChange={() => toggle('showCreditUnits')} disabled={!settings.showUnits} />
                                            <Label htmlFor="showCreditUnits" className={`cursor-pointer text-sm font-medium leading-none ${!settings.showUnits && 'text-muted-foreground opacity-70'}`}>Credit</Label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Schedule Settings */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Schedule Display</h4>
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="showSchedule" checked={settings.showSchedule} onCheckedChange={() => toggle('showSchedule')} />
                                        <Label htmlFor="showSchedule" className="cursor-pointer font-bold text-sm leading-none">Show All Schedule</Label>
                                    </div>
                                    <div className="flex flex-col gap-3 ml-6">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="showDay" checked={settings.showDay} onCheckedChange={() => toggle('showDay')} disabled={!settings.showSchedule} />
                                            <Label htmlFor="showDay" className={`cursor-pointer text-sm font-medium leading-none ${!settings.showSchedule && 'text-muted-foreground opacity-70'}`}>Day</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="showTime" checked={settings.showTime} onCheckedChange={() => toggle('showTime')} disabled={!settings.showSchedule} />
                                            <Label htmlFor="showTime" className={`cursor-pointer text-sm font-medium leading-none ${!settings.showSchedule && 'text-muted-foreground opacity-70'}`}>Time</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Checkbox id="showRoom" checked={settings.showRoom} onCheckedChange={() => toggle('showRoom')} disabled={!settings.showSchedule} />
                                            <Label htmlFor="showRoom" className={`cursor-pointer text-sm font-medium leading-none ${!settings.showSchedule && 'text-muted-foreground opacity-70'}`}>Room</Label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs text-muted-foreground hover:text-red-600"
                                onClick={() => setSettings(defaultSettings)}
                            >
                                Reset to Defaults
                            </Button>

                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Main Document */}
            <div className="relative space-y-4 p-5 flex justify-center bg-white rounded-lg text-black w-[800px]">
                {showSeal && (
                    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none print:hidden">
                        <div className="bg-red-600 text-white font-bold text-4xl px-4 py-2 rounded-lg opacity-80 rotate-[20deg]">
                            NO PERMISSION TO VIEW
                        </div>
                    </div>
                )}

                <div className="p-5 border border-gray-600 w-full space-y-4 relative z-10">
                    <div className="flex items-center justify-center space-x-4">
                        <div className="text-center flex flex-col relative">
                            <img src={OCC_LOGO} alt="Logo" className="h-full absolute -left-40" />
                            <h1 className="text-lg font-bold">OPOL COMMUNITY COLLEGE</h1>
                            <p className="text-sm">Opol, Misamis Oriental</p>
                            <h2 className="text-xl font-bold">CERTIFICATE OF REGISTRATION</h2>
                        </div>
                    </div>

                    <CorStudentInfo data={data} showSeal={showSeal} />

                    <CorStudentSubjects data={data.student_subject} showSeal={showSeal} settings={settings} />

                    <div className='flex justify-around gap-4'>
                        <CorFees
                            subjects={data.student_subject}
                            course={data.year_section.course.course_name_abbreviation}
                            courseId={data.year_section.course.id}
                            yearLevel={data.year_section.year_level_id}
                            showSeal={showSeal}
                            semester={data.year_section.school_year.semester.semester_name}
                            studentType={data.student_type_id}
                        />
                        <Signatories showSeal={showSeal} />
                    </div>

                    <div className="mt-2 text-[8px]">
                        Evaluator: {formatFullName(data.evaluator.evaluator_information)}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default CorGenerator