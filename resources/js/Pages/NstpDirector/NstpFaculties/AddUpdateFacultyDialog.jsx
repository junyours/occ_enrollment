import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
} from "@/Components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/ui/select";
import { Button } from "@/Components/ui/button";
import { Calendar } from "@/Components/ui/calendar";
import { Input } from "@/Components/ui/input";
import { Label } from "@/Components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/Components/ui/popover";
import { Field, FieldGroup } from "@/Components/ui/field";
import { useForm } from "@inertiajs/react";
import { formatPhoneNumber, isValidEmail } from "@/Lib/Utils";
import {
    getRegions,
    getProvinces,
    getCities,
    getBarangays,
    getZipCode,
} from "@/Lib/PhilippinesAddressData/AddressesFinder";
import { format, isValid, parseISO } from "date-fns";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import CredentialsCard from "./CredentialsCard";
import { Plus, Lock, Eye, EyeOff, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

const STEPS = [
    {
        title: "Name",
        fields: ["first_name", "middle_name", "last_name"],
    },
    {
        title: "Personal details",
        fields: ["email_address", "gender", "birthday"],
    },
    {
        title: "Contact and address",
        fields: ["contact_number", "present_address", "zip_code"],
    },
];

const PROFILE_FIELDS = STEPS.flatMap((step) => step.fields);
const ADDRESS_FIELDS = ["region", "province", "city", "barangay"];

function Required() {
    return <span aria-hidden="true" className="text-destructive">*</span>;
}

function fieldClass(error) {
    return error ? "border-destructive" : "";
}

function getEmptyAddress() {
    return {
        street: "",
        region: "Region X (Northern Mindanao)",
        regionCode: "10",
        province: "",
        provinceCode: "",
        city: "",
        cityCode: "",
        barangay: "",
        barangayCode: "",
    };
}

function hasStructuredAddress(faculty) {
    return ADDRESS_FIELDS.every((field) => faculty?.[`${field}_code`] && faculty?.[field]);
}

function getAddressData(faculty) {
    if (!hasStructuredAddress(faculty)) return getEmptyAddress();
    return {
        street: faculty.street ?? "",
        ...Object.fromEntries(ADDRESS_FIELDS.flatMap((field) => [
            [field, faculty[field]],
            [`${field}Code`, String(faculty[`${field}_code`])],
        ])),
    };
}

function formatAddress(address) {
    if (ADDRESS_FIELDS.some((field) => !address[`${field}Code`])) return "";
    return [
        address.street.trim(),
        address.barangay,
        address.city,
        address.province,
        address.region,
    ].filter(Boolean).join(", ");
}

function getFormData(faculty) {
    return {
        id: faculty?.id ?? null,
        user_role: faculty?.user_role ?? null,
        user_id_no: faculty?.user_id_no ?? null,
        first_name: faculty?.first_name ?? "",
        middle_name: faculty?.middle_name ?? "",
        last_name: faculty?.last_name ?? "",
        gender: faculty?.gender ?? "",
        birthday: faculty?.birthday?.slice(0, 10) ?? "",
        contact_number: String(faculty?.contact_number ?? "09").replace(/-/g, "") || "09",
        email_address: faculty?.email_address ?? faculty?.email ?? "",
        present_address: faculty?.has_present_address === false ? "" : faculty?.present_address ?? "",
        zip_code: String(faculty?.zip_code ?? ""),
    };
}

function getToday() {
    const date = new Date();
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
    ].join("-");
}

function normalizeErrors(serverErrors = {}) {
    return Object.fromEntries(
        Object.entries(serverErrors).map(([field, message]) => [
            field === "email" ? "email_address"
                : ADDRESS_FIELDS.includes(field.replace(/_code$/, ""))
                    ? field.replace(/_code$/, "") : field,
            Array.isArray(message) ? message[0] : message,
        ]),
    );
}

function validateFields(data, fields) {
    const validationErrors = {};

    fields.forEach((field) => {
        if (field !== "middle_name" && !String(data[field] ?? "").trim()) {
            validationErrors[field] = "This field is required";
        }
    });

    if (
        fields.includes("email_address") &&
        data.email_address.trim() &&
        !isValidEmail(data.email_address.trim())
    ) {
        validationErrors.email_address = "Please enter a valid email address";
    }

    if (
        fields.includes("contact_number") &&
        !/^09\d{9}$/.test(data.contact_number)
    ) {
        validationErrors.contact_number = "Enter an 11-digit contact number starting with 09";
    }

    if (fields.includes("birthday") && data.birthday) {
        const date = new Date(`${data.birthday}T00:00:00.000Z`);
        const isValidDate =
            /^\d{4}-\d{2}-\d{2}$/.test(data.birthday) &&
            !Number.isNaN(date.getTime()) &&
            date.toISOString().slice(0, 10) === data.birthday;

        if (!isValidDate) {
            validationErrors.birthday = "Please enter a valid birthday";
        } else if (data.birthday > getToday()) {
            validationErrors.birthday = "Birthday cannot be in the future";
        }
    }

    return validationErrors;
}

function AddUpdateFacultyDialog({
    open,
    setOpen,
    facultyId = null,
    refetch,
}) {
    const formId = useId();
    const [step, setStep] = useState(0);
    const [activeSection, setActiveSection] = useState("profile");
    const profileTabRef = useRef(null);
    const securityTabRef = useRef(null);
    const [submitting, setSubmitting] = useState(false);
    const [addingSuccess, setAddingSuccess] = useState(false);
    const [credentials, setCredentials] = useState({});
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    const [birthdayOpen, setBirthdayOpen] = useState(false);
    const [address, setAddress] = useState(getEmptyAddress());
    const [replaceAddress, setReplaceAddress] = useState(false);
    const [selectedFaculty, setSelectedFaculty] = useState(null);
    const [loadedFacultyId, setLoadedFacultyId] = useState(null);
    const [loading, setLoading] = useState(Boolean(facultyId));
    const [loadError, setLoadError] = useState("");
    const [loadVersion, setLoadVersion] = useState(0);
    const detailsReady = !facultyId || String(loadedFacultyId) === String(facultyId);
    const busy = submitting || passwordSubmitting || loading || !detailsReady;

    const regions = useMemo(() => getRegions() ?? [], []);
    const provinces = useMemo(
        () => address.regionCode ? getProvinces(address.regionCode) ?? [] : [],
        [address.regionCode],
    );
    const cities = useMemo(
        () => address.provinceCode ? getCities(address.provinceCode) ?? [] : [],
        [address.provinceCode],
    );
    const barangays = useMemo(
        () => address.cityCode ? getBarangays(address.cityCode) ?? [] : [],
        [address.cityCode],
    );
    const needsAddressRecord = Boolean(facultyId) && selectedFaculty?.has_present_address === false;
    const hasSavedAddress = Boolean(selectedFaculty?.present_address?.trim()) &&
        !hasStructuredAddress(selectedFaculty) && !needsAddressRecord;
    const editingAddress = !hasSavedAddress || replaceAddress;

    const { data, setData, errors, setError, clearErrors } = useForm(getFormData());
    const {
        data: passwordData,
        setData: setPasswordData,
        errors: passwordErrors,
        setError: setPasswordError,
        clearErrors: clearPasswordErrors,
        reset: resetPasswordForm,
    } = useForm({
        password: "",
        password_confirmation: "",
    });

    useEffect(() => {
        if (!open) return;

        const controller = new AbortController();
        setSelectedFaculty(null);
        setLoadedFacultyId(null);
        setLoadError("");
        setData(getFormData());
        clearErrors();
        setStep(0);
        setAddingSuccess(false);
        setCredentials({});
        setBirthdayOpen(false);
        setAddress(getEmptyAddress());
        setReplaceAddress(false);
        setActiveSection("profile");
        resetPasswordForm();
        clearPasswordErrors();
        setShowPassword(false);
        setShowPasswordConfirm(false);
        if (!facultyId) {
            setLoading(false);
            return () => controller.abort();
        }

        setLoading(true);
        const loadFaculty = async () => {
            try {
                const response = await axios.get(
                    route("nstp-director.faculty-details", { id: facultyId }),
                    { signal: controller.signal, headers: { Accept: "application/json" } },
                );
                if (controller.signal.aborted) return;
                const faculty = response.data.faculty;
                if (!faculty || String(faculty.id) !== String(facultyId)) {
                    throw new Error("The server returned an unexpected faculty record.");
                }
                setSelectedFaculty(faculty);
                setData(getFormData(faculty));
                setAddress(getAddressData(faculty));
                setLoadedFacultyId(faculty.id);
            } catch (error) {
                if (controller.signal.aborted) return;
                setLoadError(error.response?.data?.message || error.message || "Unable to load faculty details.");
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        };
        loadFaculty();
        return () => controller.abort();
    }, [open, facultyId, loadVersion, setData, clearErrors, resetPasswordForm, clearPasswordErrors]);

    const resetFacultyForm = () => {
        setSelectedFaculty(null);
        setLoadedFacultyId(null);
        setData(getFormData());
        clearErrors();
        setStep(0);
        setAddingSuccess(false);
        setCredentials({});
        setBirthdayOpen(false);
        setAddress(getEmptyAddress());
        setReplaceAddress(false);
        setActiveSection("profile");
        resetPasswordFields();
    };

    const closeFacultyDialog = () => {
        setOpen(false);
        resetFacultyForm();
    };

    const handleClose = () => {
        if (!submitting && !passwordSubmitting) closeFacultyDialog();
    };

    const resetPasswordFields = () => {
        resetPasswordForm();
        clearPasswordErrors();
        setShowPassword(false);
        setShowPasswordConfirm(false);
    };

    const changeSection = (section) => {
        if (busy) return;
        setBirthdayOpen(false);
        setActiveSection(section);
    };

    const handleTabKeyDown = (event) => {
        let section;
        if (event.key === "Home") section = "profile";
        else if (event.key === "End") section = "security";
        else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            section = activeSection === "profile" ? "security" : "profile";
        } else return;
        event.preventDefault();
        if (busy) return;
        changeSection(section);
        (section === "profile" ? profileTabRef : securityTabRef).current?.focus();
    };

    const handleOnchange = (event) => {
        const { name, value } = event.target;
        setData(name, value);
        clearErrors(name);
    };

    const handleContactChange = (event) => {
        const value = event.target.value.replace(/-/g, "");

        if (value === "") {
            setData("contact_number", "09");
            setError("contact_number", "Enter an 11-digit contact number starting with 09");
            return;
        }

        // Preserve the 09 prefix and allow up to 11 digits while typing.
        if (!/^09\d{0,9}$/.test(value)) return;

        setData("contact_number", value);
        clearErrors("contact_number");
    };

    const updateAddress = (nextAddress, zipCode) => {
        setAddress(nextAddress);
        setData({
            ...data,
            present_address: formatAddress(nextAddress),
            ...(zipCode !== undefined ? { zip_code: String(zipCode) } : {}),
        });
        clearErrors("present_address");
        if (zipCode !== undefined) clearErrors("zip_code");
    };

    const handleRegionChange = (value) => {
        const region = regions.find((item) => String(item.region_code) === value);
        if (!region) return;
        updateAddress({
            ...getEmptyAddress(),
            street: address.street,
            region: region.region_name,
            regionCode: String(region.region_code),
        }, "");
        clearErrors(...ADDRESS_FIELDS);
    };

    const handleProvinceChange = (value) => {
        const province = provinces.find((item) => String(item.province_code) === value);
        if (!province) return;
        updateAddress({
            ...address,
            province: province.province_name,
            provinceCode: String(province.province_code),
            city: "",
            cityCode: "",
            barangay: "",
            barangayCode: "",
        }, "");
        clearErrors("province", "city", "barangay");
    };

    const handleCityChange = (value) => {
        const city = cities.find((item) => String(item.city_code) === value);
        if (!city) return;
        updateAddress({
            ...address,
            city: city.city_name,
            cityCode: String(city.city_code),
            barangay: "",
            barangayCode: "",
        }, getZipCode(city.city_name)?.zip_code ?? "");
        clearErrors("city", "barangay");
    };

    const handleBarangayChange = (value) => {
        const barangay = barangays.find((item) => String(item.barangay_code) === value);
        if (!barangay) return;
        updateAddress({
            ...address,
            barangay: barangay.barangay_name,
            barangayCode: String(barangay.barangay_code),
        });
        clearErrors("barangay");
    };

    const startAddressChange = () => {
        setAddress(getEmptyAddress());
        setReplaceAddress(true);
        setData({ ...data, present_address: "", zip_code: "" });
        clearErrors(...ADDRESS_FIELDS, "present_address", "zip_code");
    };

    const keepSavedAddress = () => {
        setAddress(getEmptyAddress());
        setReplaceAddress(false);
        setData({
            ...data,
            present_address: selectedFaculty.present_address,
            zip_code: String(selectedFaculty.zip_code ?? ""),
        });
        clearErrors(...ADDRESS_FIELDS, "present_address", "zip_code");
    };

    const handlePasswordChange = (event) => {
        const { name, value } = event.target;
        setPasswordData(name, value);
        clearPasswordErrors(name);
    };

    const showValidationErrors = (validationErrors) => {
        setError(validationErrors);
        const errorStep = STEPS.findIndex(({ fields }) =>
            fields.some((field) => validationErrors[field]),
        );
        if (errorStep !== -1) setStep(errorStep);
        else if (ADDRESS_FIELDS.some((field) => validationErrors[field])) {
            setStep(STEPS.length - 1);
        }
    };

    const handleNext = () => {
        const validationErrors = validateFields(data, STEPS[step].fields);
        clearErrors(...STEPS[step].fields);

        if (Object.keys(validationErrors).length) {
            setError(validationErrors);
            return;
        }

        setStep((currentStep) => Math.min(currentStep + 1, STEPS.length - 1));
    };

    const submit = async (event) => {
        event.preventDefault();
        if (busy || addingSuccess || activeSection !== "profile") return;

        // Enter on either earlier step advances without creating a record.
        if (step < STEPS.length - 1) {
            handleNext();
            return;
        }

        clearErrors();
        const validationErrors = validateFields(data, PROFILE_FIELDS);
        if (editingAddress) {
            ADDRESS_FIELDS.forEach((field) => {
                if (!address[`${field}Code`]) {
                    validationErrors[field] = "This field is required";
                }
            });
        }

        if (Object.keys(validationErrors).length) {
            showValidationErrors(validationErrors);
            return;
        }

        const payload = {
            ...(facultyId ? { id: facultyId } : {}),
            ...Object.fromEntries(
                PROFILE_FIELDS.map((field) => [field, data[field].trim()]),
            ),
            address_mode: editingAddress ? "structured" : "keep",
            ...(editingAddress ? {
                street: address.street.trim(),
                ...Object.fromEntries(ADDRESS_FIELDS.flatMap((field) => [
                    [field, address[field]],
                    [`${field}_code`, address[`${field}Code`]],
                ])),
            } : {}),
        };

        const url = facultyId
            ? route("nstp-director.update-nstp-faculty")
            : route("nstp-director.create-nstp-faculty");

        setSubmitting(true);
        try {
            const response = await axios.post(url, payload);

            if (response.data.success) {
                toast.success(response.data.success);
                if (response.data.warning) toast.error(response.data.warning);
                refetch();
                if (response.data.credentials) {
                    if (response.data.faculty) setData(getFormData(response.data.faculty));
                    setCredentials(response.data.credentials);
                    setAddingSuccess(true);
                } else {
                    closeFacultyDialog();
                }
            } else {
                toast.error(response.data.message || "Unable to save the faculty");
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                showValidationErrors(normalizeErrors(error.response.data.errors));
            } else {
                toast.error(error.response?.data?.message || "An error occurred");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const submitPassword = async (event) => {
        event.preventDefault();
        if (busy || activeSection !== "security" || !selectedFaculty?.id) return;
        clearPasswordErrors();

        const validationErrors = {};
        if (!passwordData.password) {
            validationErrors.password = "This field is required";
        } else if (passwordData.password.length < 8) {
            validationErrors.password = "Password must be at least 8 characters";
        }

        if (!passwordData.password_confirmation) {
            validationErrors.password_confirmation = "This field is required";
        } else if (passwordData.password !== passwordData.password_confirmation) {
            validationErrors.password_confirmation = "Passwords do not match";
        }

        if (Object.keys(validationErrors).length) {
            setPasswordError(validationErrors);
            return;
        }

        setPasswordSubmitting(true);
        try {
            const response = await axios.post(
                route("nstp-director.change-faculty-password"),
                { ...passwordData, id: selectedFaculty.id },
            );

            if (response.data.success) {
                toast.success(response.data.success);
                resetPasswordFields();
            } else {
                toast.error(response.data.message || "Unable to change the password");
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                setPasswordError(normalizeErrors(error.response.data.errors));
            } else {
                toast.error(error.response?.data?.message || "An error occurred");
            }
        } finally {
            setPasswordSubmitting(false);
        }
    };

    const isEditing = Boolean(facultyId);
    const isLastStep = step === STEPS.length - 1;
    const buttonText = submitting
        ? isEditing ? "Updating..." : "Creating..."
        : isEditing ? "Update" : "Create";
    const generalErrors = Object.entries(errors).filter(
        ([field]) => !PROFILE_FIELDS.includes(field) &&
            (!ADDRESS_FIELDS.includes(field) || !editingAddress),
    );
    const generalPasswordErrors = Object.entries(passwordErrors).filter(
        ([field]) => !["password", "password_confirmation"].includes(field),
    );
    const stepHint = step === 0
        ? "First and last names are required. Middle name is optional."
        : step === 1
            ? "All fields on this step are required."
            : editingAddress
                ? "Contact number, address selections, and ZIP code are required. Street is optional."
                : "Contact number, present address, and ZIP code are required.";
    // Parse a date-only value in local time so the displayed birthday cannot shift a day.
    const parsedBirthday = data.birthday ? parseISO(data.birthday) : undefined;
    const selectedBirthday = parsedBirthday && isValid(parsedBirthday) &&
        format(parsedBirthday, "yyyy-MM-dd") === data.birthday
        ? parsedBirthday : undefined;

    const renderInput = (name, label, inputProps = {}) => (
        <Field className="gap-2">
            <Label htmlFor={`${formId}-${name}`}>
                {label} {name !== "middle_name" && <Required />}
            </Label>
            <Input
                {...inputProps}
                id={`${formId}-${name}`}
                name={name}
                value={data[name]}
                onChange={handleOnchange}
                required={name !== "middle_name"}
                aria-invalid={Boolean(errors[name])}
                aria-describedby={errors[name] ? `${formId}-${name}-error` : undefined}
                className={`h-11 ${fieldClass(errors[name])}`}
            />
            {errors[name] && (
                <p id={`${formId}-${name}-error`} role="alert" className="text-sm text-destructive">
                    {errors[name]}
                </p>
            )}
        </Field>
    );

    const renderAddressSelect = (field, label, options, onValueChange, disabled = false) => (
        <Field className="gap-2">
            <Label htmlFor={`${formId}-address-${field}`}>
                {label} <Required />
            </Label>
            <Select
                name={field}
                value={address[`${field}Code`]}
                onValueChange={onValueChange}
                disabled={submitting || disabled}
            >
                <SelectTrigger
                    id={`${formId}-address-${field}`}
                    className={`h-11 w-full ${fieldClass(errors[field])}`}
                    aria-required="true"
                    aria-invalid={Boolean(errors[field])}
                    aria-describedby={errors[field] ? `${formId}-address-${field}-error` : undefined}
                >
                    <SelectValue placeholder={`Select ${label.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                    {options.map((item) => (
                        <SelectItem key={item[`${field}_code`]} value={String(item[`${field}_code`])}>
                            {item[`${field}_name`]}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
            {errors[field] && (
                <p id={`${formId}-address-${field}-error`} role="alert" className="text-sm text-destructive">
                    {errors[field]}
                </p>
            )}
        </Field>
    );

    const renderPasswordInput = (name, label, visible, setVisible) => (
        <Field className="gap-2">
            <Label htmlFor={`${formId}-${name}`}>{label} <Required /></Label>
            <div className="relative">
                <Input
                    id={`${formId}-${name}`}
                    name={name}
                    type={visible ? "text" : "password"}
                    autoComplete="new-password"
                    value={passwordData[name]}
                    onChange={handlePasswordChange}
                    required
                    aria-invalid={Boolean(passwordErrors[name])}
                    aria-describedby={passwordErrors[name] ? `${formId}-${name}-error` : undefined}
                    className={`h-11 pr-12 ${fieldClass(passwordErrors[name])}`}
                />
                <button
                    type="button"
                    aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
                    aria-pressed={visible}
                    onClick={() => setVisible((current) => !current)}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            {passwordErrors[name] && (
                <p id={`${formId}-${name}-error`} role="alert" className="text-sm text-destructive">
                    {passwordErrors[name]}
                </p>
            )}
        </Field>
    );

    return (
        <>
            <AlertDialog open={open} onOpenChange={(nextOpen) => {
                if (!nextOpen) handleClose();
            }}>
                <AlertDialogContent className="w-[calc(100%-2rem)] max-w-xl max-h-[90dvh] overflow-y-auto rounded-xl p-6 sm:p-8">
                    <AlertDialogHeader className="space-y-2 text-left">
                        <AlertDialogTitle className="text-2xl font-semibold tracking-tight sm:text-3xl">
                            {addingSuccess
                                ? "Faculty saved"
                                : isEditing ? "Update Faculty" : "Add Faculty"}
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-base">
                            {addingSuccess
                                ? "Save the account credentials before closing."
                                : isEditing
                                    ? "Update the faculty's personal and contact details."
                                    : "Enter the faculty's personal and contact details."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {isEditing && detailsReady && !addingSuccess && (
                        <div
                            role="tablist"
                            aria-label="Faculty settings"
                            onKeyDown={handleTabKeyDown}
                            className="flex gap-6 border-b"
                        >
                            {[
                                { key: "profile", label: "Profile details", ref: profileTabRef },
                                { key: "security", label: "Security", ref: securityTabRef },
                            ].map(({ key, label, ref }) => (
                                <button
                                    key={key}
                                    ref={ref}
                                    type="button"
                                    role="tab"
                                    id={`${formId}-${key}-tab`}
                                    aria-controls={`${formId}-${key}-panel`}
                                    aria-selected={activeSection === key}
                                    tabIndex={activeSection === key ? 0 : -1}
                                    disabled={busy}
                                    onClick={() => changeSection(key)}
                                    className={`-mb-px inline-flex items-center gap-2 border-b-2 px-1 py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 ${activeSection === key
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    {key === "security" && <Lock size={16} aria-hidden="true" />}
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Each section has its own form inside the portaled dialog. */}
                    {!detailsReady ? (
                        <div className="space-y-5">
                            {loading || !loadError ? (
                                <p role="status" className="py-8 text-center text-muted-foreground">
                                    Loading complete faculty details...
                                </p>
                            ) : (
                                <div role="alert" className="space-y-3 rounded-md border border-destructive p-4">
                                    <p className="text-sm text-destructive">{loadError}</p>
                                    <Button type="button" variant="outline" onClick={() => setLoadVersion((version) => version + 1)}>
                                        Retry
                                    </Button>
                                </div>
                            )}
                            <AlertDialogFooter className="flex-row justify-start border-t pt-5 sm:justify-start">
                                <AlertDialogCancel asChild className="mt-0 border-0 bg-transparent shadow-none sm:mt-0">
                                    <Button type="button" variant="ghost">Cancel</Button>
                                </AlertDialogCancel>
                            </AlertDialogFooter>
                        </div>
                    ) : activeSection === "profile" || addingSuccess ? (
                        <form
                            id={`${formId}-profile-panel`}
                            role={isEditing && !addingSuccess ? "tabpanel" : undefined}
                            aria-labelledby={isEditing && !addingSuccess ? `${formId}-profile-tab` : undefined}
                            onSubmit={submit}
                            noValidate
                            className="space-y-6"
                        >
                            {addingSuccess ? (
                                <CredentialsCard
                                    data={{ ...data, email: data.email_address }}
                                    credentials={credentials}
                                />
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between gap-4" aria-live="polite">
                                            <h3 className="text-lg font-semibold">{STEPS[step].title}</h3>
                                            <p className="shrink-0 text-sm text-muted-foreground">
                                                Step {step + 1} of {STEPS.length}
                                            </p>
                                        </div>
                                        <div className="flex gap-2" aria-hidden="true">
                                            {STEPS.map((item, index) => (
                                                <div
                                                    key={item.title}
                                                    className={`h-2 flex-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"
                                                        }`}
                                                />
                                            ))}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {stepHint}
                                        </p>
                                    </div>

                                    {generalErrors.length > 0 && (
                                        <div role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
                                            {generalErrors.map(([field, message]) => (
                                                <p key={field}>{field.replace(/_/g, " ")}: {message}</p>
                                            ))}
                                        </div>
                                    )}

                                    <fieldset disabled={submitting} className="min-w-0">
                                        <legend className="sr-only">{STEPS[step].title}</legend>
                                        <FieldGroup className="gap-5">
                                            {step === 0 && (
                                                <>
                                                    {renderInput("first_name", "First name", { autoComplete: "given-name" })}
                                                    {renderInput("middle_name", "Middle name (optional)", { autoComplete: "additional-name" })}
                                                    {renderInput("last_name", "Last name", { autoComplete: "family-name" })}
                                                </>
                                            )}

                                            {step === 1 && (
                                                <>
                                                    {renderInput("email_address", "Email", {
                                                        type: "email",
                                                        autoComplete: "email",
                                                    })}
                                                    <Field className="gap-2">
                                                        <Label htmlFor={`${formId}-gender`}>
                                                            Gender <Required />
                                                        </Label>
                                                        <Select
                                                            name="gender"
                                                            value={data.gender}
                                                            disabled={submitting}
                                                            onValueChange={(value) => {
                                                                setData("gender", value);
                                                                clearErrors("gender");
                                                            }}
                                                        >
                                                            <SelectTrigger
                                                                id={`${formId}-gender`}
                                                                className={`h-11 w-full ${fieldClass(errors.gender)}`}
                                                                aria-required="true"
                                                                aria-invalid={Boolean(errors.gender)}
                                                                aria-describedby={errors.gender ? `${formId}-gender-error` : undefined}
                                                            >
                                                                <SelectValue placeholder="Select gender" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Male">Male</SelectItem>
                                                                <SelectItem value="Female">Female</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        {errors.gender && (
                                                            <p id={`${formId}-gender-error`} role="alert" className="text-sm text-destructive">
                                                                {errors.gender}
                                                            </p>
                                                        )}
                                                    </Field>

                                                    <Field className="gap-2">
                                                        <Label htmlFor={`${formId}-birthday`}>
                                                            Birthday <Required />
                                                        </Label>
                                                        <Popover open={birthdayOpen} onOpenChange={setBirthdayOpen}>
                                                            <PopoverTrigger asChild>
                                                                <Button
                                                                    type="button"
                                                                    variant="outline"
                                                                    id={`${formId}-birthday`}
                                                                    name="birthday"
                                                                    disabled={submitting}
                                                                    aria-required="true"
                                                                    aria-invalid={Boolean(errors.birthday)}
                                                                    aria-describedby={errors.birthday ? `${formId}-birthday-error` : undefined}
                                                                    className={`h-11 justify-start font-normal w-full ${!selectedBirthday ? "text-muted-foreground" : ""
                                                                        } ${fieldClass(errors.birthday)}`}
                                                                >
                                                                    <CalendarDays className="mr-2 h-4 w-4" />
                                                                    {selectedBirthday ? format(selectedBirthday, "PP") : "Select date"}
                                                                </Button>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                                                                <Calendar
                                                                    mode="single"
                                                                    selected={selectedBirthday}
                                                                    defaultMonth={selectedBirthday}
                                                                    captionLayout="dropdown"
                                                                    endMonth={new Date()}
                                                                    disabled={(date) => submitting || format(date, "yyyy-MM-dd") > getToday()}
                                                                    onSelect={(date) => {
                                                                        if (submitting) return;
                                                                        clearErrors("birthday");
                                                                        setData("birthday", date ? format(date, "yyyy-MM-dd") : "");
                                                                        setBirthdayOpen(false);
                                                                    }}
                                                                />
                                                            </PopoverContent>
                                                        </Popover>
                                                        {errors.birthday && (
                                                            <p id={`${formId}-birthday-error`} role="alert" className="text-sm text-destructive">
                                                                {errors.birthday}
                                                            </p>
                                                        )}
                                                    </Field>
                                                </>
                                            )}

                                            {step === 2 && (
                                                <>
                                                    <Field className="gap-2">
                                                        <Label htmlFor={`${formId}-contact_number`}>
                                                            Contact number <Required />
                                                        </Label>
                                                        <Input
                                                            id={`${formId}-contact_number`}
                                                            name="contact_number"
                                                            type="tel"
                                                            inputMode="numeric"
                                                            autoComplete="tel"
                                                            value={formatPhoneNumber(data.contact_number)}
                                                            onChange={handleContactChange}
                                                            required
                                                            aria-invalid={Boolean(errors.contact_number)}
                                                            aria-describedby={`${formId}-contact-hint${errors.contact_number ? ` ${formId}-contact_number-error` : ""}`}
                                                            className={`h-11 ${fieldClass(errors.contact_number)}`}
                                                        />
                                                        {errors.contact_number && (
                                                            <p id={`${formId}-contact_number-error`} role="alert" className="text-sm text-destructive">
                                                                {errors.contact_number}
                                                            </p>
                                                        )}
                                                        <p id={`${formId}-contact-hint`} className="text-xs text-muted-foreground">
                                                            11 digits starting with 09.
                                                        </p>
                                                    </Field>

                                                    <fieldset className="min-w-0 space-y-4 rounded-md border p-4">
                                                        <legend className="px-1 text-sm font-medium">
                                                            Present address <Required />
                                                        </legend>
                                                        {needsAddressRecord && (
                                                            <div className="space-y-2 text-sm text-muted-foreground">
                                                                <p>No address record is saved yet. Complete the address fields below; clicking Update will create it.</p>
                                                                {selectedFaculty.present_address && (
                                                                    <p><span className="font-medium">Previous address:</span> {selectedFaculty.present_address}</p>
                                                                )}
                                                            </div>
                                                        )}
                                                        {editingAddress && (
                                                            <div className="space-y-4">
                                                                <Field className="gap-2">
                                                                    <Label htmlFor={`${formId}-street`}>
                                                                        Street (optional)
                                                                    </Label>
                                                                    <Input
                                                                        id={`${formId}-street`}
                                                                        name="street"
                                                                        autoComplete="address-line1"
                                                                        placeholder="e.g., 123 Main Street, Zone 7"
                                                                        value={address.street}
                                                                        className="h-11"
                                                                        onChange={(event) => updateAddress({
                                                                            ...address,
                                                                            street: event.target.value,
                                                                        })}
                                                                    />
                                                                </Field>
                                                                {/* {renderAddressSelect("region", "Region", regions, handleRegionChange)} */}
                                                                {renderAddressSelect("province", "Province", provinces, handleProvinceChange, !address.regionCode)}
                                                                {renderAddressSelect("city", "City/Municipality", cities, handleCityChange, !address.provinceCode)}
                                                                {renderAddressSelect("barangay", "Barangay", barangays, handleBarangayChange, !address.cityCode)}
                                                            </div>
                                                        )}
                                                        <Label htmlFor={`${formId}-present-address`} className="sr-only">
                                                            {editingAddress ? "Selected address" : "Saved address"}
                                                        </Label>
                                                        <textarea
                                                            id={`${formId}-present-address`}
                                                            name="present_address"
                                                            rows={3}
                                                            value={data.present_address}
                                                            readOnly
                                                            aria-required="true"
                                                            placeholder="Your address will appear after selecting a barangay."
                                                            aria-invalid={Boolean(errors.present_address)}
                                                            aria-describedby={errors.present_address ? `${formId}-address-error` : undefined}
                                                            className={`flex w-full resize-y rounded-md border border-input bg-muted/30 px-3 py-2 text-sm ${fieldClass(errors.present_address)}`}
                                                        />
                                                        {errors.present_address && (
                                                            <p id={`${formId}-address-error`} role="alert" className="text-sm text-destructive">
                                                                {errors.present_address}
                                                            </p>
                                                        )}
                                                        {hasSavedAddress && (
                                                            <Button
                                                                type="button"
                                                                variant="outline"
                                                                disabled={submitting}
                                                                onClick={editingAddress ? keepSavedAddress : startAddressChange}
                                                            >
                                                                {editingAddress ? "Keep saved address" : "Change address"}
                                                            </Button>
                                                        )}
                                                    </fieldset>
                                                    {renderInput("zip_code", "ZIP code", {
                                                        type: "text",
                                                        autoComplete: "postal-code",
                                                        readOnly: !editingAddress,
                                                    })}
                                                    {!editingAddress && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Choose Change address to update the saved address and ZIP code.
                                                        </p>
                                                    )}
                                                </>
                                            )}
                                        </FieldGroup>
                                    </fieldset>
                                </>
                            )}

                            <AlertDialogFooter className="flex-row items-center justify-between gap-3 border-t pt-5 sm:justify-between sm:space-x-0">
                                {addingSuccess ? (
                                    <>
                                        <AlertDialogCancel asChild className="mt-0 border-0 bg-transparent shadow-none sm:mt-0">
                                            <Button type="button" variant="ghost" disabled={busy}>Close</Button>
                                        </AlertDialogCancel>
                                        <Button type="button" disabled={submitting} onClick={resetFacultyForm}>
                                            <Plus size={16} /> Add Faculty
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <AlertDialogCancel asChild className="mt-0 border-0 bg-transparent shadow-none sm:mt-0">
                                            <Button type="button" variant="ghost" disabled={busy}>Cancel</Button>
                                        </AlertDialogCancel>
                                        <div className="ml-auto flex items-center gap-2">
                                            {step > 0 && (
                                                <Button type="button" variant="outline" disabled={busy} onClick={() => setStep((currentStep) => currentStep - 1)}>
                                                    <ChevronLeft size={16} /> Previous
                                                </Button>
                                            )}
                                            <Button type="submit" disabled={busy}>
                                                {isLastStep ? buttonText : (
                                                    <>Next <ChevronRight size={16} /></>
                                                )}
                                            </Button>
                                        </div>
                                    </>
                                )}
                            </AlertDialogFooter>

                        </form>
                    ) : (
                        <form
                            id={`${formId}-security-panel`}
                            role="tabpanel"
                            aria-labelledby={`${formId}-security-tab`}
                            onSubmit={submitPassword}
                            noValidate
                            className="space-y-6"
                        >
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold">Change password</h3>
                                <p className="text-sm text-muted-foreground">
                                    Use at least 8 characters. Both fields are required.
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    Password changes are saved separately from profile details.
                                </p>
                            </div>

                            {generalPasswordErrors.length > 0 && (
                                <div role="alert" className="rounded-md border border-destructive p-3 text-sm text-destructive">
                                    {generalPasswordErrors.map(([field, message]) => (
                                        <p key={field}>{message}</p>
                                    ))}
                                </div>
                            )}

                            <fieldset disabled={passwordSubmitting} className="min-w-0">
                                <legend className="sr-only">New password</legend>
                                <FieldGroup className="gap-5">
                                    {renderPasswordInput("password", "New password", showPassword, setShowPassword)}
                                    {renderPasswordInput("password_confirmation", "Confirm password", showPasswordConfirm, setShowPasswordConfirm)}
                                </FieldGroup>
                            </fieldset>

                            <AlertDialogFooter className="flex-row items-center justify-between gap-3 border-t pt-5 sm:justify-between sm:space-x-0">
                                <AlertDialogCancel asChild className="mt-0 border-0 bg-transparent shadow-none sm:mt-0">
                                    <Button type="button" variant="ghost" disabled={busy}>Cancel</Button>
                                </AlertDialogCancel>
                                <Button type="submit" disabled={busy}>
                                    {passwordSubmitting ? "Changing..." : "Change Password"}
                                </Button>
                            </AlertDialogFooter>
                        </form>
                    )}
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default AddUpdateFacultyDialog;
