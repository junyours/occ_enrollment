import PreLoader from '@/Components/preloader/PreLoader';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Checkbox } from '@/Components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateShort } from '@/Lib/Utils';
import { Head, Link, usePage } from '@inertiajs/react';
import { ArrowRight, CalendarDays, Check, ChevronDown, ChevronUp, CircleAlert, Loader2, Pencil, Plus, Search, Settings2 } from 'lucide-react';
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import SchoolYearSettings from './SchoolYearSettings';
import { getEnrollmentStatus, getEnrollmentStatusClass, getNextSchoolYear, isEnabled, validateSchoolYear } from './schoolYearUtils';

const semesterColors = {
    1: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300',
    2: 'border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-300',
    3: 'border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300',
};

const ErrorMessage = ({ id, message }) => message ? <p id={id} className="text-xs text-destructive">{message}</p> : null;

function SemesterCard({ schoolYear, canManage, featured, onEdit, onSettings }) {
    const status = getEnrollmentStatus(schoolYear);
    return (
        <Card className={`flex h-full flex-col transition-shadow hover:shadow-md ${featured ? 'border-primary/40 bg-primary/5' : ''}`}>
            <CardHeader className="space-y-3 pb-4">
                <div className="flex min-h-6 items-center justify-between gap-2">
                    <Badge variant="outline" className={semesterColors[schoolYear.semester_id]}>
                        <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-current" />
                        {schoolYear.semester_name} Semester
                    </Badge>
                    {isEnabled(schoolYear.is_current) && <Badge className="shrink-0 bg-primary text-primary-foreground hover:bg-primary">Current</Badge>}
                </div>
                <CardTitle className="text-xl">{featured ? `${schoolYear.start_year}–${schoolYear.end_year}` : `${schoolYear.semester_name} Semester`}</CardTitle>
            </CardHeader>
            <CardContent className={`flex flex-1 flex-col gap-4 pt-0 ${featured ? 'md:grid md:grid-cols-3 md:items-center md:gap-6' : ''}`}>
                <div className="space-y-4">
                <div className="rounded-lg border bg-background/80 p-3">
                    <div className="mb-1.5 flex items-center gap-2 text-xs font-medium text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />Enrollment Period</div>
                    <p className="text-sm font-medium">{formatDateShort(schoolYear.start_date)} – {formatDateShort(schoolYear.end_date)}</p>
                </div>
                <div className="flex min-h-7 items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Enrollment</span>
                    <Badge variant="outline" className={getEnrollmentStatusClass(status)}>{status}</Badge>
                </div>
                </div>
                <div className={`grid grid-cols-3 gap-1 border-t pt-3 text-center text-xs ${featured ? 'md:border-l md:border-t-0 md:py-4 md:pl-5' : ''}`}>
                    {[
                        ['Evaluation', schoolYear.evaluating],
                        ['Midterm upload', schoolYear.allow_upload_midterm],
                        ['Final upload', schoolYear.allow_upload_final],
                    ].map(([label, value]) => <div key={label} className="space-y-1"><p className="text-muted-foreground">{label}</p><p className={`font-medium ${isEnabled(value) ? 'text-foreground' : 'text-muted-foreground'}`}>{isEnabled(value) ? 'Enabled' : 'Disabled'}</p></div>)}
                </div>
                <div className="mt-auto space-y-2 pt-2">
                    {canManage && <div className="grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" onClick={() => onEdit(schoolYear)}><Pencil aria-hidden="true" />Edit</Button>
                        <Button variant="outline" size="sm" onClick={() => onSettings(schoolYear)}><Settings2 aria-hidden="true" />Settings</Button>
                    </div>}
                    <Button asChild size="sm" className="w-full">
                        <Link href={route('school-year.view', { schoolyear: `${schoolYear.start_year}-${schoolYear.end_year}`, semester: schoolYear.semester_name })}>Manage<ArrowRight aria-hidden="true" /></Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function SchoolYear() {
    const canManage = usePage().props.auth.user.user_role === 'registrar';
    const [schoolYears, setSchoolYears] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [openForm, setOpenForm] = useState(false);
    const [editingSchoolYear, setEditingSchoolYear] = useState(null);
    const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
    const [openSettings, setOpenSettings] = useState(false);
    const [form, setForm] = useState(() => getNextSchoolYear([]));
    const [formErrors, setFormErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [acknowledged, setAcknowledged] = useState(false);
    const [customEndYear, setCustomEndYear] = useState(false);

    const getSchoolYears = useCallback(async () => {
        try {
            const response = await axios.post(route('school-year.list'));
            setSchoolYears(response.data);
            setLoadError('');
        } catch {
            setLoadError('School years could not be loaded. Please try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { getSchoolYears(); }, [getSchoolYears]);

    const query = searchTerm.trim().toLowerCase().replace(/[–—]/g, '-').replace(/\s*-\s*/g, '-');
    const filtered = schoolYears.filter((year) => `${year.start_year}-${year.end_year} ${year.semester_name} Semester ${getEnrollmentStatus(year)} ${isEnabled(year.is_current) ? 'current' : ''}`.toLowerCase().includes(query));
    const current = filtered.filter((year) => isEnabled(year.is_current));
    const otherYears = filtered.filter((year) => !isEnabled(year.is_current)).sort((a, b) => Number(b.start_year) - Number(a.start_year) || Number(b.end_year) - Number(a.end_year) || Number(a.semester_id) - Number(b.semester_id));
    const groups = Object.values(otherYears.reduce((result, year) => {
        const key = `${year.start_year}–${year.end_year}`;
        if (!result[key]) result[key] = { key, years: [] };
        result[key].years.push(year);
        return result;
    }, {}));
    const visibleGroups = showAll ? groups : groups.slice(0, 3);
    const datesChanged = editingSchoolYear && (form.start_date !== editingSchoolYear.start_date || form.end_date !== editingSchoolYear.end_date);
    const affectsActivePeriod = datesChanged && (isEnabled(editingSchoolYear.is_current) || ['Open', 'Paused'].includes(getEnrollmentStatus(editingSchoolYear)));

    const openEditor = (year = null) => {
        setEditingSchoolYear(year);
        setCustomEndYear(false);
        setForm(year ? {
            id: year.id, semester_id: year.semester_id, start_year: String(year.start_year), end_year: String(year.end_year), start_date: year.start_date, end_date: year.end_date,
        } : getNextSchoolYear(schoolYears));
        setFormErrors({});
        setAcknowledged(false);
        setOpenForm(true);
    };

    const updateForm = (name, value) => {
        if (name === 'end_year') setCustomEndYear(value !== '');
        setForm((previous) => {
            const next = { ...previous, [name]: value };
            if (name === 'start_year' && /^[1-9]\d{3}$/.test(value) && !customEndYear) next.end_year = String(Number(value) + 1);
            return next;
        });
        setFormErrors({});
        setAcknowledged(false);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submitting) return;
        const errors = validateSchoolYear(form, schoolYears);
        if (affectsActivePeriod && !acknowledged) errors.confirmation = 'Confirm the date change before saving.';
        setFormErrors(errors);
        if (Object.keys(errors).length) return;
        setSubmitting(true);
        try {
            if (editingSchoolYear) await axios.patch(route('edit.school-year', { id: form.id }), form);
            else await axios.post(route('add.school-year'), form);
            setOpenForm(false);
            await getSchoolYears();
        } catch (error) {
            const errors = error.response?.data?.errors;
            setFormErrors(errors ? Object.fromEntries(Object.entries(errors).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value])) : { general: 'Changes could not be saved. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSettingsUpdated = (updated) => {
        setSchoolYears((previous) => previous.map((year) => String(year.id) === String(updated.id)
            ? { ...year, ...updated }
            : isEnabled(updated.is_current) ? { ...year, is_current: 0 } : year));
    };

    if (loading) return <PreLoader title="School years" />;
    const cardProps = { canManage, onEdit: openEditor, onSettings: (year) => { setSelectedSchoolYear(year); setOpenSettings(true); } };

    return (
        <div className="space-y-8">
            <Head title="School Years" />
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                {/* <div><h1 className="text-3xl font-bold tracking-tight">School Years</h1><p className="mt-1 text-sm text-muted-foreground">Manage academic periods, enrollment, and semester permissions.</p></div> */}
                <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
                    <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input aria-label="Search school years" placeholder="Search years or semesters..." value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setShowAll(false); }} className="pl-9 xl:w-64" /></div>
                    {canManage && <Button onClick={() => openEditor()}><Plus aria-hidden="true" />Add School Year</Button>}
                </div>
            </div>
            {loadError && <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm"><span>{loadError}</span><Button variant="outline" size="sm" onClick={getSchoolYears}>Try Again</Button></div>}
            {current.length > 0 && <section aria-labelledby="current-semester-heading" className="space-y-4">
                <div><h2 id="current-semester-heading" className="text-lg font-semibold">Current Semester</h2><p className="text-xs text-muted-foreground">The active academic term, independent of enrollment availability.</p></div>
                <div className="grid grid-cols-1 gap-5">{current.map((year) => <SemesterCard key={year.id} schoolYear={year} featured {...cardProps} />)}</div>
            </section>}
            {visibleGroups.map((group) => <section key={group.key} aria-labelledby={`year-${group.key}`} className="space-y-4">
                <div className="flex items-center gap-3"><h2 id={`year-${group.key}`} className="text-lg font-semibold">{group.key}</h2><span className="text-xs text-muted-foreground">{group.years.length} {group.years.length === 1 ? 'semester' : 'semesters'}</span><div className="h-px flex-1 bg-border" /></div>
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">{group.years.map((year) => <SemesterCard key={year.id} schoolYear={year} {...cardProps} />)}</div>
            </section>)}
            {!filtered.length && !loadError && <div className="rounded-xl border border-dashed py-16 text-center"><CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" /><h2 className="font-semibold">{schoolYears.length ? 'No matching semesters' : 'No school years yet'}</h2><p className="mt-1 text-sm text-muted-foreground">{schoolYears.length ? 'Try a different year, semester, or enrollment status.' : 'Add a school year to set up your first academic period.'}</p>{searchTerm && <Button variant="link" onClick={() => setSearchTerm('')}>Clear Search</Button>}</div>}
            {groups.length > 3 && <div className="text-center"><Button variant="outline" onClick={() => setShowAll((previous) => !previous)}>{showAll ? <ChevronUp aria-hidden="true" /> : <ChevronDown aria-hidden="true" />}{showAll ? 'Show Less' : `Show All Academic Years (${groups.length})`}</Button></div>}
            <Dialog open={openForm} onOpenChange={(open) => { if (!submitting) setOpenForm(open); }}>
                <DialogContent aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto sm:max-w-[520px]" onEscapeKeyDown={(event) => { if (submitting) event.preventDefault(); }} onInteractOutside={(event) => { if (submitting) event.preventDefault(); }}>
                    <DialogHeader><DialogTitle className="text-xl">{editingSchoolYear ? 'Edit School Year' : 'Add School Year'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} noValidate className="space-y-5">
                        <fieldset disabled={submitting} className="space-y-5">
                            <div className="grid grid-cols-2 gap-3">
                                {[['start_year', 'Starting Year'], ['end_year', 'Ending Year']].map(([name, label]) => <div key={name} className="space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type="number" min="1000" max="9999" inputMode="numeric" value={form[name]} disabled={!!editingSchoolYear} onChange={(event) => updateForm(name, event.target.value)} aria-invalid={!!formErrors[name]} aria-describedby={formErrors[name] ? `${name}-error` : undefined} className={formErrors[name] ? 'border-destructive' : ''} /><ErrorMessage id={`${name}-error`} message={formErrors[name]} /></div>)}
                            </div>
                            <div className="space-y-2"><Label htmlFor="semester_id">Semester</Label><Select disabled={!!editingSchoolYear || submitting} value={String(form.semester_id || '')} onValueChange={(value) => updateForm('semester_id', Number(value))}><SelectTrigger id="semester_id" aria-invalid={!!formErrors.semester_id} aria-describedby={formErrors.semester_id ? 'semester_id-error' : undefined} className={formErrors.semester_id ? 'border-destructive' : ''}><SelectValue placeholder="Select semester" /></SelectTrigger><SelectContent><SelectItem value="1">First Semester</SelectItem><SelectItem value="2">Second Semester</SelectItem><SelectItem value="3">Summer Semester</SelectItem></SelectContent></Select><ErrorMessage id="semester_id-error" message={formErrors.semester_id} />{editingSchoolYear && <p className="text-xs text-muted-foreground">Academic year and semester are fixed for existing records.</p>}</div>
                            <div className="grid gap-4 sm:grid-cols-2">
                                {[['start_date', 'Enrollment Starts'], ['end_date', 'Enrollment Ends']].map(([name, label]) => <div key={name} className="min-w-0 space-y-2"><Label htmlFor={name}>{label}</Label><Input id={name} name={name} type="date" min={name === 'end_date' ? form.start_date || undefined : undefined} max={name === 'start_date' ? form.end_date || undefined : undefined} value={form[name]} onChange={(event) => updateForm(name, event.target.value)} aria-invalid={!!formErrors[name]} aria-describedby={formErrors[name] ? `${name}-error` : undefined} className={`min-w-0 ${formErrors[name] ? 'border-destructive' : ''}`} /><ErrorMessage id={`${name}-error`} message={formErrors[name]} /></div>)}
                            </div>
                            {affectsActivePeriod && <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"><p className="flex items-start gap-2"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />Changing this active period may change enrollment availability immediately.</p><div className="flex items-start gap-2"><Checkbox id="confirm-period" checked={acknowledged} onCheckedChange={(checked) => setAcknowledged(checked === true)} /><Label htmlFor="confirm-period" className="text-xs leading-5">I have reviewed the new enrollment dates.</Label></div><ErrorMessage message={formErrors.confirmation} /></div>}
                        </fieldset>
                        {Object.keys(formErrors).length > 0 && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{formErrors.general || 'Please review the highlighted fields before saving.'}</p>}
                        <DialogFooter className="gap-2"><Button type="button" variant="outline" disabled={submitting} onClick={() => setOpenForm(false)}>Cancel</Button><Button type="submit" disabled={submitting || (affectsActivePeriod && !acknowledged)}>{submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}{submitting ? 'Saving...' : 'Save Changes'}</Button></DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            {selectedSchoolYear && openSettings && <SchoolYearSettings key={selectedSchoolYear.id} schoolYearId={selectedSchoolYear.id} open={openSettings} setOpen={setOpenSettings} onUpdated={handleSettingsUpdated} />}
        </div>
    );
}

SchoolYear.layout = (page) => <AuthenticatedLayout title="School Years" children={page} />


