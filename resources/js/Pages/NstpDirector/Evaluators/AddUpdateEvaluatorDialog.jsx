import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/Components/ui/alert-dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/Components/ui/select";
import { Button } from "@/Components/ui/button";
import { CFloatingInput } from "@/Components/ui/CFloatingInput";
import { Field, FieldGroup } from "@/Components/ui/field";
import { useForm, usePage } from "@inertiajs/react";
import { isValidEmail } from "@/Lib/Utils";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import CredentialsCard from "./CredentialsCard";
import { Plus } from "lucide-react";

function AddUpdateEvaluatorDialog({ open, setOpen, selectedEvaluator, setSelectedEvaluator, refetch }) {
    const [submitting, setSubmitting] = useState(false);
    const [addingSuccess, setAddingSuccess] = useState(false);
    const [credentials, setCredentials] = useState({});

    const { data, setData, errors, setError, reset } = useForm({
        id: null,
        user_role: null,
        user_id_no: null,
        first_name: null,
        last_name: null,
        email: null,
    });

    // Fill form if editing
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
        setAddingSuccess(false);
        setCredentials({});
    };

    const handleOnchange = (e) => {
        const { name, value } = e.target;
        setData(name, value);

        if (!value) {
            setError(name, 'This field is required');
        } else {
            setError(name, '');
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError({});

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

    const isEditing = !!selectedEvaluator?.id;
    const buttonText = submitting
        ? isEditing ? 'Updating...' : 'Creating...'
        : isEditing ? 'Update' : 'Create';

    return (
        <AlertDialog open={open} onOpenChange={handleClose} disabled={submitting}>
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
                    </AlertDialogHeader>

                    {!addingSuccess ? (
                        <FieldGroup className='gap-4'>
                            <Field className='gap-0'>
                                <Select
                                    value={data.user_role}
                                    onValueChange={(value) =>
                                        handleOnchange({ target: { name: 'user_role', value } })
                                    }
                                >
                                    <SelectTrigger className={`w-full h-12 ${errors.user_role && 'border-destructive focus-visible:ring-destructive'}`}>
                                        <SelectValue placeholder="Evaluator Role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectItem value={null} disabled>
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
                                <Button type="submit" onClick={submit} disabled={submitting}>
                                    {buttonText}
                                </Button>
                            </>
                        ) : (
                            <>
                                <AlertDialogCancel variant='destructive' onClick={handleClose} className='w-full'>Close</AlertDialogCancel>
                                <Button onClick={() => { setAddingSuccess(false); reset() }} className='w-full'><Plus /> Add Evaluator</Button>
                            </>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </form>
        </AlertDialog>
    );
}

export default AddUpdateEvaluatorDialog;
