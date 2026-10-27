import React from 'react';
import { CircleAlert, CircleCheck, TriangleAlert } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/Components/ui/dialog';

const AREAS = [
    ['student', 'Student information'],
    ['records', 'Academic records'],
    ['signatories', 'Signatory names and positions'],
    ['issuance', 'Issuance details'],
    ['notes', 'Last-page notes'],
];

function IssueGroups({ issues, onResolve, studentListUrl }) {
    return AREAS.map(([area, label]) => {
        const group = issues.filter(issue => issue.area === area);
        if (!group.length) return null;
        return (
            <section key={area} className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground">{label}</h4>
                <ul className="space-y-2">
                    {group.map(issue => {
                        const identity = issue.area === 'student' && ['first_name', 'last_name', 'user_id_no'].includes(issue.field);
                        const sourceRecord = issue.area === 'records' && issue.id !== 'records-empty';
                        const guidance = identity
                            ? 'Update the student name or ID in Student list, then refresh this record.'
                            : sourceRecord
                                ? issue.field === 'program'
                                    ? 'Correct the program in the source academic record, then refresh this record.'
                                    : 'Correct the subject details or grades in their source record. For manually added subjects, use More → View Academic Records, then refresh this record.'
                                : '';
                        return (
                            <li key={issue.id} className="flex items-start justify-between gap-3 rounded-md border px-3 py-2">
                                <div className="min-w-0 flex-1 space-y-1">
                                    <p className="break-words text-sm leading-relaxed">{issue.label}</p>
                                    {guidance && <p className="text-xs leading-relaxed text-muted-foreground">{guidance}</p>}
                                </div>
                                {identity ? studentListUrl && (
                                    <Button asChild size="sm" variant="outline" className="shrink-0">
                                        <a href={studentListUrl} target="_blank" rel="noopener noreferrer" title="Open Student list in a new tab">Student list</a>
                                    </Button>
                                ) : !sourceRecord && (
                                    <Button type="button" size="sm" variant="outline" className="shrink-0" aria-label={issue.id === 'records-empty' ? 'Add record' : `Fix: ${issue.label}`} onClick={() => onResolve?.(issue)}>{issue.id === 'records-empty' ? 'Add record' : 'Fix'}</Button>
                                )}
                            </li>
                        );
                    })}
                </ul>
            </section>
        );
    });
}

export default function TorPrintChecklist({ result, onResolve, open, onOpenChange, studentListUrl, onRefresh, isRefreshing = false, printingReady = true, printDisabledReason = '' }) {
    const errors = result?.errors || [];
    const warnings = result?.warnings || [];
    const errorLabel = errors.length + (errors.length === 1 ? ' Error' : ' Errors');
    const warningLabel = warnings.length + (warnings.length === 1 ? ' Warning' : ' Warnings');
    const hasIssues = errors.length > 0 || warnings.length > 0;
    const printStatus = errors.length > 0 || !printingReady ? 'Printing blocked' : 'Printing allowed';
    const accessibleLabel = 'TOR print check: ' + (hasIssues ? errorLabel + ', ' + warningLabel : 'Ready') + '. ' + printStatus + '.';
    const explanation = errors.length > 0
        ? 'Printing blocked: resolve errors before printing. Open the TOR print check.'
        : !printingReady
            ? 'Printing blocked: ' + (printDisabledReason || 'Wait for the document to finish preparing.')
            : warnings.length > 0
            ? 'Printing allowed: review the warnings. Open the TOR print check.'
            : 'Printing allowed: required fields are complete. Open the TOR print check.';
    const errorColor = errors.length > 0
        ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
        : 'bg-muted text-muted-foreground';
    const warningColor = warnings.length > 0
        ? 'bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
        : 'bg-muted text-muted-foreground';
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button type="button" size="sm" variant="outline" className="h-auto shrink-0 gap-1 overflow-hidden p-1" aria-label={accessibleLabel} title={explanation} data-tor-print-errors={errors.length} data-tor-print-warnings={warnings.length}>
                    {hasIssues ? <>
                        <span className={'inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold ' + errorColor}>
                            <CircleAlert size={14} aria-hidden="true" />{errorLabel}
                        </span>
                        <span className={'inline-flex items-center gap-1.5 rounded px-2 py-1 text-xs font-semibold ' + warningColor}>
                            <TriangleAlert size={14} aria-hidden="true" />{warningLabel}
                        </span>
                    </> : <span className="inline-flex items-center gap-1.5 rounded bg-green-50 px-2 py-1 text-xs font-semibold text-green-800 dark:bg-green-950 dark:text-green-200">
                        <CircleCheck size={14} aria-hidden="true" />Ready
                    </span>}
                </Button>
            </DialogTrigger>
            <DialogContent className="flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl flex-col gap-4">
                <DialogHeader className="shrink-0 pr-5">
                    <DialogTitle>TOR print check</DialogTitle>
                    <DialogDescription>{errors.length > 0 ? 'Resolve errors to enable printing. Warnings do not block printing.' : !printingReady ? 'Required information is complete. ' + (printDisabledReason || 'Wait for the document to finish preparing.') : 'Printing is allowed. Review any warnings before printing.'}</DialogDescription>
                </DialogHeader>
                <div className="min-h-0 space-y-5 overflow-y-auto pr-1">
                    {errors.length > 0 ? (
                        <section className="space-y-3" aria-labelledby="tor-check-errors">
                            <h3 id="tor-check-errors" className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300"><CircleAlert size={16} aria-hidden="true" />Errors ({errors.length})</h3>
                            <IssueGroups issues={errors} onResolve={onResolve} studentListUrl={studentListUrl} />
                        </section>
                    ) : (
                        <p className="flex items-center gap-2 text-sm text-green-700 dark:text-green-300"><CircleCheck size={16} aria-hidden="true" />Required fields are complete.</p>
                    )}
                    {warnings.length > 0 && (
                        <section className="space-y-3" aria-labelledby="tor-check-warnings">
                            <h3 id="tor-check-warnings" className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300"><TriangleAlert size={16} aria-hidden="true" />Warnings ({warnings.length})</h3>
                            <IssueGroups issues={warnings} onResolve={onResolve} studentListUrl={studentListUrl} />
                        </section>
                    )}
                </div>
                <p className="shrink-0 border-t pt-3 text-xs leading-relaxed text-muted-foreground">Signatory checks cover names and positions. Verify signatures and the college seal before release.</p>
                <DialogFooter className="shrink-0 gap-2 sm:gap-0">
                    <Button type="button" variant="outline" aria-label="Refresh record" aria-busy={isRefreshing} disabled={isRefreshing || !onRefresh} onClick={onRefresh}>{isRefreshing ? 'Refreshing...' : 'Refresh record'}</Button>
                    <DialogClose asChild><Button type="button" variant="outline">Close check</Button></DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}