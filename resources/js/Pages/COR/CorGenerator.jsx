import { useEffect, useId, useState } from 'react';
import { Settings2 } from 'lucide-react';

import OCC_LOGO from '../../../images/OCC_LOGO.png';
import { formatFullName } from '@/Lib/Utils';

import { Button } from '@/Components/ui/button';
import { Checkbox } from '@/Components/ui/checkbox';
import { Label } from '@/Components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/Components/ui/popover';
import { Separator } from '@/Components/ui/separator';

import CorStudentSubjects from './CorStudentSubjects';
import CorStudentInfo from './CorStudentInfo';
import CorFees from './CorFees';
import Signatories from './Signatories';

const STORAGE_KEY = 'cor_table_settings';

const DEFAULT_SETTINGS = {
    showSubjectCode: true,
    showCourseSection: true,
    showDescriptiveTitle: true,
    showInstructor: true,
    showUnits: true,
    showLecUnits: true,
    showLabUnits: true,
    showCreditUnits: true,
    showSchedule: true,
    showDay: true,
    showTime: true,
    showRoom: true,
};

const SETTING_GROUPS = [
    {
        title: 'Main Columns',
        fields: [
            { key: 'showSubjectCode', label: 'Subject Code' },
            { key: 'showCourseSection', label: 'Course Section' },
            { key: 'showDescriptiveTitle', label: 'Descriptive Title' },
            { key: 'showInstructor', label: 'Instructor' },
        ],
    },
    {
        title: 'Units Display',
        master: { key: 'showUnits', label: 'Show All Units' },
        fields: [
            { key: 'showLecUnits', label: 'Lecture' },
            { key: 'showLabUnits', label: 'Laboratory' },
            { key: 'showCreditUnits', label: 'Credit' },
        ],
    },
    {
        title: 'Schedule Display',
        master: { key: 'showSchedule', label: 'Show All Schedule' },
        fields: [
            { key: 'showDay', label: 'Day' },
            { key: 'showTime', label: 'Time' },
            { key: 'showRoom', label: 'Room' },
        ],
    },
];

function loadSettings() {
    if (typeof window === 'undefined') {
        return DEFAULT_SETTINGS;
    }

    try {
        const saved = JSON.parse(
            window.localStorage.getItem(STORAGE_KEY) ?? 'null'
        );

        // Use defaults for missing or invalid saved values.
        return Object.fromEntries(
            Object.entries(DEFAULT_SETTINGS).map(([key, defaultValue]) => [
                key,
                typeof saved?.[key] === 'boolean'
                    ? saved[key]
                    : defaultValue,
            ])
        );
    } catch {
        return DEFAULT_SETTINGS;
    }
}

export default function CorGenerator({
    data,
    showSeal = false,
    printable = true,
}) {
    const [settings, setSettings] = useState(loadSettings);
    const [hiddenSubjectIds, setHiddenSubjectIds] = useState([]);

    useEffect(() => {
        try {
            window.localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(settings)
            );
        } catch (error) {
            console.warn('Unable to save COR settings:', error);
        }
    }, [settings]);

    if (!data) {
        return <p>No registration document available.</p>;
    }

    const subjects = data.student_subject ?? [];

    const visibleSubjects = subjects.filter(
        (subject) => !hiddenSubjectIds.includes(subject.id)
    );

    return (
        <div className="flex min-h-screen flex-col items-center print:min-h-0">
            <CustomizeView
                settings={settings}
                setSettings={setSettings}
                subjects={subjects}
                hiddenSubjectIds={hiddenSubjectIds}
                setHiddenSubjectIds={setHiddenSubjectIds}
            />

            <div className="relative w-[800px] rounded-lg bg-white p-5 text-black">
                {/* Screen-only seal */}
                {showSeal && (
                    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center print:hidden">
                        <div className="rotate-[20deg] rounded-lg bg-red-600 px-4 py-2 text-4xl font-bold text-white opacity-80">
                            NO PERMISSION TO VIEW
                        </div>
                    </div>
                )}

                {/* Print-only notice */}
                {!printable && (
                    <div className="hidden min-h-[400px] items-center justify-center p-8 print:flex">
                        <div className="w-full max-w-lg rounded-xl border-2 border-red-600 p-8 text-center">
                            <p className="text-2xl font-bold tracking-wide text-red-600">
                                PRINTING NOT AVAILABLE
                            </p>

                            <p className="mt-3 text-sm leading-relaxed text-gray-600">
                                This Certificate of Registration is
                                available for on-screen viewing only.
                            </p>
                        </div>
                    </div>
                )}

                {/* Visible on screen regardless of printable */}
                <div
                    className={`
                        relative z-10 space-y-4 border border-gray-600 p-5
                        ${!printable ? 'print:!hidden' : ''}
                    `}
                >
                    <CorDocument
                        data={data}
                        subjects={visibleSubjects}
                        settings={settings}
                        showSeal={showSeal}
                    />
                </div>
            </div>
        </div>
    );
}

function CheckboxField({
    label,
    checked,
    onChange,
    disabled = false,
    bold = false,
}) {
    const id = useId();

    return (
        <div className="flex items-start gap-2">
            <Checkbox
                id={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={(value) => onChange(value === true)}
                className="mt-0.5"
            />

            <Label
                htmlFor={id}
                className={`
                    cursor-pointer text-sm leading-tight
                    ${bold ? 'font-semibold' : 'font-medium'}
                    ${disabled ? 'cursor-not-allowed text-muted-foreground opacity-70' : ''}
                `}
            >
                {label}
            </Label>
        </div>
    );
}

function CustomizeView({
    settings,
    setSettings,
    subjects,
    hiddenSubjectIds,
    setHiddenSubjectIds,
}) {
    const updateSetting = (key, checked) => {
        setSettings((previous) => ({
            ...previous,
            [key]: checked,
        }));
    };

    const updateSubjectVisibility = (subjectId, visible) => {
        setHiddenSubjectIds((previous) => {
            if (visible) {
                return previous.filter((id) => id !== subjectId);
            }

            return previous.includes(subjectId)
                ? previous
                : [...previous, subjectId];
        });
    };

    return (
        <div className="fixed right-6 top-6 z-50 print:hidden">
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        type="button"
                        variant="outline"
                        className="gap-2 shadow-sm"
                    >
                        <Settings2 className="size-4" />
                        Customize View
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    align="end"
                    className="max-h-[85vh] w-96 overflow-y-auto rounded-xl p-5 shadow-xl print:hidden"
                >
                    <div className="space-y-4">
                        <div>
                            <h3 className="font-semibold leading-none tracking-tight">
                                Table Settings
                            </h3>

                            <p className="mt-1.5 text-sm text-muted-foreground">
                                Choose which columns and subjects to display.
                            </p>
                        </div>

                        <Separator />

                        {SETTING_GROUPS.map(({ title, master, fields }) => {
                            const disabled = master
                                ? !settings[master.key]
                                : false;

                            return (
                                <div key={title} className="space-y-3">
                                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {title}
                                    </h4>

                                    {master && (
                                        <CheckboxField
                                            label={master.label}
                                            checked={settings[master.key]}
                                            onChange={(checked) =>
                                                updateSetting(master.key, checked)
                                            }
                                            bold
                                        />
                                    )}

                                    <div
                                        className={`space-y-3 ${master ? 'ml-6' : ''}`}
                                    >
                                        {fields.map(({ key, label }) => (
                                            <CheckboxField
                                                key={key}
                                                label={label}
                                                checked={settings[key]}
                                                disabled={disabled}
                                                onChange={(checked) =>
                                                    updateSetting(key, checked)
                                                }
                                            />
                                        ))}
                                    </div>

                                    <Separator />
                                </div>
                            );
                        })}

                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Filter Subjects
                                </h4>

                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
                                    disabled={hiddenSubjectIds.length === 0}
                                    onClick={() => setHiddenSubjectIds([])}
                                >
                                    Show All
                                </Button>
                            </div>

                            <div className="max-h-48 space-y-3 overflow-y-auto pr-2">
                                {subjects.map((subject) => {
                                    const {
                                        subject_code,
                                        descriptive_title,
                                    } = subject.year_section_subjects.subject;

                                    return (
                                        <CheckboxField
                                            key={subject.id}
                                            checked={
                                                !hiddenSubjectIds.includes(
                                                    subject.id
                                                )
                                            }
                                            onChange={(visible) =>
                                                updateSubjectVisibility(
                                                    subject.id,
                                                    visible
                                                )
                                            }
                                            label={
                                                <>
                                                    <span className="text-xs font-bold">
                                                        {subject_code}
                                                    </span>

                                                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                                                        {descriptive_title}
                                                    </span>
                                                </>
                                            }
                                        />
                                    );
                                })}
                            </div>
                        </div>

                        <Separator />

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="w-full text-xs text-muted-foreground hover:text-red-600"
                            onClick={() => setSettings(DEFAULT_SETTINGS)}
                        >
                            Reset Layout to Defaults
                        </Button>
                    </div>
                </PopoverContent>
            </Popover>
        </div>
    );
}

function CorDocument({ data, subjects, settings, showSeal }) {
    const { course, school_year, year_level_id } = data.year_section;

    return (
        <>
            <div className="flex items-center justify-center gap-4">
                <div className="relative flex flex-col text-center">
                    <img
                        src={OCC_LOGO}
                        alt="Opol Community College logo"
                        className="absolute -left-40 h-full"
                    />

                    <h1 className="text-lg font-bold">
                        OPOL COMMUNITY COLLEGE
                    </h1>

                    <p className="text-sm">
                        Opol, Misamis Oriental
                    </p>

                    <h2 className="text-xl font-bold">
                        CERTIFICATE OF REGISTRATION
                    </h2>
                </div>
            </div>

            <CorStudentInfo
                data={data}
                showSeal={showSeal}
            />

            <CorStudentSubjects
                data={subjects}
                showSeal={showSeal}
                settings={settings}
            />

            <div className="flex justify-around gap-4">
                <CorFees
                    subjects={subjects}
                    course={course.course_name_abbreviation}
                    courseId={course.id}
                    yearLevel={year_level_id}
                    showSeal={showSeal}
                    semester={school_year.semester.semester_name}
                    studentType={data.student_type_id}
                />

                <Signatories showSeal={showSeal} />
            </div>

            <div className="mt-2 text-[8px]">
                Evaluator:{' '}
                {formatFullName(data.evaluator.evaluator_information)}
            </div>
        </>
    );
}