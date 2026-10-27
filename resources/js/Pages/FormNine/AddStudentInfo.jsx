import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/Components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/Components/ui/select';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Separator } from '@/Components/ui/separator';
import { formatName } from '@/Lib/InfoUtils';
import { cn } from '@/Lib/Utils';
import {
    getRegions, getProvinces, getCities, getBarangays, getZipCode,
} from '@/Lib/PhilippinesAddressData/AddressesFinder';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Calendar } from '@/Components/ui/calendar';

const INITIAL_DATA = {
    gender: '', civil_status: '', birthday: '', place_of_birth: '', contact_number: '',
    street: '', region: 'Region X (Northern Mindanao)', regionCode: '10',
    province: 'Misamis Oriental', provinceCode: '1043',
    city: '', cityCode: '', barangay: '', barangayCode: '', zipCode: '',
    father_first_name: '', father_last_name: '', father_middle_name: '', father_suffix: '',
    mother_first_name: '', mother_maiden_last_name: '', mother_middle_name: '', mother_suffix: '',
    elementary_name: '', elementary_address: '', elementary_year: '',
    secondary_name: '', secondary_address: '', secondary_year: '',
};

const REQUIRED_FIELDS = new Set([
    'gender', 'civil_status', 'birthday', 'place_of_birth',
    'regionCode', 'provinceCode', 'cityCode', 'barangayCode',
    'father_first_name', 'father_last_name', 'mother_first_name', 'mother_maiden_last_name',
    'elementary_name', 'elementary_address', 'elementary_year',
    'secondary_name', 'secondary_address', 'secondary_year',
]);

function FormField({ name, label, error, children, hint, className }) {
    const required = REQUIRED_FIELDS.has(name);
    return (
        <div className={cn('min-w-0 space-y-2', className)}>
            <Label htmlFor={name}>
                {label}
                {required ? <span aria-hidden="true" className="ml-1 text-destructive">*</span>
                    : <span className="ml-1 font-normal text-muted-foreground">(optional)</span>}
            </Label>
            {children}
            {hint && <p id={`${name}-hint`} className="text-xs text-muted-foreground">{hint}</p>}
            {error && <p id={`${name}-error`} className="text-sm text-destructive">{error}</p>}
        </div>
    );
}

function fieldProps(name, error, hint) {
    return {
        id: name,
        name,
        'aria-required': REQUIRED_FIELDS.has(name),
        'aria-invalid': Boolean(error),
        'aria-describedby': [error && `${name}-error`, hint && `${name}-hint`].filter(Boolean).join(' ') || undefined,
        className: cn('h-12 w-full', error && 'border-destructive focus-visible:ring-destructive'),
    };
}

export default function AddStudentInfo({ student, open, onClose }) {
    const studentId = student?.id;
    const formRef = useRef(null);
    const submittingRef = useRef(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetching, setIsFetching] = useState(false);
    const [loadedStudentId, setLoadedStudentId] = useState(null);
    const [hasExistingInfo, setHasExistingInfo] = useState(false);
    const [fetchError, setFetchError] = useState('');
    const [retryCount, setRetryCount] = useState(0);
    const queryClient = useQueryClient();
    const { data, setData, errors, clearErrors, reset, setError } = useForm({ ...INITIAL_DATA });

    useEffect(() => {
        if (!open || !studentId) return;

        const controller = new AbortController();
        setIsFetching(true);
        setFetchError('');
        setHasExistingInfo(false);
        setData({ ...INITIAL_DATA });
        clearErrors();

        const loadRecord = async () => {
            try {
                const response = await axios.get(route('permanent-record.get-student-info', studentId), {
                    signal: controller.signal,
                });
                if (controller.signal.aborted) return;

                const record = response.data.data || {};
                const information = record.information || {};
                const address = record.address || {};
                const parents = record.parents || {};
                const education = record.education || {};
                const nextData = { ...INITIAL_DATA };

                ['gender', 'civil_status', 'birthday', 'place_of_birth', 'contact_number'].forEach(name => {
                    nextData[name] = information[name] ?? '';
                });
                nextData.birthday = String(nextData.birthday).split('T')[0];
                ['street', 'region', 'province', 'city', 'barangay'].forEach(name => {
                    nextData[name] = address[name] ?? INITIAL_DATA[name];
                });
                ['region', 'province', 'city', 'barangay'].forEach(name => {
                    nextData[`${name}Code`] = String(address[`${name}_code`] ?? INITIAL_DATA[`${name}Code`]);
                });
                nextData.zipCode = address.zip_code ?? '';
                Object.keys(INITIAL_DATA).filter(name => /^(father_|mother_)/.test(name)).forEach(name => {
                    nextData[name] = parents[name] ?? '';
                });
                Object.keys(INITIAL_DATA).filter(name => /^(elementary_|secondary_)/.test(name)).forEach(name => {
                    nextData[name] = education[name] ?? '';
                });
                setData(nextData);
                setHasExistingInfo(Object.values(record).some(Boolean));
            } catch (error) {
                if (!controller.signal.aborted) {
                    setFetchError('Student information could not be loaded. Retry before making changes.');
                }
            } finally {
                if (!controller.signal.aborted) {
                    setLoadedStudentId(studentId);
                    setIsFetching(false);
                }
            }
        };

        loadRecord();
        return () => controller.abort();
    }, [open, studentId, retryCount]);

    const addressOptions = useMemo(() => ({
        regions: getRegions(),
        provinces: getProvinces(data.regionCode),
        cities: getCities(data.provinceCode),
        barangays: getBarangays(data.cityCode),
    }), [data.regionCode, data.provinceCode, data.cityCode]);

    const isLoading = open && Boolean(studentId) && (isFetching || loadedStudentId !== studentId);
    const canEdit = Boolean(studentId) && !isLoading && !fetchError;
    const today = format(new Date(), 'yyyy-MM-dd');

    const handleChange = ({ target: { name, value } }) => {
        setData(name, value);
        clearErrors(name);
    };

    const handleRegionChange = value => {
        const region = addressOptions.regions.find(item => String(item.region_code) === value);
        if (!region) return;
        setData(previous => ({
            ...previous, region: region.region_name, regionCode: value,
            province: '', provinceCode: '', city: '', cityCode: '', barangay: '', barangayCode: '', zipCode: '',
        }));
        clearErrors('regionCode', 'provinceCode', 'cityCode', 'barangayCode', 'zipCode');
    };

    const handleProvinceChange = value => {
        const province = addressOptions.provinces.find(item => String(item.province_code) === value);
        if (!province) return;
        setData(previous => ({
            ...previous, province: province.province_name, provinceCode: value,
            city: '', cityCode: '', barangay: '', barangayCode: '', zipCode: '',
        }));
        clearErrors('provinceCode', 'cityCode', 'barangayCode', 'zipCode');
    };

    const handleCityChange = value => {
        const city = addressOptions.cities.find(item => String(item.city_code) === value);
        if (!city) return;
        setData(previous => ({
            ...previous, city: city.city_name, cityCode: value, barangay: '', barangayCode: '',
            zipCode: getZipCode(city.city_name)?.zip_code || '',
        }));
        clearErrors('cityCode', 'barangayCode', 'zipCode');
    };

    const handleBarangayChange = value => {
        const barangay = addressOptions.barangays.find(item => String(item.barangay_code) === value);
        if (!barangay) return;
        setData(previous => ({ ...previous, barangay: barangay.barangay_name, barangayCode: value }));
        clearErrors('barangayCode');
    };

    const handleClose = () => {
        reset();
        clearErrors();
        setLoadedStudentId(null);
        onClose(false);
    };

    const focusFirstError = () => {
        requestAnimationFrame(() => {
            const field = formRef.current?.querySelector('[aria-invalid="true"]');
            field?.focus();
            field?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        });
    };

    const handleSubmit = async event => {
        event.preventDefault();
        if (submittingRef.current || !canEdit) return;

        const validationErrors = {};
        REQUIRED_FIELDS.forEach(name => {
            if (!String(data[name] ?? '').trim()) validationErrors[name] = 'This field is required.';
        });
        const birthday = new Date(`${data.birthday}T00:00:00`);
        if (data.birthday && (!/^\d{4}-\d{2}-\d{2}$/.test(data.birthday)
            || Number.isNaN(birthday.getTime()) || format(birthday, 'yyyy-MM-dd') !== data.birthday || data.birthday > today)) {
            validationErrors.birthday = 'Enter a valid birthday that is not in the future.';
        }
        ['elementary_year', 'secondary_year'].forEach(name => {
            if (data[name] && (!/^\d{4}$/.test(String(data[name])) || Number(data[name]) > Number(today.slice(0, 4)))) {
                validationErrors[name] = 'Enter a four-digit graduation year that is not in the future.';
            }
        });
        clearErrors();
        if (Object.keys(validationErrors).length) {
            setError(validationErrors);
            focusFirstError();
            return;
        }

        submittingRef.current = true;
        setIsSubmitting(true);
        try {
            await axios.post(route('permanent-record.add-student-info', studentId), data);
        } catch (error) {
            if (error.response?.status === 422) {
                const backendErrors = error.response.data.errors || {};
                setError(Object.fromEntries(Object.entries(backendErrors).map(([name, messages]) => [
                    name, Array.isArray(messages) ? messages[0] : messages,
                ])));
                toast.error('Please check the highlighted fields.');
                focusFirstError();
            } else {
                toast.error('Student information could not be saved. Your changes are still here. Please try again.');
            }
            submittingRef.current = false;
            setIsSubmitting(false);
            return;
        }

        // A refresh failure must not report that an already-saved record failed to save.
        try {
            await queryClient.invalidateQueries({ queryKey: ['permanent-record-student', studentId] });
            toast.success('Student information saved.');
        } catch {
            toast.success('Student information saved. Reopen the record to refresh the view.');
        } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
            handleClose();
        }
    };

    const renderBirthdayInput = () => {
        const error = errors.birthday;
        const birthday = data.birthday
            ? new Date(data.birthday + 'T00:00:00')
            : undefined;
        const selectedDate = birthday && !Number.isNaN(birthday.getTime())
            ? birthday
            : undefined;

        return (
            <FormField name="birthday" label="Birthday" error={error}>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            type="button"
                            variant="outline"
                            {...fieldProps('birthday', error)}
                            className={cn(
                                fieldProps('birthday', error).className,
                                'justify-between font-normal',
                            )}
                        >
                            {selectedDate ? format(selectedDate, 'MMM d, yyyy') : 'Select date'}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                        <Calendar
                            mode="single"
                            selected={selectedDate}
                            defaultMonth={selectedDate}
                            captionLayout="dropdown"
                            disabled={date => date > new Date()}
                            onSelect={date => {
                                setData('birthday', date ? format(date, 'yyyy-MM-dd') : '');
                                clearErrors('birthday');
                            }}
                        />
                    </PopoverContent>
                </Popover>
            </FormField>
        );
    };

    const renderInput = (name, label, options = {}) => {
        const { hint, className, ...inputOptions } = options;
        return (
            <FormField name={name} label={label} error={errors[name]} hint={hint} className={className}>
                <Input
                    {...fieldProps(name, errors[name], hint)}
                    value={data[name]}
                    onChange={handleChange}
                    {...inputOptions}
                />
            </FormField>
        );
    };

    const renderSelect = (name, label, options, onValueChange, disabled = false) => (
        <FormField name={name} label={label} error={errors[name]}>
            <Select name={name} value={data[name]} onValueChange={onValueChange} disabled={disabled || isSubmitting}>
                <SelectTrigger {...fieldProps(name, errors[name])}>
                    <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                    {options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
            </Select>
        </FormField>
    );

    return (
        <Dialog open={open} onOpenChange={nextOpen => {
            if (!nextOpen && !submittingRef.current) handleClose();
        }}>
            <DialogContent
                className={cn('flex max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0',
                    isSubmitting && '[&>button]:hidden')}
                onInteractOutside={event => event.preventDefault()}
                onEscapeKeyDown={event => { if (submittingRef.current) event.preventDefault(); }}
            >
                <DialogHeader className="shrink-0 border-b px-6 py-5 pr-12 text-left">
                    <DialogTitle>{hasExistingInfo ? 'Edit student information' : 'Add student information'}</DialogTitle>
                    <DialogDescription>
                        Student: {student ? formatName(student, { format: 'FML' }) : 'No student selected'}
                    </DialogDescription>
                    <p className="text-xs text-muted-foreground">Fields marked <span className="text-destructive">*</span> are required.</p>
                </DialogHeader>

                <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-1 flex-col" aria-busy={isLoading || isSubmitting}>
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
                        {isLoading ? (
                            <div role="status" className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground">
                                <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />
                                Loading student information...
                            </div>
                        ) : fetchError || !studentId ? (
                            <div role="alert" className="space-y-4 rounded-lg border p-4 text-sm">
                                <p>{fetchError || 'Select a student before adding information.'}</p>
                                {studentId && <Button type="button" variant="outline" onClick={() => setRetryCount(count => count + 1)}>Retry loading</Button>}
                            </div>
                        ) : (
                            <fieldset disabled={isSubmitting} className="min-w-0 space-y-8">
                                {Object.keys(errors).length > 0 && (
                                    <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                                        Please correct the highlighted fields before saving.
                                    </div>
                                )}
                                <section aria-labelledby="personal-information-heading" className="space-y-4">
                                    <h3 id="personal-information-heading" className="text-base font-semibold">Personal information</h3>
                                    <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
                                        {renderBirthdayInput()}
                                        {renderInput('place_of_birth', 'Place of birth')}
                                        {renderSelect('gender', 'Gender', ['Male', 'Female'].map(value => ({ value, label: value })), value => {
                                            setData('gender', value); clearErrors('gender');
                                        })}
                                        {renderSelect('civil_status', 'Civil status', ['Single', 'Married', 'Widowed', 'Divorced'].map(value => ({ value, label: value })), value => {
                                            setData('civil_status', value); clearErrors('civil_status');
                                        })}
                                    </div>
                                </section>

                                <Separator />

                                <section aria-labelledby="current-address-heading" className="space-y-4">
                                    <h3 id="current-address-heading" className="text-base font-semibold">Current address</h3>
                                    <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
                                        {renderSelect('regionCode', 'Region', addressOptions.regions.map(item => ({ value: String(item.region_code), label: item.region_name })), handleRegionChange)}
                                        {renderSelect('provinceCode', 'Province', addressOptions.provinces.map(item => ({ value: String(item.province_code), label: item.province_name })), handleProvinceChange, !data.regionCode)}
                                        {renderSelect('cityCode', 'City / municipality', addressOptions.cities.map(item => ({ value: String(item.city_code), label: item.city_name })), handleCityChange, !data.provinceCode)}
                                        {renderSelect('barangayCode', 'Barangay', addressOptions.barangays.map(item => ({ value: String(item.barangay_code), label: item.barangay_name })), handleBarangayChange, !data.cityCode)}
                                        {renderInput('street', 'Street / house no.', { autoComplete: 'address-line1' })}
                                        {renderInput('zipCode', 'ZIP code', {
                                            autoComplete: 'postal-code', inputMode: 'numeric', disabled: !data.cityCode,
                                            hint: 'Filled when available. Check and correct it if needed.',
                                        })}
                                    </div>
                                </section>

                                <Separator />

                                <section aria-labelledby="parents-information-heading" className="space-y-6">
                                    <h3 id="parents-information-heading" className="text-base font-semibold">Parents' information</h3>
                                    {['father', 'mother'].map(parent => (
                                        <div key={parent} className="space-y-4" role="group" aria-labelledby={`${parent}-heading`}>
                                            <h4 id={`${parent}-heading`} className="text-sm font-medium text-muted-foreground">{parent === 'father' ? "Father's details" : "Mother's details"}</h4>
                                            <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
                                                {renderInput(`${parent}_first_name`, 'First name')}
                                                {renderInput(parent === 'father' ? 'father_last_name' : 'mother_maiden_last_name', parent === 'father' ? 'Last name' : 'Maiden last name')}
                                                {renderInput(`${parent}_middle_name`, 'Middle name')}
                                                {renderInput(`${parent}_suffix`, 'Suffix', { placeholder: 'e.g., Jr.', className: 'md:max-w-40' })}
                                            </div>
                                        </div>
                                    ))}
                                </section>

                                <Separator />

                                <section aria-labelledby="education-heading" className="space-y-6">
                                    <h3 id="education-heading" className="text-base font-semibold">Educational background</h3>
                                    {['elementary', 'secondary'].map(level => (
                                        <div key={level} className="space-y-4" role="group" aria-labelledby={`${level}-heading`}>
                                            <h4 id={`${level}-heading`} className="text-sm font-medium capitalize text-muted-foreground">{level}</h4>
                                            <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
                                                {renderInput(`${level}_name`, 'School name')}
                                                {renderInput(`${level}_year`, 'Year graduated', { inputMode: 'numeric', maxLength: 4, placeholder: 'YYYY', className: 'md:max-w-40' })}
                                                {renderInput(`${level}_address`, 'School address', { className: 'md:col-span-2' })}
                                            </div>
                                        </div>
                                    ))}
                                </section>
                            </fieldset>
                        )}
                    </div>

                    <DialogFooter className="shrink-0 gap-2 border-t bg-background px-6 py-4 sm:space-x-0">
                        <Button type="button" variant="outline" onClick={() => { if (!submittingRef.current) handleClose(); }} disabled={isSubmitting}>Cancel</Button>
                        <Button type="submit" disabled={!canEdit || isSubmitting}>
                            {isSubmitting && <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />}
                            {isSubmitting ? 'Saving...' : 'Save changes'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
