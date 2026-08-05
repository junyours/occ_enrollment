import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from "@/Components/ui/alert-dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Button } from "@/Components/ui/button";
import { CFloatingInput } from "@/Components/ui/CFloatingInput";
import { Field, FieldGroup } from "@/Components/ui/field";
import { useForm } from "@inertiajs/react";
import { isValidEmail } from "@/Lib/Utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import CredentialsCard from "./CredentialsCard";
import { Plus, Lock, Eye, EyeOff } from "lucide-react";

function AddUpdateEvaluatorDialog({
    open,
    setOpen,
    selectedEvaluator,
    setSelectedEvaluator,
    refetch,
}) {
    const [submitting, setSubmitting] = useState(false);
    const [addingSuccess, setAddingSuccess] = useState(false);
    const [credentials, setCredentials] = useState({});
    const [showPasswordDialog, setShowPasswordDialog] = useState(false);
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);
    const [passwordEvaluator, setPasswordEvaluator] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
    console.log(selectedEvaluator);
    
    const { data, setData, errors, setError, clearErrors, reset } = useForm({
        id: null,
        user_role: null,
        user_id_no: null,
        first_name: null,
        last_name: null,
        email: null,
    });

    const {
        data: passwordData,
        setData: setPasswordData,
        errors: passwordErrors,
        setError: setPasswordError,
        clearErrors: clearPasswordErrors,
        reset: resetPasswordForm
    } = useForm({
        evaluator_id: null,
        password: null,
        password_confirmation: null,
    });

    useEffect(() => {
        setData('id', selectedEvaluator?.id || null);
        setData('user_role', selectedEvaluator?.user_role || null);
        setData('user_id_no', selectedEvaluator?.user_id_no || null);
        setData('first_name', selectedEvaluator?.first_name || '');
        setData('last_name', selectedEvaluator?.last_name || '');
        setData('email', selectedEvaluator?.email || '');
    }, [selectedEvaluator?.id]);

    const handleClose = () => {
        if (submitting) return;
        setOpen(false);
        setSelectedEvaluator(null);
        reset();
        clearErrors();
        setAddingSuccess(false);
        setCredentials({});
    };

    const handlePasswordDialogOpen = (evaluator) => {
        setPasswordEvaluator(evaluator);
        setPasswordData('evaluator_id', evaluator.id);
        setOpen(false);
        setShowPasswordDialog(true);
    };

    const handlePasswordDialogClose = () => {
        if (passwordSubmitting) return;
        setShowPasswordDialog(false);
        setPasswordEvaluator(null);
        resetPasswordForm();
        clearPasswordErrors();
        setShowPassword(false);
        setShowPasswordConfirm(false);
    };

    const handleOnchange = (e) => {
        const { name, value } = e.target;
        setData(name, value);

        if (!value) {
            setError(name, 'This field is required');
        } else {
            clearErrors(name);
        }
    };

    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(name, value);

        if (!value) {
            setPasswordError(name, 'This field is required');
        } else {
            clearPasswordErrors(name);
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        clearErrors();

        let validationErrors = {};

        if (!data.user_role) validationErrors.user_role = 'This field is required';
        if (!data.first_name) validationErrors.first_name = 'This field is required';
        if (!data.last_name) validationErrors.last_name = 'This field is required';
        if (!data.email) validationErrors.email = 'This field is required';
        else if (!isValidEmail(data.email)) validationErrors.email = 'Please enter a valid email address';

        if (Object.keys(validationErrors).length > 0) {
            setError(validationErrors);
            setSubmitting(false);
            return;
        }

        const url = selectedEvaluator?.id
            ? route('nstp-director.update-nstp-evaluator')
            : route('nstp-director.create-nstp-evaluator');

        try {
            const response = await axios.post(url, data);

            if (response.data.success) {
                refetch();
                toast.success(response.data.success);
                if (response.data.credentials) {
                    setCredentials(response.data.credentials);
                    setAddingSuccess(true);
                }
            }
        } catch (error) {
            if (error.response?.data?.errors) {
                setError(error.response.data.errors);
            } else {
                toast.error(error?.response?.data?.message || "An error occurred");
            }
        } finally {
            setSubmitting(false);
        }
    };

    const submitPassword = async (e) => {
        e.preventDefault();
        console.log('submitPassword called', passwordData);
        setPasswordSubmitting(true);
        clearPasswordErrors();

        let validationErrors = {};

        if (!passwordData.password) validationErrors.password = 'This field is required';
        else if (passwordData.password.length < 8) validationErrors.password = 'Password must be at least 8 characters';

        if (!passwordData.password_confirmation) validationErrors.password_confirmation = 'This field is required';
        else if (passwordData.password !== passwordData.password_confirmation) validationErrors.password_confirmation = 'Passwords do not match';

        if (Object.keys(validationErrors).length > 0) {
            setPasswordError(validationErrors);
            setPasswordSubmitting(false);
            return;
        }

        try {
            console.log('Making API call with:', {
                evaluator_id: passwordData.evaluator_id,
                password: passwordData.password,
                password_confirmation: passwordData.password_confirmation,
            });

            const response = await axios.post(route('nstp-director.change-evaluator-password'), {
                evaluator_id: passwordData.evaluator_id,
                password: passwordData.password,
                password_confirmation: passwordData.password_confirmation,
            });

            console.log('API response:', response.data);

            if (response.data.success) {
                toast.success(response.data.success);
                handlePasswordDialogClose();
            }
        } catch (error) {
            console.error('API error:', error);
            if (error.response?.data?.errors) {
                setPasswordError(error.response.data.errors);
            } else {
                toast.error(error?.response?.data?.message || "An error occurred");
            }
        } finally {
            setPasswordSubmitting(false);
        }
    };

    const isEditing = !!selectedEvaluator?.id;
    const buttonText = submitting
        ? isEditing ? 'Updating...' : 'Creating...'
        : isEditing ? 'Update' : 'Create';

    return (
        <>
            {/* Main Add/Edit Dialog */}
            <AlertDialog open={open} onOpenChange={handleClose}>
                <form onSubmit={submit}>
                    <AlertDialogContent className='w-96'>
                        <AlertDialogHeader>
                            <AlertDialogTitle className='text-2xl text-center'>
                                {addingSuccess
                                    ? ''
                                    : isEditing
                                        ? 'Update Evaluator'
                                        : 'Add Evaluator'}
                            </AlertDialogTitle>
                            <AlertDialogDescription className='sr-only'>
                                {isEditing ? 'Update evaluator information' : 'Add a new evaluator to the system'}
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        {!addingSuccess ? (
                            <FieldGroup className='gap-4'>
                                <Field className='gap-0'>
                                    <Select
                                        value={data.user_role || ''}
                                        onValueChange={(value) =>
                                            handleOnchange({ target: { name: 'user_role', value } })
                                        }
                                    >
                                        <SelectTrigger className={`w-full h-12 ${errors.user_role && 'border-destructive focus-visible:ring-destructive'}`}>
                                            <SelectValue placeholder="Evaluator Role" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem value="placeholder" disabled>
                                                    Evaluator component
                                                </SelectItem>
                                                <SelectItem value="rotc_evaluator">ROTC</SelectItem>
                                                <SelectItem value="cwts_evaluator">CWTS</SelectItem>
                                                <SelectItem value="lts_evaluator">LTS</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    {errors.user_role && (
                                        <p className="mt-1 text-sm text-destructive">{errors.user_role}</p>
                                    )}
                                </Field>

                                <Field>
                                    <CFloatingInput
                                        name="first_name"
                                        label="First name"
                                        value={data.first_name}
                                        onChange={handleOnchange}
                                        error={errors.first_name}
                                    />
                                </Field>

                                <Field>
                                    <CFloatingInput
                                        name="last_name"
                                        label="Last name"
                                        value={data.last_name}
                                        onChange={handleOnchange}
                                        error={errors.last_name}
                                    />
                                </Field>

                                <Field>
                                    <CFloatingInput
                                        name="email"
                                        label="Email"
                                        value={data.email}
                                        onChange={handleOnchange}
                                        error={errors.email}
                                    />
                                </Field>
                            </FieldGroup>
                        ) : (
                            <CredentialsCard data={data} credentials={credentials} />
                        )}

                        <AlertDialogFooter>
                            {!addingSuccess ? (
                                <>
                                    <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
                                    {isEditing && (
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => handlePasswordDialogOpen(selectedEvaluator)}
                                            className="gap-2"
                                            disabled={submitting}
                                        >
                                            <Lock size={16} />
                                            Change Password
                                        </Button>
                                    )}
                                    <Button type="submit" disabled={submitting}>
                                        {buttonText}
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <AlertDialogCancel variant='destructive' onClick={handleClose} className='w-full'>Close</AlertDialogCancel>
                                    <Button type="button" onClick={() => { setAddingSuccess(false); reset() }} className='w-full'><Plus /> Add Evaluator</Button>
                                </>
                            )}
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </form>
            </AlertDialog>

            {/* Change Password Dialog */}
            <AlertDialog open={showPasswordDialog} onOpenChange={handlePasswordDialogClose}>
                <AlertDialogContent className='w-96'>
                    <form onSubmit={submitPassword} className="space-y-4">
                        <AlertDialogHeader>
                            <AlertDialogTitle className='text-2xl text-center'>
                                Change Password for {passwordEvaluator?.first_name} {passwordEvaluator?.last_name}
                            </AlertDialogTitle>
                            <AlertDialogDescription className='sr-only'>
                                Enter a new password with at least 8 characters
                            </AlertDialogDescription>
                        </AlertDialogHeader>

                        <FieldGroup className='gap-4'>
                            <Field className='gap-0'>
                                <div className="relative">
                                    <CFloatingInput
                                        name="password"
                                        label="New Password"
                                        type={showPassword ? "text" : "password"}
                                        value={passwordData.password || ''}
                                        onChange={handlePasswordChange}
                                        error={passwordErrors.password}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </Field>

                            <Field className='gap-0'>
                                <div className="relative">
                                    <CFloatingInput
                                        name="password_confirmation"
                                        label="Confirm Password"
                                        type={showPasswordConfirm ? "text" : "password"}
                                        value={passwordData.password_confirmation || ''}
                                        onChange={handlePasswordChange}
                                        error={passwordErrors.password_confirmation}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                                    >
                                        {showPasswordConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </Field>

                            <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2">
                                <p className="text-xs text-blue-700 font-medium">
                                    Password must be at least 8 characters long.
                                </p>
                            </div>
                        </FieldGroup>

                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={passwordSubmitting}>Cancel</AlertDialogCancel>
                            <Button type="submit" disabled={passwordSubmitting}>
                                {passwordSubmitting ? 'Changing...' : 'Change Password'}
                            </Button>
                        </AlertDialogFooter>
                    </form>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

export default AddUpdateEvaluatorDialog;