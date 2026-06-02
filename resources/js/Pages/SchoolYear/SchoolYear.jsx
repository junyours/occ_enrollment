import PreLoader from '@/Components/preloader/PreLoader';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateShort } from '@/Lib/Utils';
import axios from 'axios';
import React, { useEffect, useState } from 'react'
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/Components/ui/sheet"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/Components/ui/dialog"
import { Input } from "@/Components/ui/input"
import { Label } from "@/Components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import Checkbox from '@/Components/Checkbox';
import { Head, Link, usePage } from '@inertiajs/react';
import { PageTitle } from '@/Components/ui/PageTitle';
import SchoolYearSettings from './SchoolYearSettings';

export default function SchoolYear() {
    const { user } = usePage().props.auth;
    const userRole = user.user_role;

    const [action, setAction] = useState('adding');
    const [submitting, setSubmitting] = useState(false);
    const [openSheet, setOpenSheet] = useState(false);
    const [openSettings, setOpenSettings] = useState(false);
    const [selectedSchoolYear, setSelectedSchoolYear] = useState(null);
    const [showAll, setShowAll] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [schoolYears, setSchoolYears] = useState([]);

    const [form, setForm] = useState({
        semester_id: '',
        start_year: '',
        end_year: '',
        start_date: '',
        end_date: '',
    });
    const [nextYear, setNextYear] = useState({
        semester_id: '',
        start_year: '',
        end_year: '',
        start_date: '',
        end_date: '',
    });

    const [loading, setLoading] = useState(true);

    const getSchoolYears = async () => {
        axios.post(route('school-year.list'))
            .then(response => {
                setSchoolYears(response.data)
                const lastSchoolYear = response.data[0];
                if (lastSchoolYear) {
                    if (lastSchoolYear.semester_id === 3) {
                        setForm(prev => ({
                            ...prev,
                            semester_id: 1,
                            start_year: lastSchoolYear.end_year,
                            end_year: Number(lastSchoolYear.end_year) + 1,
                        }));
                        setNextYear(prev => ({
                            ...prev,
                            semester_id: 1,
                            start_year: lastSchoolYear.end_year,
                            end_year: Number(lastSchoolYear.end_year) + 1,
                        }));
                    } else {
                        setForm(prev => ({
                            ...prev,
                            semester_id: Number(lastSchoolYear.semester_id) + 1,
                            start_year: lastSchoolYear.start_year,
                            end_year: lastSchoolYear.end_year,
                        }));
                        setNextYear(prev => ({
                            ...prev,
                            semester_id: 1,
                            start_year: lastSchoolYear.end_year,
                            end_year: Number(lastSchoolYear.end_year) + 1,
                        }));
                    }
                }
            })
            .finally(() => {
                setLoading(false);
            })
    }

    const [searchTerm, setSearchTerm] = useState('');
    const filteredSchoolYears = schoolYears.filter(sy => `${sy.start_year} - ${sy.end_year}`.includes(searchTerm));
    const schoolYearsToShow = showAll ? filteredSchoolYears : filteredSchoolYears.slice(0, 8);

    useEffect(() => {
        getSchoolYears()
    }, [])

    if (loading) return <PreLoader title="School year" />

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        if (name === "start_year") {
            if (value === '' || (Number(value) >= 1 && value.length <= 4)) {
                setForm(prev => ({
                    ...prev,
                    [name]: value,
                    end_year: value ? Number(value) + 1 : ''
                }));
            }
            return;
        }
        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        const errors = {};
        if (!form.semester_id) errors.semester_id = true;
        if (!form.start_year) errors.start_year = true;
        if (!form.end_year) errors.end_year = true;
        if (!form.start_date) errors.start_date = true;
        if (!form.end_date) errors.end_date = true;
        setFormErrors(errors);
        if (Object.keys(errors).length > 0) return setSubmitting(false);
        const url = action === 'adding' ? route('add.school-year') : route('edit.school-year', { id: form.id });
        const method = action === 'adding' ? 'post' : 'patch';
        try {
            await axios[method](url, form).finally(() => {
                getSchoolYears();
                setSubmitting(false);
            });
            setOpenSheet(false);
        } catch (error) {
            console.error(error);
        }
    };

    const addDays = (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result.toISOString().split('T')[0];
    };

    const getSemesterColor = (semesterId) => {
        switch (semesterId) {
            case 1: return 'bg-blue-100 text-blue-800 border-blue-200';
            case 2: return 'bg-green-100 text-green-800 border-green-200';
            case 3: return 'bg-orange-100 text-orange-800 border-orange-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getEnrollmentStatus = (startDate, endDate) => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);

        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // Set to end of day

        // Check if currently within enrollment period
        if (now >= start && now <= end) {
            return 'ongoing';
        }

        // Check if within 14 days before start date (preparing for upcoming enrollment)
        const fourteenDaysBeforeStart = new Date(start);
        fourteenDaysBeforeStart.setDate(fourteenDaysBeforeStart.getDate() - 14);

        if (now >= fourteenDaysBeforeStart && now < start) {
            return 'preparing';
        }

        return null;
    };

    return (
        <div className='space-y-6'>
            <Head title={'School year'} />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">School Years</h1>
                    <p className="text-muted-foreground mt-1">Manage academic year periods and enrollment schedules</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative">
                        <Input type="text" placeholder="Search school years..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 w-full sm:w-64" />
                        <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <Button onClick={() => { setOpenSheet(true); setAction('adding'); setForm(nextYear); setFormErrors({}); }}>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add School Year
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {schoolYearsToShow.map((sy, index) => (
                    <Card key={index} className="group hover:shadow-lg transition-all duration-300">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-2xl font-bold">{`${sy.start_year}-${sy.end_year}`}</CardTitle>
                                <div className="flex flex-col items-end gap-1">
                                    {sy.is_current === 1 && (<Badge className="bg-green-500 hover:bg-green-500">Current</Badge>)}
                                </div>
                            </div>
                            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getSemesterColor(sy.semester_id)}`}>
                                <span className="w-2 h-2 bg-current rounded-full mr-2"></span>
                                {sy.semester_name} Semester
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="space-y-4">
                                <div className="bg-muted rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground font-medium mb-1">Enrollment Period</p>
                                    <p className="text-sm font-semibold">{formatDateShort(sy.start_date)} - {formatDateShort(sy.end_date)}</p>
                                </div>
                                <div className="flex justify-center flex-wrap gap-2">
                                    {getEnrollmentStatus(sy.start_date, sy.end_date) === 'ongoing' && (
                                        <Badge className="bg-blue-500 hover:bg-blue-500">
                                            <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
                                            Ongoing
                                        </Badge>
                                    )}
                                    {getEnrollmentStatus(sy.start_date, sy.end_date) === 'preparing' && (
                                        <Badge className="bg-yellow-500 hover:bg-yellow-500">
                                            <div className="w-2 h-2 bg-white rounded-full mr-1"></div>
                                            Preparing
                                        </Badge>
                                    )}
                                </div>
                                <div className='flex gap-2 justify-center w-full'>
                                    {userRole == 'registrar' && (
                                        <>
                                            <Button variant="outline" size="sm" onClick={() => { setAction('editing'); setOpenSheet(true); setForm({ id: sy.id, semester_id: sy.semester_id, start_year: sy.start_year, end_year: sy.end_year, start_date: sy.start_date, end_date: sy.end_date, is_current: sy.is_current }); setFormErrors({}); }} className="flex-1">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Edit
                                            </Button>
                                            <Button variant="outline" size="sm" onClick={() => { setSelectedSchoolYear(sy); setOpenSettings(true); }} className="flex-1">
                                                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                Settings
                                            </Button>
                                        </>
                                    )}
                                </div>
                                <Link className='flex-1' href={route('school-year.view', { schoolyear: `${sy.start_year}-${sy.end_year}`, semester: sy.semester_name })}>
                                    <Button size="sm" className="w-full mt-2">
                                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                        Open
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {filteredSchoolYears.length > 8 && (
                <div className="text-center">
                    <Button variant="outline" onClick={() => setShowAll(!showAll)}>
                        {showAll ? (
                            <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                                Show Less
                            </>
                        ) : (
                            <>
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                                Show All ({filteredSchoolYears.length - 8} more)
                            </>
                        )}
                    </Button>
                </div>
            )}

            <Dialog open={openSheet} onOpenChange={setOpenSheet}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center">
                            {action === 'adding' ? (
                                <>
                                    <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                    Adding School Year
                                </>
                            ) : (
                                <>
                                    <svg className="w-6 h-6 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Editing School Year
                                </>
                            )}
                        </DialogTitle>
                        <DialogDescription>Fill out the details below. Click save when you're done.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="start_year" className="text-sm font-medium flex items-center">
                                <svg className="w-4 h-4 mr-1 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4V7" />
                                </svg>
                                School Year
                            </Label>
                            <div className='flex gap-3 items-center'>
                                <Input name="start_year" disabled={action == 'editing'} id="start_year" type="number" value={form.start_year} onChange={handleFormChange} className={`flex-1 ${formErrors.start_year ? 'border-destructive' : ''}`} placeholder="2024" />
                                <div className="flex items-center justify-center w-8 h-9 text-muted-foreground font-bold">
                                    <span>—</span>
                                </div>
                                <Input disabled={true} id="end_year" type="number" value={form.end_year} className={`flex-1 ${formErrors.end_year ? 'border-destructive' : ''}`} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="semester_id" className="text-sm font-medium flex items-center">
                                <svg className="w-4 h-4 mr-1 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                                Semester
                            </Label>
                            <Select disabled={action === 'editing'} value={form.semester_id?.toString()} onValueChange={(val) => setForm({ ...form, semester_id: parseInt(val) })}>
                                <SelectTrigger className={`${formErrors.semester_id ? 'border-destructive' : ''}`}>
                                    <SelectValue placeholder="Select semester..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">First Semester</SelectItem>
                                    <SelectItem value="2">Second Semester</SelectItem>
                                    <SelectItem value="3">Summer Semester</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="start_date" className="text-sm font-medium flex items-center">
                                <svg className="w-4 h-4 mr-1 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 4V7" />
                                </svg>
                                Enrollment Period
                            </Label>
                            <div className='flex gap-3 items-center'>
                                <Input id="start_date" type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={`flex-1 ${formErrors.start_date ? 'border-destructive' : ''}`} />
                                <div className="flex items-center justify-center w-8 h-9 text-muted-foreground font-bold">
                                    <span>—</span>
                                </div>
                                <Input min={form.start_date ? addDays(form.start_date, 20) : ''} id="end_date" type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={`flex-1 ${formErrors.end_date ? 'border-destructive' : ''}`} />
                            </div>
                        </div>
                        {formErrors && Object.keys(formErrors).length > 0 && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start space-x-2">
                                <svg className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <div>
                                    <p className="text-sm font-medium text-destructive">Please fill in all required fields</p>
                                    <p className="text-xs text-muted-foreground mt-1">All fields are required to create or update a school year.</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setOpenSheet(false)}>Cancel</Button>
                        <Button onClick={handleSubmit} disabled={submitting}>
                            {submitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {(selectedSchoolYear?.id && openSettings) ? (
                <>
                    <SchoolYearSettings schoolYearId={selectedSchoolYear.id} open={openSettings} setOpen={setOpenSettings} />
                </>
            ) : (
                <></>
            )}
        </div>
    )
}

SchoolYear.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;