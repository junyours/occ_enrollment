import { Button } from '@/Components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Textarea } from '@/Components/ui/textarea';
import { useForm, router } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const requiredFields = ['title'];

function AddCriteria({ open, setOpen, editMode = false, criteriaData = null }) {
    const { toast } = useToast();
    const [errorMessage, setErrorMessage] = useState('');

    // 🔹 Initialize form
    const { data, setData, post, put, processing, errors, setError, clearErrors, reset } = useForm({
        title: '',
        recommendation: '',
        suggestion: '',
    });

    // 🔹 Prefill fields when editing
    useEffect(() => {
        if (editMode && criteriaData) {
            setData({
                title: criteriaData.title || '',
                recommendation: criteriaData.recommendation || '',
                suggestion: criteriaData.suggestion || '',
            });
        } else {
            reset();
        }
    }, [editMode, criteriaData]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (requiredFields.includes(name) && value.trim() === '') {
            setError(name, { error: true });
        } else {
            clearErrors(name);
        }

        setData(name, value);
    };

    const submit = async () => {
        let hasError = false;

        requiredFields.forEach((field) => {
            if (!data[field] || data[field].trim() === '') {
                setError(field, { error: true });
                hasError = true;
            }
        });

        if (hasError) return;

        if (editMode && criteriaData) {
            // 🔹 Update existing record
            await router.put(route('criteria.update', criteriaData.id), data, {
                onSuccess: () => {
                    reset();
                    setOpen(false);
                    setErrorMessage('');
                    toast({
                        description: 'Criteria updated successfully',
                        variant: 'success',
                    });
                },
                onError: () => {
                    setErrorMessage('Failed to update criteria.');
                },
            });
        } else {
            // 🔹 Create new record
            await post(route('criteria.store'), {
                onSuccess: () => {
                    reset();
                    setOpen(false);
                    setErrorMessage('');
                    toast({
                        description: 'Criteria added successfully',
                        variant: 'success',
                    });
                },
                onError: () => {
                    setErrorMessage('An error occurred.');
                },
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        {editMode ? 'Edit Criteria' : 'Add Criteria'}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="title">Title</Label>
                        <Input
                            id="title"
                            name="title"
                            value={data.title}
                            onChange={handleChange}
                            className={errors.title && 'border-red-500'}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="recommendation">Recommendation</Label>
                        <Textarea
                            id="recommendation"
                            name="recommendation"
                            value={data.recommendation}
                            onChange={handleChange}
                            className={errors.recommendation && 'border-red-500'}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <Label htmlFor="suggestion">Suggestion</Label>
                        <Textarea
                            id="suggestion"
                            name="suggestion"
                            value={data.suggestion}
                            onChange={handleChange}
                            className={errors.suggestion && 'border-red-500'}
                        />
                    </div>

                    {errorMessage && (
                        <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        className="w-full relative justify-center"
                        disabled={processing}
                        onClick={submit}
                        type="button"
                    >
                        <span className="text-center">
                            {processing
                                ? editMode
                                    ? 'Updating...'
                                    : 'Submitting...'
                                : editMode
                                ? 'Update'
                                : 'Submit'}
                        </span>
                        {processing && <LoaderCircle className="animate-spin ml-2" />}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default AddCriteria;
