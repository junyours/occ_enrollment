import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/Components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/Components/ui/select";
import { CFloatingInput } from "@/Components/ui/CFloatingInput";
import RequiredLabel from '@/Components/ui/RequiredLabel';
import { Separator } from '@/Components/ui/separator';
import { formatName } from '@/Lib/InfoUtils';
import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';

import {
    getRegions,
    getProvinces,
    getCities,
    getBarangays,
    getZipCode,
} from '@/Lib/PhilippinesAddressData/AddressesFinder';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn, formatPhoneNumber } from '@/Lib/Utils';

export default function AddStudentInfo({ student, open, onClose }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetching, setIsFetching] = useState(false); // Added fetching state
    const queryClient = useQueryClient();

    const [addressOptions, setAddressOptions] = useState({
        regions: [],
        provinces: [],
        cities: [],
        barangays: []
    });

    const { data, setData, post, processing, errors, clearErrors, reset, setError } = useForm({
        gender: '', civil_status: '', birthday: '', contact_number: '',
        street: '', region: '', regionCode: '', province: '', provinceCode: '',
        city: '', cityCode: '', barangay: '', barangayCode: '', zipCode: '',
        father_first_name: '', father_last_name: '', father_middle_name: '', father_suffix: '',
        mother_first_name: '', mother_maiden_last_name: '', mother_middle_name: '', mother_suffix: '',
        elementary_name: '', elementary_address: '', elementary_year: '',
        secondary_name: '', secondary_address: '', secondary_year: ''
    });

    // --- Data Fetching Logic --- //
    useEffect(() => {
        if (open && student?.id) {
            fetchExistingInfo();
        } else {
            reset(); // Clear form if closed
        }
    }, [open, student]);

    const fetchExistingInfo = async () => {
        setIsFetching(true);
        try {
            // Adjust this route to match your actual GET route for the info
            const response = await axios.get(route('permanent-record.get-student-info', student.id));
            const existingData = response.data.data; // Assuming your backend returns { data: { ... } }

            if (existingData) {
                setData({
                    // Information Table
                    gender: existingData.information?.gender || '',
                    civil_status: existingData.information?.civil_status || '',
                    birthday: existingData.information?.birthday || '',
                    contact_number: existingData.information?.contact_number || '',
                    place_of_birth: existingData.information?.place_of_birth || '',

                    // Address Table
                    street: existingData.address?.street || '',
                    region: existingData.address?.region || '',         // ADDED
                    regionCode: existingData.address?.region_code || '',
                    province: existingData.address?.province || '',     // ADDED
                    provinceCode: existingData.address?.province_code || '',
                    city: existingData.address?.city || '',             // ADDED
                    cityCode: existingData.address?.city_code || '',
                    barangay: existingData.address?.barangay || '',     // ADDED
                    barangayCode: existingData.address?.barangay_code || '',
                    zipCode: existingData.address?.zip_code || '',

                    // Parents Table
                    father_first_name: existingData.parents?.father_first_name || '',
                    father_last_name: existingData.parents?.father_last_name || '',
                    father_middle_name: existingData.parents?.father_middle_name || '',
                    father_suffix: existingData.parents?.father_suffix || '',
                    mother_first_name: existingData.parents?.mother_first_name || '',
                    mother_maiden_last_name: existingData.parents?.mother_maiden_last_name || '',
                    mother_middle_name: existingData.parents?.mother_middle_name || '',
                    mother_suffix: existingData.parents?.mother_suffix || '',

                    // Education Table
                    elementary_name: existingData.education?.elementary_name || '',
                    elementary_address: existingData.education?.elementary_address || '',
                    elementary_year: existingData.education?.elementary_year || '',
                    secondary_name: existingData.education?.secondary_name || '',
                    secondary_address: existingData.education?.secondary_address || '',
                    secondary_year: existingData.education?.secondary_year || ''
                });
            }
        } catch (error) {
            console.error("Failed to fetch existing data", error);
        } finally {
            setIsFetching(false);
        }
    };

    // --- Address Cascade Effects --- //
    useEffect(() => {
        setAddressOptions(prev => ({ ...prev, regions: getRegions() }));
    }, []);

    useEffect(() => {
        if (data.regionCode) {
            setAddressOptions(prev => ({ ...prev, provinces: getProvinces(data.regionCode) }));
        } else {
            setAddressOptions(prev => ({ ...prev, provinces: [], cities: [], barangays: [] }));
        }
    }, [data.regionCode]);

    useEffect(() => {
        if (data.provinceCode) {
            setAddressOptions(prev => ({ ...prev, cities: getCities(data.provinceCode) }));
        } else {
            setAddressOptions(prev => ({ ...prev, cities: [], barangays: [] }));
        }
    }, [data.provinceCode]);

    useEffect(() => {
        if (data.cityCode) {
            setAddressOptions(prev => ({ ...prev, barangays: getBarangays(data.cityCode) }));
        } else {
            setAddressOptions(prev => ({ ...prev, barangays: [] }));
        }
    }, [data.cityCode]);

    useEffect(() => {
        if (data.city) {
            const zipCodeData = getZipCode(data.city);
            setData(prev => ({ ...prev, zipCode: zipCodeData?.zip_code || '' }));
            if (zipCodeData) clearErrors('zipCode');
        }
    }, [data.city]);

    // --- Handlers --- //
    const handleChange = (e) => {
        const { name, value } = e.target;
        setData(name, value);

        if (value.trim() === '') {
            setError(name, 'This field is required.');
        } else {
            clearErrors(name);
        }
    };

    const handleRegionChange = (value) => {
        const region = addressOptions.regions.find(r => r.region_code === value);
        if (region) {
            setData(prev => ({
                ...prev,
                region: region.region_name, // Make sure you are setting the NAME
                regionCode: region.region_code,
                // ... clear subsequent levels
            }));
        }
    };

    const handleProvinceChange = (value) => {
        const province = addressOptions.provinces.find(p => p.province_code === value);
        if (province) {
            setData(prev => ({
                ...prev,
                province: province.province_name, // ADDED
                provinceCode: province.province_code,
                city: '', cityCode: '',
                barangay: '', barangayCode: '',
                zipCode: ''
            }));
            clearErrors('provinceCode');
        }
    };

    const handleCityChange = (value) => {
        const city = addressOptions.cities.find(c => c.city_code === value);
        if (city) {
            setData(prev => ({
                ...prev,
                city: city.city_name, // ADDED
                cityCode: city.city_code,
                barangay: '', barangayCode: '',
                zipCode: ''
            }));
            clearErrors('cityCode');
        }
    };

    const handleBarangayChange = (value) => {
        const barangay = addressOptions.barangays.find(b => b.barangay_code === value);
        if (barangay) {
            setData(prev => ({
                ...prev,
                barangay: barangay.barangay_name, // THIS IS THE MISSING PIECE
                barangayCode: barangay.barangay_code
            }));
            clearErrors('barangayCode');
        }
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


    const handleClose = () => {
        reset();
        clearErrors();
        onClose(false);
    };

    const handleSubmit = async (e) => {
        console.log(data);

        e.preventDefault();
        clearErrors();

        const requiredFields = [
            'gender', 'civil_status', 'birthday', 'contact_number', 'place_of_birth',
            'regionCode', 'provinceCode', 'cityCode', 'barangayCode',
            'father_first_name', 'father_last_name',
            'mother_first_name', 'mother_maiden_last_name',
            'elementary_name', 'elementary_address', 'elementary_year',
            'secondary_name', 'secondary_address', 'secondary_year',
        ];

        let hasFrontendErrors = false;

        requiredFields.forEach(field => {
            if (!data[field] || String(data[field]).trim() === '') {
                setError(field, 'This field is required.');
                hasFrontendErrors = true;
            }
        });

        if (hasFrontendErrors) return;

        setIsSubmitting(true);

        try {
            await axios.post(route('permanent-record.add-student-info', student?.id), data);
            await queryClient.invalidateQueries({ queryKey: ['permanent-record-student', student.id] });

            toast.success('Record saved successfully!');
            handleClose();

        } catch (error) {
            console.error("Error submitting form:", error);
            if (error.response && error.response.status === 422) {
                const backendErrors = error.response.data.errors;
                for (const field in backendErrors) {
                    setError(field, backendErrors[field][0]);
                }
            } else {
                toast.error("An unexpected error occurred. Please try again.");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AlertDialog open={open}>
            <AlertDialogContent className="sm:max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <AlertDialogHeader>
                    <AlertDialogTitle>
                        {isFetching ? "Loading Record..." : "Adding Record"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Student: {student ? formatName(student, { format: 'FML' }) : 'Unknown Student'}
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <Separator />

                {/* You can wrap this in a ternary to hide the form or dim it while fetching */}
                <div className={`space-y-8 py-4 transition-opacity duration-200 ${isFetching ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>

                    {/* Basic Info */}
                    <div className='flex flex-col gap-4'>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1 items-start">
                            <CFloatingInput
                                type="date"
                                name="birthday"
                                label="Birthday"
                                value={data.birthday}
                                onChange={handleChange}
                                error={errors.birthday}
                            />

                            <CFloatingInput
                                type="tel"
                                name="contact_number"
                                label="Contact Number"
                                value={formatPhoneNumber(data.contact_number)}
                                onChange={handleContactChange}
                                error={errors.contact_number}

                            />

                            <CFloatingInput
                                className="col-start-3 row-span-2"
                                type="text"
                                name="place_of_birth"
                                label="Place of Birth"
                                value={data.place_of_birth}
                                onChange={handleChange}
                                error={errors.place_of_birth}
                            />

                            <div className="flex flex-col space-y-1 h-[56px] justify-end">
                                <RequiredLabel>Gender</RequiredLabel>
                                <Select
                                    value={data.gender}
                                    onValueChange={(val) => {
                                        setData('gender', val);
                                        clearErrors('gender');
                                    }}
                                >
                                    {/* Matches the height and border styling of your standard inputs */}
                                    <SelectTrigger className={`h-[40px] ${errors.civil_status ? "border-destructive" : ""}`}>
                                        <SelectValue placeholder="Select gender" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Male">Male</SelectItem>
                                        <SelectItem value="Female">Female</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.civil_status && <p className="text-xs text-destructive mt-1">{errors.civil_status}</p>}
                            </div>

                            {/* Civil Status Container with fixed height to match CFloatingInput */}
                            <div className="flex flex-col space-y-1 h-[56px] justify-end">
                                <RequiredLabel>Civil Status</RequiredLabel>
                                <Select
                                    value={data.civil_status}
                                    onValueChange={(val) => {
                                        setData('civil_status', val);
                                        clearErrors('civil_status');
                                    }}
                                >
                                    {/* Matches the height and border styling of your standard inputs */}
                                    <SelectTrigger className={`h-[40px] ${errors.civil_status ? "border-destructive" : ""}`}>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Single">Single</SelectItem>
                                        <SelectItem value="Married">Married</SelectItem>
                                        <SelectItem value="Widowed">Widowed</SelectItem>
                                        <SelectItem value="Divorced">Divorced</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.civil_status && <p className="text-xs text-destructive mt-1">{errors.civil_status}</p>}
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-4">Current Address</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">

                            <div className="space-y-1">
                                <RequiredLabel>Region</RequiredLabel>
                                <Select value={data.regionCode} onValueChange={handleRegionChange}>
                                    <SelectTrigger className={cn(errors.regionCode ? "border-destructive" : "", "h-[4rem")}>
                                        <SelectValue placeholder="Select Region" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {addressOptions.regions.map(r => (
                                            <SelectItem key={r.region_code} value={r.region_code}>{r.region_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.regionCode && <p className="text-xs text-destructive">{errors.regionCode}</p>}
                            </div>

                            <div className="space-y-1">
                                <RequiredLabel>Province</RequiredLabel>
                                <Select value={data.provinceCode} onValueChange={handleProvinceChange} disabled={!data.regionCode}>
                                    <SelectTrigger className={cn(errors.provinceCode ? "border-destructive" : "", "h-[4rem")}>
                                        <SelectValue placeholder="Select Province" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {addressOptions.provinces.map(p => (
                                            <SelectItem key={p.province_code} value={p.province_code}>{p.province_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.provinceCode && <p className="text-xs text-destructive">{errors.provinceCode}</p>}
                            </div>

                            <div className="space-y-1">
                                <RequiredLabel>City / Municipality</RequiredLabel>
                                <Select value={data.cityCode} onValueChange={handleCityChange} disabled={!data.provinceCode}>
                                    <SelectTrigger className={cn(errors.cityCode ? "border-destructive" : "", "h-[4rem")}>
                                        <SelectValue placeholder="Select City" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {addressOptions.cities.map(c => (
                                            <SelectItem key={c.city_code} value={c.city_code}>{c.city_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.cityCode && <p className="text-xs text-destructive">{errors.cityCode}</p>}
                            </div>

                            <div className="space-y-1">
                                <RequiredLabel>Barangay</RequiredLabel>
                                <Select value={data.barangayCode} onValueChange={handleBarangayChange} disabled={!data.cityCode}>
                                    <SelectTrigger className={cn(errors.barangayCode ? "border-destructive" : "", "h-[44px]")}>
                                        <SelectValue placeholder="Select Barangay" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {addressOptions.barangays.map(b => (
                                            <SelectItem key={b.barangay_code} value={b.barangay_code}>{b.barangay_name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.barangayCode && <p className="text-xs text-destructive">{errors.barangayCode}</p>}
                            </div>

                            <div className="mt-6">
                                <CFloatingInput name="zipCode" label="Zip Code" value={data.zipCode} readOnly className="bg-muted" error={errors.zipCode} />
                            </div>

                            <div className="mt-6">
                                <CFloatingInput name="street" label="Street / House No." value={data.street} onChange={handleChange} error={errors.street} />
                            </div>
                        </div>
                    </div>

                    <Separator />

                    {/* Parents Information */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Parents Information</h3>

                        <h4 className="text-sm font-medium text-muted-foreground mb-4">Father's Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <CFloatingInput name="father_first_name" label="First Name" value={data.father_first_name} onChange={handleChange} error={errors.father_first_name} />
                            <CFloatingInput name="father_last_name" label="Last Name" value={data.father_last_name} onChange={handleChange} error={errors.father_last_name} />
                            <CFloatingInput name="father_middle_name" label="Middle Name" value={data.father_middle_name} onChange={handleChange} error={errors.father_middle_name} />
                            <CFloatingInput name="father_suffix" label="Suffix (e.g., Jr.)" value={data.father_suffix} onChange={handleChange} error={errors.father_suffix} />
                        </div>

                        <h4 className="text-sm font-medium text-muted-foreground mb-4">Mother's Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <CFloatingInput name="mother_first_name" label="First Name" value={data.mother_first_name} onChange={handleChange} error={errors.mother_first_name} />
                            <CFloatingInput name="mother_maiden_last_name" label="Maiden Last Name" value={data.mother_maiden_last_name} onChange={handleChange} error={errors.mother_maiden_last_name} />
                            <CFloatingInput name="mother_middle_name" label="Middle Name" value={data.mother_middle_name} onChange={handleChange} error={errors.mother_middle_name} />
                            <CFloatingInput name="mother_suffix" label="Suffix" value={data.mother_suffix} onChange={handleChange} error={errors.mother_suffix} />
                        </div>
                    </div>

                    <Separator />

                    {/* Educational Background */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4">Educational Background</h3>

                        <h4 className="text-sm font-medium text-muted-foreground mb-4">Elementary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 pt-1">
                            <CFloatingInput name="elementary_name" label="School Name" value={data.elementary_name} onChange={handleChange} error={errors.elementary_name} />
                            <CFloatingInput name="elementary_address" label="School Address" value={data.elementary_address} onChange={handleChange} error={errors.elementary_address} />
                            <CFloatingInput type="number" name="elementary_year" label="Year Graduated" value={data.elementary_year} onChange={handleChange} error={errors.elementary_year} />
                        </div>

                        <h4 className="text-sm font-medium text-muted-foreground mb-4">Secondary</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                            <CFloatingInput name="secondary_name" label="School Name" value={data.secondary_name} onChange={handleChange} error={errors.secondary_name} />
                            <CFloatingInput name="secondary_address" label="School Address" value={data.secondary_address} onChange={handleChange} error={errors.secondary_address} />
                            <CFloatingInput type="number" name="secondary_year" label="Year Graduated" value={data.secondary_year} onChange={handleChange} error={errors.secondary_year} />
                        </div>
                    </div>

                </div>

                <AlertDialogFooter className="sticky bottom-0 bg-background pt-4 pb-2 border-t mt-4 z-10">
                    <AlertDialogCancel onClick={handleClose} disabled={isSubmitting || isFetching}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction disabled={isSubmitting || isFetching} onClick={handleSubmit}>
                        {isSubmitting ? "Submitting..." : "Submit"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}