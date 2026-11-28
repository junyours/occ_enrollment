import React from "react";
import { AlertTriangle, CheckCircle2, SlidersHorizontal } from "lucide-react";
import { Button } from "@/Components/ui/button";
import { termName } from "./unitLoads";

function ShowButton({ term, onJump }) {
    return (
        <button type="button" onClick={() => onJump(term)} className="rounded text-xs font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {termName(term)}
        </button>
    );
}

function IssueText({ issue, program, onJump }) {
    switch (issue.kind) {
        case "over":
            return (
                <>
                    <ShowButton term={issue.term} onJump={onJump} /> has <strong className="font-semibold">{issue.units} units</strong>, above the {issue.isSummer ? "summer " : ""}limit of {issue.max}.
                </>
            );
        case "short":
            return <>Total is <strong className="font-semibold">{issue.total} units</strong>, {issue.required - issue.total} short of the required {issue.required}.</>;
        case "excess":
            return <>Total is <strong className="font-semibold">{issue.total} units</strong>, {issue.total - issue.required} more than the required {issue.required}.</>;
        case "incomplete":
            return (
                <>
                    Total is only <strong className="font-semibold">{issue.total} units</strong>, while {program} {issue.compare.label} has {issue.compare.units}. This curriculum may be incomplete.
                </>
            );
        case "empty":
            return (
                <>
                    {issue.terms.length === 1 ? "1 semester has" : `${issue.terms.length} semesters have`} no subjects:{" "}
                    {issue.terms.map((term, i) => (
                        <React.Fragment key={term.id}>{i > 0 && ", "}<ShowButton term={term} onJump={onJump} /></React.Fragment>
                    ))}.
                </>
            );
        default:
            return null;
    }
}

/**
 * The unit-load warnings at the top of the curriculum page: semesters over the limit,
 * empty semesters, and a total that's short of the required one or looks incomplete.
 * Warnings only; nothing is blocked.
 */
export default function UnitChecksPanel({ checks, program, onJumpToTerm, onEditLimits }) {
    const { issues, maxSemester, maxSummer, semesterIsDefault, summerIsDefault, required, total } = checks;
    const limitsText = `Limits: up to ${maxSemester} units per semester${semesterIsDefault ? " (default)" : ""} and ${maxSummer} in summer${summerIsDefault ? " (default)" : ""}${required ? `; ${required} units required in total` : ""}.`;
    const editButton = (
        <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 text-xs" onClick={onEditLimits}>
            <SlidersHorizontal aria-hidden="true" />Edit limits
        </Button>
    );

    if (issues.length === 0) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 px-3 py-1.5">
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span>
                        Unit loads look fine: every semester is within {maxSemester} units ({maxSummer} in summer)
                        {required ? `, and the total matches the required ${required}` : ""}.
                        <span className="sr-only"> {limitsText}</span>
                    </span>
                </p>
                {editButton}
            </div>
        );
    }

    return (
        <section aria-labelledby="unit-checks-title" className="rounded-lg border border-rose-500/30 bg-rose-50/60 px-3 py-2.5 dark:bg-rose-500/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id="unit-checks-title" className="flex items-center gap-2 text-sm font-semibold text-rose-900 dark:text-rose-200">
                    <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                    Unit checks · {issues.length} to review
                    <span className="font-normal text-muted-foreground">({total} units in total)</span>
                </h2>
                {editButton}
            </div>
            <ul className="mt-1.5 space-y-1 text-sm">
                {issues.map((issue, i) => (
                    <li key={`${issue.kind}-${issue.term?.id ?? i}`} className="flex gap-2">
                        <span aria-hidden="true" className="text-rose-700/70 dark:text-rose-300/70">•</span>
                        <span><IssueText issue={issue} program={program} onJump={onJumpToTerm} /></span>
                    </li>
                ))}
            </ul>
            <p className="mt-1.5 text-xs text-muted-foreground">{limitsText} These are warnings only; nothing is blocked.</p>
        </section>
    );
}
