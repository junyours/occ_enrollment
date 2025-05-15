import PreLoader from '@/Components/preloader/PreLoader';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatDateShort } from '@/Lib/Utils';
import { Link } from '@inertiajs/react';
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

import { Input } from "@/Components/ui/input"
import { Label } from "@/Components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';

export default function SchoolYear() {
    const [action, setAction] = useState('adding');
    const [openSheet, setOpenSheet] = useState(false);

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
                    } else {
                        setForm(prev => ({
                            ...prev,
                            semester_id: Number(lastSchoolYear.semester_id) + 1,
                            start_year: lastSchoolYear.start_year,
                            end_year: lastSchoolYear.end_year,
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

        // Ensure that start_year is positive
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
        console.log(form.id)
        const errors = {};
        if (!form.semester_id) errors.semester_id = true;
        if (!form.start_year) errors.start_year = true;
        if (!form.end_year) errors.end_year = true;
        if (!form.start_date) errors.start_date = true;
        if (!form.end_date) errors.end_date = true;

        setFormErrors(errors);

        if (Object.keys(errors).length > 0) return; // Prevent submission

        const url = action === 'adding'
            ? route('add.school-year')
            : route('edit.school-year', { id: form.id });

        const method = action === 'adding' ? 'post' : 'patch';

        try {
            await axios[method](url, form)
                .then(response => {
                    console.log(response.data);
                })
                .finally(() => {
                    getSchoolYears();
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

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">School Years</h2>
                <Button
                    onClick={() => {
                        setOpenSheet(true)
                        setAction('adding')
                    }}
                >
                    Add School Year
                </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {schoolYearsToShow.map((sy, index) => (
                    <Card key={index}>
                        <CardHeader>
                            <CardTitle className="text-center text-lg font-semibold">
                                {`${sy.start_year}-${sy.end_year}`}
                            </CardTitle>
                            <p className="text-center text-md -mt-2">{sy.semester_name} Semester</p>
                        </CardHeader>
                        <CardContent>
                            <div className="text-center">
                                <p className="text-xs">
                                    {formatDateShort(sy.start_date)} - {formatDateShort(sy.end_date)}
                                </p>
                                <div className="flex justify-center flex-wrap gap-1 mt-2">
                                    {sy.is_current === 1 && (
                                        <Badge className="bg-green-500 hover:bg-green-500 text-white text-xs font-bold">Current</Badge>
                                    )}
                                    {sy.enrollment_ongoing === 1 && (
                                        <Badge className="bg-blue-500 hover:bg-blue-500 text-white text-xs font-bold">Ongoing</Badge>
                                    )}
                                    {!sy.enrollment_ongoing && !!sy.preparation && (
                                        <Badge className="bg-yellow-500 hover:bg-yellow-500 text-white text-xs font-bold">Preparing</Badge>
                                    )}
                                </div>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setAction('editing');
                                        setOpenSheet(true);
                                        setForm({
                                            id: sy.id,
                                            semester_id: sy.semester_id,
                                            start_year: sy.start_year,
                                            end_year: sy.end_year,
                                            start_date: sy.start_date,
                                            end_date: sy.end_date,
                                        })
                                    }}
                                    className="py-0 h-max mt-0"
                                >
                                    Edit
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* add and edit school year */}
            <Sheet open={openSheet} onOpenChange={setOpenSheet}>
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle>{action === 'adding' ? 'Adding' : 'Editing'} School Year</SheetTitle>
                        <SheetDescription>
                            Fill out the details below. Click save when you're done.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="grid gap-4 py-4">
                        {/* Semester */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="semester_id" className="text-right">
                                Semester
                            </Label>
                            <Select
                                disabled={action === 'editing'}
                                value={form.semester_id}
                                onValueChange={(val) => setForm({ ...form, semester_id: val })}
                            >
                                <SelectTrigger className={`col-span-3 ${formErrors.semester_id ? 'border-red-500' : ''}`}>
                                    <SelectValue placeholder="Select..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={1}>First</SelectItem>
                                    <SelectItem value={2}>Second</SelectItem>
                                    <SelectItem value={3}>Summer</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Start Year */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="start_year" className="text-right">
                                Start Year
                            </Label>
                            <Input
                                name="start_year"
                                disabled={action == 'editing'}
                                id="start_year"
                                type="number"
                                value={form.start_year}
                                onChange={handleFormChange}
                                className={`col-span-3 ${formErrors.start_year ? 'border-red-500' : ''}`}
                            />
                        </div>

                        {/* End Year */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="end_year" className="text-right">
                                End Year
                            </Label>
                            <Input
                                disabled={action == 'editing'}
                                id="end_year"
                                type="number"
                                value={form.end_year}
                                onChange={(e) => setForm({ ...form, end_year: e.target.value })}
                                className={`col-span-3 ${formErrors.end_year ? 'border-red-500' : ''}`}

                            />
                        </div>

                        {/* Start Date */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="start_date" className="text-right">
                                Start Date
                            </Label>
                            <Input
                                id="start_date"
                                type="date"
                                value={form.start_date}
                                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                                className={`col-span-3 ${formErrors.start_date ? 'border-red-500' : ''}`}
                            />
                        </div>

                        {/* End Date */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="end_date" className="text-right">
                                End Date
                            </Label>
                            <Input
                                min={form.start_date ? addDays(form.start_date, 20) : ''}
                                id="end_date"
                                type="date"
                                value={form.end_date}
                                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                className={`col-span-3 ${formErrors.end_date ? 'border-red-500' : ''}`}
                            />
                        </div>
                    </div>

                    <SheetFooter>
                        <Button type="button" onClick={handleSubmit}>Save changes</Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </div>
    )
}


SchoolYear.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
