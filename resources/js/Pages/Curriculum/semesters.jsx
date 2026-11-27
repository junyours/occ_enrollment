import React from "react";
import { Sun } from "lucide-react";

// One look per semester, used everywhere a semester appears on the curriculum page.
// Never amber: amber means "prerequisite" in the hover/selection highlight.
// Colour is never the only cue: each semester also has its own mark (1, 2, sun).
export const SEMESTER_STYLES = {
    1: {
        label: "1st semester",
        edge: "border-l-blue-500",
        strip: "bg-blue-50 dark:bg-blue-950",
        text: "text-blue-800 dark:text-blue-200",
        subtext: "text-blue-700/80 dark:text-blue-300/80",
        mark: "bg-blue-600 text-white dark:bg-blue-500",
    },
    2: {
        label: "2nd semester",
        edge: "border-l-violet-500",
        strip: "bg-violet-50 dark:bg-violet-950",
        text: "text-violet-800 dark:text-violet-200",
        subtext: "text-violet-700/80 dark:text-violet-300/80",
        mark: "bg-violet-600 text-white dark:bg-violet-500",
    },
    3: {
        label: "Summer",
        edge: "border-l-teal-500",
        strip: "bg-teal-50 dark:bg-teal-950",
        text: "text-teal-800 dark:text-teal-200",
        subtext: "text-teal-700/80 dark:text-teal-300/80",
        mark: "bg-teal-600 text-white dark:bg-teal-500",
    },
};

const FALLBACK = {
    label: "Semester",
    edge: "border-l-muted-foreground/40",
    strip: "bg-muted",
    text: "text-foreground",
    subtext: "text-muted-foreground",
    mark: "bg-muted-foreground text-background",
};

export const semesterStyle = (semesterId) => SEMESTER_STYLES[Number(semesterId)] ?? FALLBACK;

// Small square mark: "1", "2", or a sun for Summer.
export function SemesterMark({ semesterId, className = "" }) {
    const id = Number(semesterId);
    const style = semesterStyle(id);
    return (
        <span aria-hidden="true" className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] text-[10px] font-bold leading-none ${style.mark} ${className}`}>
            {id === 3 ? <Sun className="h-3 w-3" strokeWidth={2.5} /> : id || "?"}
        </span>
    );
}

// Mark + coloured label, e.g. [2] 2nd semester.
export function SemesterLabel({ semesterId, className = "" }) {
    const style = semesterStyle(semesterId);
    return (
        <span className={`inline-flex items-center gap-1.5 font-medium ${style.text} ${className}`}>
            <SemesterMark semesterId={semesterId} />
            {style.label}
        </span>
    );
}
