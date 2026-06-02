import OCC_LOGO from '../../../images/OCC_LOGO.png'
import { formatFullName } from '@/Lib/Utils';
import CorStudentSubjects from './CorStudentSubjects';
import CorStudentInfo from './CorStudentInfo';
import CorFees from './CorFees';
import Signatories from './Signatories';
import { useState, useEffect } from 'react';

// Shadcn UI Imports
import { Button } from "@/Components/ui/button";
import { Checkbox } from "@/Components/ui/checkbox";
import { Label } from "@/Components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/Components/ui/popover";
import { Separator } from "@/Components/ui/separator";
import { Settings2 } from "lucide-react";

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
    // 1. Initialize global table settings from localStorage
    const [settings, setSettings] = useState(() => {
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

    // 2. Local State for hiding specific subjects (NOT saved to localStorage)
    const [hiddenSubjects, setHiddenSubjects] = useState([]);

    // Save table settings to localStorage
    useEffect(() => {
        localStorage.setItem('cor_table_settings', JSON.stringify(settings));
    }, [settings]);

    const toggle = (key) => setSettings(s => ({ ...s, [key]: !s[key] }));

    // Toggle individual subject visibility based on its unique ID
    const toggleSubjectVisibility = (subjectId) => {
        setHiddenSubjects(prev =>
            prev.includes(subjectId)
                ? prev.filter(id => id !== subjectId) // Remove from hidden list
                : [...prev, subjectId] // Add to hidden list
        );
    };

    if (!data) return <>No Data</>

    // 3. Filter subjects before passing them to child components
    const visibleSubjects = data.student_subject.filter(
        sub => !hiddenSubjects.includes(sub.id)
    );

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

                    {/* Increased width to accommodate longer subject names and added max-height for scrolling */}
                    <PopoverContent className="w-96 p-5 shadow-xl rounded-xl max-h-[85vh] overflow-y-auto" align="end">
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
                                        <Label htmlFor="showSubjectCode" className="cursor-pointer text-sm font-medium leading-none">Subject Code</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="showCourseSection" checked={settings.showCourseSection} onCheckedChange={() => toggle('showCourseSection')} />
                                        <Label htmlFor="showCourseSection" className="cursor-pointer text-sm font-medium leading-none">Course Section</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="showDescriptiveTitle" checked={settings.showDescriptiveTitle} onCheckedChange={() => toggle('showDescriptiveTitle')} />
                                        <Label htmlFor="showDescriptiveTitle" className="cursor-pointer text-sm font-medium leading-none">Descriptive Title</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Checkbox id="showInstructor" checked={settings.showInstructor} onCheckedChange={() => toggle('showInstructor')} />
                                        <Label htmlFor="showInstructor" className="cursor-pointer text-sm font-medium leading-none">Instructor</Label>
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

                            {/* --- NEW: FILTER SUBJECTS SECTION --- */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Filter Subjects</h4>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 text-[10px] px-2 text-blue-600 hover:text-blue-800"
                                        onClick={() => setHiddenSubjects([])}
                                    >
                                        Show All
                                    </Button>
                                </div>
                                <div className="flex flex-col gap-3 max-h-48 overflow-y-auto pr-2 scrollbar-thin">
                                    {data.student_subject.map((sub) => (
                                        <div key={sub.id} className="flex items-start space-x-2">
                                            <Checkbox
                                                id={`sub-${sub.id}`}
                                                checked={!hiddenSubjects.includes(sub.id)}
                                                onCheckedChange={() => toggleSubjectVisibility(sub.id)}
                                                className="mt-0.5"
                                            />
                                            <Label htmlFor={`sub-${sub.id}`} className="cursor-pointer text-xs font-medium leading-tight">
                                                <span className="font-bold">{sub.year_section_subjects.subject.subject_code}</span>
                                                <span className="text-muted-foreground block text-[10px] mt-0.5">{sub.year_section_subjects.subject.descriptive_title}</span>
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full text-xs text-muted-foreground hover:text-red-600"
                                onClick={() => setSettings(defaultSettings)}
                            >
                                Reset Layout to Defaults
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

                    {/* PASSING FILTERED SUBJECTS HERE */}
                    <CorStudentSubjects data={visibleSubjects} showSeal={showSeal} settings={settings} />

                    <div className='flex justify-around gap-4'>
                        {/* PASSING FILTERED SUBJECTS HERE */}
                        <CorFees
                            subjects={visibleSubjects}
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