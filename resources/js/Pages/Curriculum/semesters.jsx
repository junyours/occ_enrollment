import React from "react";
import { Sun } from "lucide-react";

// One look per semester, used everywhere a semester appears on the curriculum page.
// Deliberately quiet: the strip is neutral gray and the edge is thin and pale, so the
// prerequisite (amber) and required-for (blue) row highlights are the only strong colours.
// The semester's colour lives only in its small mark (1, 2, sun), which is also the
// non-colour cue that tells semesters apart.
export const SEMESTER_STYLES = {
    1: {
        label: "1st semester",
        edge: "border-l-blue-200 dark:border-l-blue-900",
        strip: "bg-muted",
        text: "text-foreground",
        subtext: "text-muted-foreground",
        mark: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    },
    2: {
        label: "2nd semester",
        edge: "border-l-violet-200 dark:border-l-violet-900",
        strip: "bg-muted",
        text: "text-foreground",
        subtext: "text-muted-foreground",
        mark: "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300",
    },
    3: {
        label: "Summer",
        edge: "border-l-teal-200 dark:border-l-teal-900",
        strip: "bg-muted",
        text: "text-foreground",
        subtext: "text-muted-foreground",
        mark: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300",
    },
};

const FALLBACK = {
    label: "Semester",
    edge: "border-l-border",
    strip: "bg-muted",
    text: "text-foreground",
    subtext: "text-muted-foreground",
    mark: "bg-muted-foreground/15 text-muted-foreground",
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
