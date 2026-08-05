import { Button } from '@/Components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { cn, formatPhoneNumber } from '@/Lib/Utils';
import { useForm } from '@inertiajs/react';
import {
    Check,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    CircleHelp,
    LoaderCircle,
    MapPin,
    TriangleAlert,
    UserRound,
} from 'lucide-react';
import React, { useState } from 'react'
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip';
import { Calendar } from '@/Components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Field } from '@/Components/ui/field';
import { format } from 'date-fns';

const requiredFields = [
    'first_name',
    'last_name',
    'gender',
    'birthday',
    'contact_number',
    'email_address',
    'present_address',
    'zip_code',
];

const steps = [
    { label: 'Basic Info', icon: UserRound },
    { label: 'Personal', icon: CalendarDays },
    { label: 'Contact', icon: MapPin },
];

// Small helper so required fields are marked consistently wherever they appear.
const Required = () => <span className="text-destructive">*</span>;

// Shared classes so every field carries the same error state styling.
const fieldClass = (hasError) =>
    cn(hasError && 'border-destructive focus-visible:ring-destructive');

function AddStudent({ open, setOpen, student, editing, setEditing, setStudent }) {
    const [page, setPage] = useState(1);
    const [errorMessage, setErrorMessage] = useState('');
    const { toast } = useToast()

    const { data, setData, post, processing, errors, setError, clearErrors, reset } = useForm({
        id: editing ? student.id : 0,
        user_id_no: editing ? student.user_id_no : '',
        first_name: editing ? student.first_name : '',
        middle_name: editing ? student.middle_name : '',
        last_name: editing ? student.last_name : '',
        gender: editing ? student.gender : '',
        birthday: editing ? student.birthday : '',
        contact_number: editing ? student.contact_number : '09',
        email_address: editing ? student.email_address : '',
        present_address: editing ? student.present_address : '',
        zip_code: editing ? student.zip_code : '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (requiredFields.includes(name) && value.trim() == '') {
            setError(name, { error: true });
        } else if (name == 'user_id_no') {
            if (value.length > 12) return
            const cleanedValue = value.replace(/[^0-9-]/g, '');
            setData(name, cleanedValue);
            return
        } else {
            clearErrors(name);
        }

        setData(name, value);
    };

    const handleGenderChange = ({ name, value }) => {
        if (requiredFields.includes(name) && value.trim() === '') {
            setError(name, { error: true });
        } else {
            clearErrors(name);
        }

        setData(name, value);
    };


    const handleContactChange = (e) => {
        const value = e.target.value.replace(/-/g, '')

        if (value.length <= 11 && isNaN(value)) {
            return
        }

        if (value.trim() == '') {
            setError('contact_number', { error: true });
            setData('contact_number', '09')
            return
        } else if (!value.startsWith('09')) {
            return;
        } else if (value.length > 11) {
            return
        } else {
            clearErrors('contact_number');
        }

        setData('contact_number', value);
    };

    const nextPage = () => {
        let hasError = false;

        if (page == 1) {
            if (!data.first_name) {
                setError('first_name', { error: true });
                hasError = true;
            }

            if (!data.last_name) {
                setError('last_name', { error: true });
                hasError = true;
            }

            if (!data.user_id_no && editing) {
                setError('user_id_no', { error: true });
                hasError = true;
            }

            if (hasError) return;
        } else if (page == 2) {
            if (data.email_address == '') {
                setError('email_address', { error: true });
                hasError = true;
            }

            if (data.email_address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email_address)) {
                setError('email_address', { message: 'Invalid email address!' })
                hasError = true;
            }

            if (!data.gender) {
                setError('gender', { error: true });
                hasError = true;
            }

            if (!data.birthday) {
                setError('birthday', { error: true });
                hasError = true;
            }

            if (hasError) return;
        }
        setPage(prev => prev + 1);
    }

    const previousPage = () => {
        setPage(prev => prev - 1);
    }

    const submit = async () => {
        let hasError = false;

        if (!data.contact_number || data.contact_number.length != 11) {
            setError('contact_number', { error: true });
            hasError = true;
        }

        if (!data.present_address) {
            setError('present_address', { error: true });
            hasError = true;
        }

        if (!data.zip_code) {
            setError('zip_code', { error: true });
            hasError = true;
        }

        if (hasError) return;

        const routeName = editing ? 'student.edit' : 'student.add'

        await post(route(routeName), {
            onSuccess: () => {
                reset();
                setPage(1);
                setOpen(false);
                setErrorMessage('');
                setStudent([])
                setEditing(false);
                toast({
                    description: "Student added successfully",
                    variant: "success",
                });
            },
            onError: (errors) => {
                if (errors.student) {
                    setErrorMessage(errors.student);
                    setError('first_name', { error: true })
                    setError('last_name', { error: true })
                    setPage(1);
                } else if (errors.email) {
                    setErrorMessage(errors.email);
                    setError('email_address', { error: true })
                    setPage(2);
                } else if (errors.user_id_no) {
                    setErrorMessage(errors.user_id_no);
                    setError('user_id_no', { error: true })
                    setPage(1);
                } else if (errors.school_year) {
                    setErrorMessage(errors.school_year);
                }
            }
        })
    }

    const closeDialog = (isOpen) => {
        if (isOpen) return;
        setOpen(false);
        setEditing(false);
        setStudent([]);
        reset();
        setPage(1);
        setErrorMessage('');
    };

    return (
        <div>
            <Dialog open={open} onOpenChange={closeDialog}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <UserRound className="h-5 w-5" />
                            </div>
                            <div>
                                <DialogTitle>{editing ? 'Edit Student' : 'Add Student'}</DialogTitle>
                                <DialogDescription>
                                    {editing
                                        ? "Update this student's information below."
                                        : 'Fill in the details across three quick steps.'}
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* Step progress */}
                    <div className="mt-1">
                        <div className="flex gap-1.5">
                            {[1, 2, 3].map((n) => (
                                <div
                                    key={n}
                                    className={cn(
                                        'h-1.5 flex-1 rounded-full transition-colors',
                                        page >= n ? 'bg-primary' : 'bg-muted'
                                    )}
                                />
                            ))}
                        </div>
                        <div className="mt-2 flex justify-between">
                            {steps.map((step, idx) => {
                                const stepNum = idx + 1;
                                const isCurrent = page === stepNum;
                                const isDone = page > stepNum;
                                const Icon = isDone ? Check : step.icon;
                                return (
                                    <span
                                        key={step.label}
                                        className={cn(
                                            'flex items-center gap-1 text-xs font-medium',
                                            isCurrent ? 'text-foreground' : 'text-muted-foreground'
                                        )}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {step.label}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    <div className='flex flex-col justify-between h-full gap-0'>
                        <div className='flex flex-col justify-between min-h-[21rem]'>
                            <div
                                key={page}
                                className='h-full flex flex-col justify-between animate-in fade-in slide-in-from-right-2 duration-200'
                            >
                                {page == 1 && (
                                    <div className='flex flex-col gap-4 pt-4'>
                                        <div className="space-y-1.5">
                                            <div className='flex gap-2 items-center'>
                                                <Label htmlFor="user_id_no">
                                                    ID number {editing && <Required />}
                                                </Label>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button type="button" variant="ghost" size="icon" className="h-5 w-5">
                                                            <CircleHelp className='h-4 w-4 text-blue-500 cursor-pointer' />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Use this only for old students who don't have records in the system.
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                            <Input
                                                id="user_id_no"
                                                name="user_id_no"
                                                value={data.user_id_no}
                                                onChange={handleChange}
                                                className={fieldClass(errors.user_id_no)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="first_name">First name <Required /></Label>
                                                <Input
                                                    id="first_name"
                                                    name="first_name"
                                                    value={data.first_name}
                                                    onChange={handleChange}
                                                    className={fieldClass(errors.first_name)}
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="last_name">Last name <Required /></Label>
                                                <Input
                                                    id="last_name"
                                                    name="last_name"
                                                    value={data.last_name}
                                                    onChange={handleChange}
                                                    className={fieldClass(errors.last_name)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <Label htmlFor="middle_name">
                                                Middle name <span className="text-muted-foreground font-normal">(optional)</span>
                                            </Label>
                                            <Input
                                                id="middle_name"
                                                name="middle_name"
                                                value={data.middle_name}
                                                onChange={handleChange}
                                                className={fieldClass(errors.middle_name)}
                                            />
                                        </div>
                                    </div>
                                )}

                                {page == 2 && (
                                    <div className='flex flex-col gap-4 pt-4'>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="email_address">Email address <Required /></Label>
                                            <Input
                                                id="email_address"
                                                type="email"
                                                name="email_address"
                                                value={data.email_address}
                                                onChange={handleChange}
                                                className={fieldClass(errors.email_address)}
                                            />
                                            {errors.email_address?.message && (
                                                <p className="text-destructive text-xs">{errors.email_address.message}</p>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="gender">Gender <Required /></Label>
                                                <Select
                                                    name="gender"
                                                    value={data.gender}
                                                    onValueChange={(value) =>
                                                        handleGenderChange({ name: 'gender', value })
                                                    }
                                                >
                                                    <SelectTrigger id="gender" className={fieldClass(errors.gender)}>
                                                        <SelectValue placeholder="Select..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Male">Male</SelectItem>
                                                        <SelectItem value="Female">Female</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <Label htmlFor="birthday">Birthday <Required /></Label>
                                                <Field>
                                                    <Popover>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                id="birthday"
                                                                className={cn(
                                                                    'justify-start font-normal w-full',
                                                                    !data.birthday && 'text-muted-foreground',
                                                                    fieldClass(errors.birthday)
                                                                )}
                                                            >
                                                                <CalendarDays className="mr-2 h-4 w-4" />
                                                                {data.birthday ? format(new Date(data.birthday), 'PP') : 'Select date'}
                                                            </Button>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={data.birthday ? new Date(data.birthday) : undefined}
                                                                defaultMonth={data.birthday ? new Date(data.birthday) : undefined}
                                                                captionLayout="dropdown"
                                                                onSelect={(date) => {
                                                                    setError('birthday', null);
                                                                    setData("birthday", date ? format(date, "yyyy-MM-dd") : "");
                                                                }}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                </Field>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {page == 3 && (
                                    <div className='flex flex-col gap-4 pt-4'>
                                        <div className="space-y-1.5">
                                            <Label htmlFor="contact_number">Phone number <Required /></Label>
                                            <Input
                                                id="contact_number"
                                                name="contact_number"
                                                value={formatPhoneNumber(data.contact_number)}
                                                onChange={handleContactChange}
                                                className={fieldClass(errors.contact_number)}
                                            />
                                        </div>

                                        <div className="space-y-3">
                                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Address
                                            </p>
                                            <div className="flex gap-3">
                                                <div className="flex-1 space-y-1.5">
                                                    <Label htmlFor="present_address">Present address <Required /></Label>
                                                    <Input
                                                        id="present_address"
                                                        name="present_address"
                                                        value={data.present_address}
                                                        onChange={handleChange}
                                                        className={fieldClass(errors.present_address)}
                                                    />
                                                </div>
                                                <div className="w-28 space-y-1.5">
                                                    <Label htmlFor="zip_code">Zip code <Required /></Label>
                                                    <Input
                                                        id="zip_code"
                                                        name="zip_code"
                                                        value={data.zip_code}
                                                        onChange={(e) => {
                                                            if (isNaN(e.target.value)) return
                                                            handleChange(e);
                                                        }}
                                                        className={fieldClass(errors.zip_code)}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {errorMessage && (
                                    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 mt-2 text-sm text-destructive">
                                        <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                                        <p>{errorMessage}</p>
                                    </div>
                                )}
                            </div>
                            <div className='w-full flex justify-between items-center pt-3'>
                                <Button type="button" variant="ghost" size="sm" className="gap-1 text-muted-foreground" disabled={page === 1} onClick={previousPage}>
                                    <ChevronLeft className="h-4 w-4" /> Prev
                                </Button>
                                <span className="text-xs text-muted-foreground">Step {page} of 3</span>
                                <Button type="button" variant="ghost" size="sm" className="gap-1" disabled={page === 3} onClick={nextPage}>
                                    Next <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 my-2 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                        <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>Credentials can't be sent right now — Google SMTP is rate-limited with a low sending quota.</p>
                    </div> */}

                    <DialogFooter>
                        <Button
                            className="w-full relative justify-center gap-2"
                            disabled={processing || page !== 3}
                            onClick={submit}
                            type="submit"
                        >
                            {processing && <LoaderCircle className="h-4 w-4 animate-spin" />}
                            <span className="text-center">
                                {processing ? 'Submitting…' : editing ? 'Confirm edit' : 'Submit'}
                            </span>
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default AddStudent