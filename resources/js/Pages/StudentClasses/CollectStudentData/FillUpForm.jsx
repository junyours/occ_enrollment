import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Card, CardContent } from '@/Components/ui/card'
import { Input } from '@/Components/ui/input'
import { Button } from '@/Components/ui/button'
import { Alert, AlertDescription } from '@/Components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { MapPin, Users, User, AlertCircle } from 'lucide-react'

import {
    getRegions,
    getProvinces,
    getCities,
    getBarangays,
    getZipCode,
} from '@/Lib/PhilippinesAddressData/AddressesFinder'
import { formatPhoneNumber } from '@/Lib/Utils'
import { router } from '@inertiajs/react'
import { toast } from 'sonner'

function FillUpForm({ open = true, setOpen = () => { } }) {
    const [formData, setFormData] = useState({
        street: '',
        barangay: '',
        barangayCode: '',
        city: '',
        cityCode: '',
        province: '',
        provinceCode: '',
        region: 'Region X (Northern Mindanao)',
        regionCode: '10',
        zipCode: '',

        suffix: '',
        nationality: '',
        religion: '',
        civilStatus: '',
        birthday: '',

        fatherFirstName: '',
        fatherLastName: '',
        fatherMiddleName: '',
        fatherSuffix: '',
        fatherContact: '09',

        motherFirstName: '',
        motherLastName: '',
        motherMiddleName: '',
        motherSuffix: '',
        motherContact: '09'
    })

    const [addressOptions, setAddressOptions] = useState({
        regions: [],
        provinces: [],
        cities: [],
        barangays: []
    })

    const [errors, setErrors] = useState({})
    const [currentSection, setCurrentSection] = useState(1)

    const [submitting, setSubmitting] = useState(false);

    // Load regions on mount
    useEffect(() => {
        setAddressOptions(prev => ({ ...prev, regions: getRegions() }))
    }, [])

    // Load provinces when region changes
    useEffect(() => {
        if (formData.regionCode) {
            const provinces = getProvinces(formData.regionCode)
            setAddressOptions(prev => ({ ...prev, provinces }))
        } else {
            setAddressOptions(prev => ({ ...prev, provinces: [], cities: [], barangays: [] }))
        }
    }, [formData.regionCode])

    // Load cities when province changes
    useEffect(() => {
        if (formData.provinceCode) {
            const cities = getCities(formData.provinceCode)
            setAddressOptions(prev => ({ ...prev, cities }))
        } else {
            setAddressOptions(prev => ({ ...prev, cities: [], barangays: [] }))
        }
    }, [formData.provinceCode])

    // Load barangays when city changes
    useEffect(() => {
        if (formData.cityCode) {
            const barangays = getBarangays(formData.cityCode)
            setAddressOptions(prev => ({ ...prev, barangays }))
        } else {
            setAddressOptions(prev => ({ ...prev, barangays: [] }))
        }
    }, [formData.cityCode])

    // Get zip code when barangay changes
    useEffect(() => {
        if (formData.city) {

            const zipCode = getZipCode(formData.city)

            setFormData(prev => ({
                ...prev,
                zipCode: zipCode?.zip_code
            }));

            if (zipCode != null) setErrors(prev => ({ ...prev, zipCode: false }))
        }
    }, [formData.city])

    const handleRegionChange = (value) => {
        const region = addressOptions.regions.find(r => r.region_code === value)
        if (region) {
            setFormData(prev => ({
                ...prev,
                region: region.region_name,
                regionCode: region.region_code,
                province: '',
                provinceCode: '',
                city: '',
                cityCode: '',
                barangay: '',
                barangayCode: '',
                zipCode: ''
            }))
            if (errors.region) {
                setErrors(prev => ({ ...prev, region: '' }))
            }
        }
    }

    const handleProvinceChange = (value) => {
        const province = addressOptions.provinces.find(p => p.province_code === value)
        if (province) {
            setFormData(prev => ({
                ...prev,
                province: province.province_name,
                provinceCode: province.province_code,
                city: '',
                cityCode: '',
                barangay: '',
                barangayCode: '',
                zipCode: ''
            }))
            if (errors.province) {
                setErrors(prev => ({ ...prev, province: '' }))
            }
        }
    }

    const handleCityChange = (value) => {
        const city = addressOptions.cities.find(c => c.city_code === value)
        if (city) {
            setFormData(prev => ({
                ...prev,
                city: city.city_name,
                cityCode: city.city_code,
                barangay: '',
                barangayCode: '',
                zipCode: ''
            }))
            if (errors.city) {
                setErrors(prev => ({ ...prev, city: '' }))
            }
        }
    }

    const handleBarangayChange = (value) => {
        const barangay = addressOptions.barangays.find(b => b.barangay_code === value)
        if (barangay) {
            setFormData(prev => ({
                ...prev,
                barangay: barangay.barangay_name,
                barangayCode: barangay.barangay_code
            }))
            if (errors.barangay) {
                setErrors(prev => ({ ...prev, barangay: '' }))
            }
        }
    }

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    const validateSection = (section) => {
        const newErrors = {}

        if (section === 2) {
            if (!formData.region) newErrors.region = true
            if (!formData.province) newErrors.province = true
            if (!formData.city) newErrors.city = true
            if (!formData.barangay) newErrors.barangay = true
            if (!formData.zipCode) newErrors.zipCode = true
        }

        if (section === 3) {
            if (!formData.fatherFirstName) newErrors.fatherFirstName = true
            if (!formData.fatherLastName) newErrors.fatherLastName = true
            if (formData.fatherContact.length < 11) newErrors.fatherContact = true

            if (!formData.motherFirstName) newErrors.motherFirstName = true
            if (!formData.motherLastName) newErrors.motherLastName = true
            if (formData.motherContact.length < 11) newErrors.motherContact = true
        }

        if (section === 1) {
            if (!formData.nationality) newErrors.nationality = true
            if (!formData.civilStatus) newErrors.civilStatus = true
            if (!formData.birthday) newErrors.birthday = true
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleNext = () => {
        if (validateSection(currentSection)) {
            setCurrentSection(prev => Math.min(prev + 1, 3))
        }
    }

    const handleBack = () => {
        setCurrentSection(prev => Math.max(prev - 1, 1))
    }

    const handleSubmit = () => {
        setSubmitting(true);
        if (validateSection(currentSection)) {
            router.post(route('update-additional-info'), {
                ...formData
            }, {
                preserveScroll: true,
                onSuccess: () => toast.success("Success!"),
                onError: () => { setSubmitting(false); toast.error("Failed to submit"); },
                onFinish: () => { setSubmitting(false); setOpen(false); }
            });

        }
    }

    const getSectionIcon = (section) => {
        switch (section) {
            case 1: return MapPin
            case 2: return Users
            case 3: return User
            default: return null
        }
    }

    const isSectionComplete = (section) => {
        if (section === 2) {
            return formData.region && formData.province && formData.city && formData.barangay
        }
        if (section === 3) {
            return true
        }
        if (section === 1) {
            return formData.nationality
        }
        return false
    }

    const handleContactChange = (field, value) => {

        if (value.length <= 11 && isNaN(value)) {
            return
        }

        if (value.length > 13) {
            return
        }

        // Reset if blank
        if (value.trim() === '') {
            setErrors(prev => ({ ...prev, [field]: false }));
            setFormData(prev => ({ ...prev, [field]: '09' }));
            return;
        }

        // Must start with 09
        if (!value.startsWith('09')) return;

        // Valid input, clear error
        setErrors(prev => ({ ...prev, [field]: false }));
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="h-[100dvh] w-full max-w-full p-0 gap-0 rounded-none sm:rounded-xl sm:h-auto sm:max-w-2xl">
                {/* Progress Steps */}
                <div className="px-6 py-4 border-b bg-muted/30 max-h-min">
                    <div className="flex items-center justify-between">
                        {[1, 2, 3].map((step) => {
                            const Icon = getSectionIcon(step)
                            const isActive = currentSection === step
                            const isComplete = currentSection > step || isSectionComplete(step)

                            return (
                                <React.Fragment key={step}>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isActive ? 'bg-primary text-primary-foreground shadow-lg scale-110 ring-4 ring-primary/20' :
                                            isComplete ? 'bg-green-600 text-white shadow-md' :
                                                'bg-muted text-muted-foreground'
                                            }`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <span className={`text-xs font-semibold ${isActive ? 'text-primary' : isComplete ? 'text-green-600' : 'text-muted-foreground'
                                            }`}>
                                            {step === 2 ? 'Address' : step === 3 ? 'Parents' : 'Personal'}
                                        </span>
                                    </div>
                                    {step < 3 && (
                                        <div className={`flex-1 h-1 mx-2 rounded-full transition-all duration-300 ${currentSection > step ? 'bg-gradient-to-r from-green-600 to-green-500' : 'bg-border'
                                            }`} />
                                    )}
                                </React.Fragment>
                            )
                        })}
                    </div>
                </div>

                <Card className="border-none shadow-none flex-1 flex flex-col h-full">
                    <CardContent className="px-6 py-4 flex-1 overflow-y-auto overscroll-contain">
                        {/* Section 1: Address */}
                        {currentSection === 2 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex items-center gap-3 pb-4 border-b">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-md">
                                        <MapPin className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-lg">Present Address</h3>
                                        <p className="text-sm text-muted-foreground truncate">Where do you currently reside?</p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">
                                            Street
                                        </label>
                                        <Input
                                            placeholder="e.g., 123 Main Street, Zone 7"
                                            value={formData.street}
                                            onChange={(e) => handleInputChange('street', e.target.value)}
                                            className="text-base"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">
                                            Province <span className="text-destructive">*</span>
                                        </label>
                                        <Select
                                            value={formData.provinceCode}
                                            onValueChange={handleProvinceChange}
                                            disabled={!formData.regionCode}
                                        >
                                            <SelectTrigger className={`text-base ${errors.province ? 'border-destructive' : ''}`}>
                                                <SelectValue placeholder="Select your province" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {addressOptions.provinces.map((province) => (
                                                    <SelectItem key={province.province_code} value={province.province_code}>
                                                        {province.province_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">
                                            City/Municipality <span className="text-destructive">*</span>
                                        </label>
                                        <Select
                                            value={formData.cityCode}
                                            onValueChange={handleCityChange}
                                            disabled={!formData.provinceCode}
                                        >
                                            <SelectTrigger className={`text-base ${errors.city ? 'border-destructive' : ''}`}>
                                                <SelectValue placeholder="Select your city" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {addressOptions.cities.map((city) => (
                                                    <SelectItem key={city.city_code} value={city.city_code}>
                                                        {city.city_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">
                                            Barangay <span className="text-destructive">*</span>
                                        </label>
                                        <Select
                                            value={formData.barangayCode}
                                            onValueChange={handleBarangayChange}
                                            disabled={!formData.cityCode}
                                        >
                                            <SelectTrigger className={`text-base ${errors.barangay ? 'border-destructive' : ''}`}>
                                                <SelectValue placeholder="Select your barangay" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {addressOptions.barangays.map((barangay) => (
                                                    <SelectItem key={barangay.barangay_code} value={barangay.barangay_code}>
                                                        {barangay.barangay_name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">
                                            Zip code <span className="text-destructive">*</span>
                                        </label>
                                        <Input
                                            placeholder="Zip code"
                                            value={formData.zipCode}
                                            onChange={(e) => handleInputChange('zipCode', e.target.value)}
                                            className={`text-base bg-white dark:bg-background ${errors.zipCode ? 'border-destructive' : ''}`}
                                        />
                                    </div>

                                    <div className="h-20" />
                                </div>
                            </div>
                        )}

                        {/* Section 2: Parents */}
                        {currentSection === 3 && (
                            <div className="space-y-4 animate-in fade-in duration-300 ">
                                <div className="flex items-center gap-3 pb-4 border-b">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-md">
                                        <Users className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-lg">Parents Information</h3>
                                        <p className="text-sm text-muted-foreground truncate">Contact details</p>
                                    </div>
                                </div>
                                <div className='max-h-[calc(100vh-22rem)] min-h-[calc(100vh-22rem)]
                                    sm:h-auto sm:min-h-0 sm:max-h-none
                                    overflow-x-auto sm:p-0 h-min sm:w-auto
                                    overflow-auto
                                    space-y-4 px-2'>
                                    {/* Father Info */}
                                    <div className="space-y-4 p-5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-md">
                                                F
                                            </div>
                                            <p className="font-bold text-lg">Father's Information</p>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium mb-1.5 block">
                                                        First Name  <span className="text-destructive">*</span>
                                                    </label>
                                                    <Input
                                                        placeholder="First name"
                                                        value={formData.fatherFirstName}
                                                        onChange={(e) => handleInputChange('fatherFirstName', e.target.value)}
                                                        className={`text-base bg-white dark:bg-background ${errors.fatherFirstName ? 'border-destructive' : ''}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1.5 block">
                                                        Last Name <span className="text-destructive">*</span>
                                                    </label>
                                                    <Input
                                                        placeholder="Last name"
                                                        value={formData.fatherLastName}
                                                        onChange={(e) => handleInputChange('fatherLastName', e.target.value)}
                                                        className={`text-base bg-white dark:bg-background ${errors.fatherLastName ? 'border-destructive' : ''}`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium mb-1.5 block">Middle Name</label>
                                                    <Input
                                                        placeholder="Middle name"
                                                        value={formData.fatherMiddleName}
                                                        onChange={(e) => handleInputChange('fatherMiddleName', e.target.value)}
                                                        className={`text-base bg-white dark:bg-background`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1.5 block">Suffix</label>
                                                    <Select
                                                        value={formData.fatherSuffix}
                                                        onValueChange={(value) => handleInputChange('fatherSuffix', value)}
                                                    >
                                                        <SelectTrigger className={`text-base bg-white dark:bg-background`}>
                                                            <SelectValue placeholder="Select suffix" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Jr">Jr</SelectItem>
                                                            <SelectItem value="Sr">Sr</SelectItem>
                                                            <SelectItem value="II">II</SelectItem>
                                                            <SelectItem value="III">III</SelectItem>
                                                            <SelectItem value="IV">IV</SelectItem>
                                                            <SelectItem value="V">V</SelectItem>
                                                            <SelectItem value="None">None</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium mb-1.5 block">
                                                    Contact Number <span className="text-destructive">*</span>
                                                </label>
                                                <Input
                                                    placeholder=""
                                                    value={formatPhoneNumber(formData.fatherContact)}
                                                    onChange={(e) => handleContactChange('fatherContact', e.target.value)}
                                                    className={`text-base bg-white dark:bg-background ${errors.fatherContact ? 'border-destructive' : ''}`}
                                                    type="tel"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Mother Info */}
                                    <div className="space-y-4 p-5 rounded-xl bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-md">
                                                M
                                            </div>
                                            <p className="font-bold text-lg">Mother's Information</p>
                                        </div>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium mb-1.5 block">
                                                        First Name <span className="text-destructive">*</span>
                                                    </label>
                                                    <Input
                                                        placeholder="First name"
                                                        value={formData.motherFirstName}
                                                        onChange={(e) => handleInputChange('motherFirstName', e.target.value)}
                                                        className={`text-base bg-white dark:bg-background ${errors.motherFirstName ? 'border-destructive' : ''}`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1.5 block">
                                                        Maiden Last Name <span className="text-destructive">*</span>
                                                    </label>
                                                    <Input
                                                        placeholder="Maiden last name"
                                                        value={formData.motherLastName}
                                                        onChange={(e) => handleInputChange('motherLastName', e.target.value)}
                                                        className={`text-base bg-white dark:bg-background ${errors.motherLastName ? 'border-destructive' : ''}`}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-sm font-medium mb-1.5 block"> Maiden Middle Name</label>
                                                    <Input
                                                        placeholder="Maiden Middle name"
                                                        value={formData.motherMiddleName}
                                                        onChange={(e) => handleInputChange('motherMiddleName', e.target.value)}
                                                        className={`text-base bg-white dark:bg-background`}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-sm font-medium mb-1.5 block">Suffix</label>
                                                    <Select
                                                        value={formData.motherSuffix}
                                                        onValueChange={(value) => handleInputChange('motherSuffix', value)}
                                                    >
                                                        <SelectTrigger className={`text-base bg-white dark:bg-background`}>
                                                            <SelectValue placeholder="Select suffix" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Jr">Jr</SelectItem>
                                                            <SelectItem value="Sr">Sr</SelectItem>
                                                            <SelectItem value="II">II</SelectItem>
                                                            <SelectItem value="III">III</SelectItem>
                                                            <SelectItem value="IV">IV</SelectItem>
                                                            <SelectItem value="V">V</SelectItem>
                                                            <SelectItem value="None">None</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium mb-1.5 block">
                                                    Contact Number <span className="text-destructive">*</span>
                                                </label>
                                                <Input
                                                    placeholder="+63 XXX XXX XXXX"
                                                    value={formatPhoneNumber(formData.motherContact)}
                                                    onChange={(e) => handleContactChange('motherContact', e.target.value)}
                                                    className={`text-base bg-white dark:bg-background ${errors.motherContact ? 'border-destructive' : ''}`}
                                                    type="tel"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Section 3: Personal Information */}
                        {currentSection === 1 && (
                            <div className="space-y-6 animate-in fade-in duration-300">
                                <div className="flex items-center gap-3 pb-4 border-b">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 shadow-md">
                                        <User className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="font-bold text-lg">Personal Information</h3>
                                        <p className="text-sm text-muted-foreground truncate">Additional details about you</p>
                                    </div>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">
                                            Nationality <span className="text-destructive">*</span>
                                        </label>
                                        <Input
                                            placeholder="e.g., Filipino"
                                            value={formData.nationality}
                                            onChange={(e) => handleInputChange('nationality', e.target.value)}
                                            className={`text-base ${errors.nationality ? 'border-destructive' : ''}`}
                                        />
                                        {errors.nationality && (
                                            <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors.nationality}
                                            </p>
                                        )}
                                    </div>

                                    {/* Birthday */}
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">
                                            Birthday <span className="text-destructive">*</span>
                                        </label>
                                        <Input
                                            type="date"
                                            value={formData.birthday}
                                            onChange={(e) => handleInputChange('birthday', e.target.value)}
                                            className={`text-base ${errors.birthday ? 'border-destructive' : ''}`}
                                        />
                                        {errors.birthday && (
                                            <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors.birthday}
                                            </p>
                                        )}
                                    </div>

                                    {/* Civil Status */}
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">
                                            Civil Status <span className="text-destructive">*</span>
                                        </label>
                                        <Select
                                            value={formData.civilStatus}
                                            onValueChange={(value) => handleInputChange('civilStatus', value)}
                                        >
                                            <SelectTrigger className={`text-base bg-white dark:bg-background ${errors.civilStatus ? 'border-destructive' : ''}`}>
                                                <SelectValue placeholder="Select civil status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Single">Single</SelectItem>
                                                <SelectItem value="Married">Married</SelectItem>
                                                <SelectItem value="Widowed">Widowed</SelectItem>
                                                <SelectItem value="Separated">Separated</SelectItem>
                                                <SelectItem value="Divorced">Divorced</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        {errors.civilStatus && (
                                            <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {errors.civilStatus}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">
                                            Suffix
                                        </label>
                                        <Select
                                            value={formData.suffix}
                                            onValueChange={(value) => handleInputChange('suffix', value)}
                                        >
                                            <SelectTrigger className={`text-base bg-white dark:bg-background ${errors.fatherFirstName ? 'border-destructive' : ''}`}>
                                                <SelectValue placeholder="Select suffix" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Jr">Jr</SelectItem>
                                                <SelectItem value="Sr">Sr</SelectItem>
                                                <SelectItem value="II">II</SelectItem>
                                                <SelectItem value="III">III</SelectItem>
                                                <SelectItem value="IV">IV</SelectItem>
                                                <SelectItem value="V">V</SelectItem>
                                                <SelectItem value="None">None</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        <p className="text-xs text-muted-foreground mt-1.5">
                                            Optional: Add a suffix if applicable
                                        </p>
                                    </div>


                                    <div>
                                        <label className="text-sm font-medium mb-1.5 block">
                                            Religion
                                        </label>
                                        <Input
                                            placeholder="e.g., Roman Catholic, Islam, etc."
                                            value={formData.religion}
                                            onChange={(e) => handleInputChange('religion', e.target.value)}
                                            className="text-base"
                                        />
                                        <p className="text-xs text-muted-foreground mt-1.5">
                                            Optional: Specify your religious affiliation
                                        </p>
                                    </div>


                                    <div className="h-24" />
                                </div>
                            </div>
                        )}
                    </CardContent>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between p-6 border-t bg-gradient-to-r from-muted/30 to-muted/50">
                        <Button
                            variant="outline"
                            onClick={currentSection === 1 ? () => setOpen(false) : handleBack}
                            className="px-8 h-11 font-medium"
                        >
                            {currentSection === 1 ? 'Cancel' : 'Back'}
                        </Button>

                        <div className="text-sm font-semibold text-muted-foreground">
                            Step {currentSection} of 3
                        </div>

                        <Button
                            disabled={submitting}
                            onClick={currentSection === 3 ? handleSubmit : handleNext}
                            className="px-8 h-11 font-medium bg-primary hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
                        >
                            {currentSection === 3 ? 'Submit' : 'Next'}
                        </Button>
                    </div>
                </Card>
            </DialogContent>
        </Dialog>
    )
}

export default FillUpForm