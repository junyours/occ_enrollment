import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Label } from '@/Components/ui/label';
import { Switch } from '@/Components/ui/switch';
import { formatDateShort } from '@/Lib/Utils';
import axios from 'axios';
import { Check, Loader2, Settings2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { getEnrollmentStatus, getEnrollmentStatusClass, isEnabled } from './schoolYearUtils';

const operations = [
    { field: 'evaluating', label: 'Student Evaluation', description: 'Enable student evaluation.' },
    { field: 'allow_upload_midterm', label: 'Midterm Grade Upload', description: 'Allow faculty to submit midterm grades.' },
    { field: 'allow_upload_final', label: 'Final Grade Upload', description: 'Allow faculty to submit final grades.' },
];

function SchoolYearSettings({ schoolYearId, open, setOpen, onUpdated }) {
    const [loading, setLoading] = useState(true);
    const [schoolYear, setSchoolYear] = useState(null);
    const [loadError, setLoadError] = useState('');
    const [saveError, setSaveError] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [retry, setRetry] = useState(0);
    const savingRef = useRef(false);

    useEffect(() => {
        if (!open) return;
        const controller = new AbortController();
        setLoading(true);
        setLoadError('');
        setSaveError('');
        setSaved(false);
        setSchoolYear(null);

        axios.post(route('get.school-year', { id: schoolYearId }), {}, { signal: controller.signal })
            .then(({ data }) => {
                if (!data?.id) throw new Error('School year not found.');
                setSchoolYear(data);
            })
            .catch((error) => {
                if (!controller.signal.aborted) {
                    setLoadError(error.response?.data?.message || 'Unable to load semester settings. Please try again.');
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });

        return () => controller.abort();
    }, [schoolYearId, open, retry]);

    const handleToggle = async (field, enabled) => {
        if (savingRef.current || !schoolYear) return;
        savingRef.current = true;
        const previous = schoolYear;
        const updated = { ...schoolYear, [field]: enabled ? 1 : 0, enrollment_status: undefined };
        setSchoolYear(updated);
        setSaving(true);
        setSaved(false);
        setSaveError('');

        try {
            const { data } = await axios.patch(`/school-year/${field}/${schoolYear.id}`, { value: enabled ? 1 : 0 });
            const persisted = data?.schoolYear ? { ...updated, ...data.schoolYear } : updated;
            setSchoolYear(persisted);
            setSaved(true);
            onUpdated?.(persisted);
        } catch (error) {
            setSchoolYear(previous);
            const validationMessage = Object.values(error.response?.data?.errors || {}).flat()[0];
            setSaveError(validationMessage || error.response?.data?.message || 'Unable to save this change. Your previous setting has been restored.');
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    const status = schoolYear ? getEnrollmentStatus(schoolYear) : 'Closed';
    const isCurrent = isEnabled(schoolYear?.is_current);

    return (
        <Dialog open={open} onOpenChange={(nextOpen) => { if (!savingRef.current) setOpen(nextOpen); }}>
            <DialogContent
                className="max-h-[90vh] w-[calc(100%_-_2rem)] overflow-y-auto sm:max-w-[540px]"
                onEscapeKeyDown={(event) => { if (savingRef.current) event.preventDefault(); }}
                onPointerDownOutside={(event) => { if (savingRef.current) event.preventDefault(); }}
            >
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Settings2 className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                        Semester Settings
                    </DialogTitle>
                    <DialogDescription>
                        {schoolYear
                            ? `${schoolYear.start_year}–${schoolYear.end_year} · ${schoolYear.semester_name} Semester`
                            : 'School year settings'}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground" role="status">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Loading settings…
                    </div>
                ) : loadError ? (
                    <div className="space-y-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                        <p className="text-sm text-destructive" role="alert">{loadError}</p>
                        <Button type="button" variant="outline" size="sm" onClick={() => setRetry((value) => value + 1)}>Try Again</Button>
                    </div>
                ) : schoolYear && (
                    <div className="divide-y">
                        <section className="space-y-4 pb-5 pt-2" aria-labelledby="academic-status-heading">
                            <h3 id="academic-status-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Academic Status</h3>
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold">Current Semester</p>
                                    <p className="mt-1 text-xs text-muted-foreground">The active academic term, independent of enrollment.</p>
                                </div>
                                <Badge variant="outline" className={isCurrent ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'text-muted-foreground'}>
                                    {isCurrent ? 'Current' : 'Not current'}
                                </Badge>
                            </div>
                            <Button type="button" variant="outline" className="w-full" disabled={saving || isCurrent} onClick={() => handleToggle('is_current', true)}>
                                {isCurrent ? <><Check className="h-4 w-4" aria-hidden="true" />Current Semester</> : 'Set as Current Semester'}
                            </Button>
                            {!isCurrent && <p className="text-xs text-muted-foreground">Selecting this semester replaces the current semester.</p>}
                        </section>

                        <section className="space-y-4 py-5" aria-labelledby="enrollment-management-heading">
                            <h3 id="enrollment-management-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Enrollment Management</h3>
                            <div className="flex items-center justify-between gap-4">
                                <div>
                                    <Label htmlFor="allow-enrollment" className="font-semibold">Allow Enrollment</Label>
                                    <p id="allow-enrollment-description" className="mt-1 text-xs text-muted-foreground">Permit enrollments during the enrollment period.</p>
                                </div>
                                <Switch id="allow-enrollment" aria-describedby="allow-enrollment-description" checked={isEnabled(schoolYear.allow_enrollment)} onCheckedChange={(checked) => handleToggle('allow_enrollment', checked)} disabled={saving} />
                            </div>
                            <div className="space-y-2 rounded-lg bg-muted/60 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="text-xs text-muted-foreground">Enrollment Period</p>
                                    <Badge variant="outline" className={getEnrollmentStatusClass(status)}>{status}</Badge>
                                </div>
                                <p className="text-sm font-medium">
                                    {schoolYear.start_date ? formatDateShort(schoolYear.start_date) : 'No start date'}
                                    {' – '}
                                    {schoolYear.end_date ? formatDateShort(schoolYear.end_date) : 'No end date'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {status === 'Open' && 'Enrollment is available within the scheduled dates.'}
                                    {status === 'Paused' && 'Enrollment is disabled during the scheduled period.'}
                                    {status === 'Scheduled' && 'Enrollment begins on the starting date when allowed.'}
                                    {status === 'Closed' && 'Enrollment is outside its scheduled period.'}
                                </p>
                            </div>
                        </section>

                        <section className="space-y-4 py-5" aria-labelledby="academic-operations-heading">
                            <h3 id="academic-operations-heading" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Academic Operations</h3>
                            {operations.map(({ field, label, description }) => (
                                <div key={field} className="flex items-center justify-between gap-4">
                                    <div>
                                        <Label htmlFor={field} className="font-semibold">{label}</Label>
                                        <p id={`${field}-description`} className="mt-1 text-xs text-muted-foreground">{description}</p>
                                    </div>
                                    <Switch id={field} aria-describedby={`${field}-description`} checked={isEnabled(schoolYear[field])} onCheckedChange={(checked) => handleToggle(field, checked)} disabled={saving} />
                                </div>
                            ))}
                        </section>
                    </div>
                )}

                <DialogFooter className="gap-3 border-t pt-4 sm:items-center sm:justify-between sm:space-x-0">
                    <div className="min-w-0 flex-1 text-xs text-muted-foreground" role="status" aria-live="polite" aria-atomic="true">
                        {saveError ? <span className="text-destructive">{saveError}</span>
                            : saving ? <span className="flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />Saving…</span>
                                : saved ? <span className="flex items-center gap-1.5 text-emerald-700"><Check className="h-3.5 w-3.5" aria-hidden="true" />Saved</span>
                                    : 'Changes save immediately.'}
                    </div>
                    <Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Done</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default SchoolYearSettings;

