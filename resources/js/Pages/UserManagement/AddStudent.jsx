import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { formatPhoneNumber } from '@/Lib/Utils';
import { useForm } from '@inertiajs/react';
import { CircleHelp, LoaderCircle } from 'lucide-react';
import React, { useState } from 'react'
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip';

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

    return (
        <div>
            <Dialog open={open} onOpenChange={() => { setOpen(false), setEditing(false), setStudent([]), reset() }}>
                <DialogContent className="">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit' : 'Add'} Student</DialogTitle>
                    </DialogHeader>
                    <div className='flex flex-col justify-between h-full gap-0'>
                        <div className='flex flex-col justify-between h-80'>
                            <div className='h-full flex flex-col justify-between'>
                                {page == 1 && (
                                    <div className='flex flex-col gap-2'>
                                        <div>
                                            <Label>ID number</Label>
                                            <div className='flex gap-2 items-center'>

                                                <Input
                                                    name="user_id_no"
                                                    value={data.user_id_no}
                                                    onChange={handleChange}
                                                    className={`${errors.user_id_no && 'border-red-500'}`}
                                                />
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => loginAs(user)}>
                                                            <CircleHelp className='text-blue-500 cursor-pointer' />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        Use this only for old students who don’t have records in the system.
                                                    </TooltipContent>
                                                </Tooltip>

                                            </div>
                                        </div>
                                        <div>
                                            <Label>First name</Label>
                                            <Input
                                                name="first_name"
                                                value={data.first_name}
                                                onChange={handleChange}
                                                className={`${errors.first_name && 'border-red-500'}`}
                                            />
                                        </div>
                                        <div>
                                            <Label>Middle name</Label>
                                            <Input
                                                name="middle_name"
                                                value={data.middle_name}
                                                onChange={handleChange}
                                                className={`${errors.middle_name && 'border-red-500'}`}
                                            />
                                        </div>
                                        <div>
                                            <Label>Last name</Label>
                                            <Input
                                                name="last_name"
                                                value={data.last_name}
                                                onChange={handleChange}
                                                className={`${errors.last_name && 'border-red-500'}`}
                                            />
                                        </div>
                                    </div>
                                )}

                                {page == 2 && (
                                    <div className='flex flex-col'>
                                        <div className='flex flex-col gap-2'>
                                            <div>
                                                <Label>Email</Label>
                                                <Input
                                                    type="email"
                                                    name="email_address"
                                                    value={data.email_address}
                                                    onChange={handleChange}
                                                    className={`${errors.email_address && 'border-red-500'}`}
                                                />
                                                {errors.email_address && (
                                                    <p className="text-red-500 text-sm mt-1">{errors.email_address.message}</p>
                                                )}
                                            </div>
                                            <div>
                                                <Label>Gender</Label>
                                                <Select
                                                    name="gender"
                                                    value={data.gender}
                                                    onValueChange={(value) =>
                                                        handleChange({ target: { name: 'gender', value } })
                                                    }
                                                >
                                                    <SelectTrigger
                                                        className={`${errors.gender ? 'border-red-500' : ''}`}
                                                    >
                                                        <SelectValue placeholder="Select..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Male">Male</SelectItem>
                                                        <SelectItem value="Female">Female</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div>
                                                <Label>Birthday</Label>
                                                <Input
                                                    type="date"
                                                    name="birthday"
                                                    value={data.birthday}
                                                    onChange={handleChange}
                                                    className={`${errors.birthday && 'border-red-500'}`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {page == 3 && (
                                    <div className='flex flex-col gap-2'>
                                        <div>
                                            <Label>Phone number</Label>
                                            <Input
                                                name="contact_number"
                                                value={formatPhoneNumber(data.contact_number)}
                                                onChange={handleContactChange}
                                                className={`${errors.contact_number && 'border-red-500'}`}
                                            />
                                        </div>
                                        <div>
                                            <Label>Present address</Label>
                                            <Input
                                                name="present_address"
                                                value={data.present_address}
                                                onChange={handleChange}
                                                className={`${errors.present_address && 'border-red-500'}`}
                                            />
                                        </div>
                                        <div>
                                            <Label>Zip code</Label>
                                            <Input
                                                name="zip_code"
                                                value={data.zip_code}
                                                onChange={(e) => {
                                                    if (isNaN(e.target.value)) return
                                                    handleChange(e);
                                                }}
                                                className={`${errors.zip_code && 'border-red-500'}`}
                                            />
                                        </div>
                                    </div>
                                )}
                                {errorMessage && (
                                    <p className="text-red-500 text-sm mt-1">{errorMessage}</p>
                                )}
                            </div>
                            <div className='w-full flex justify-center items-center gap-4'>
                                <Button disabled={page === 1} variant="ghost" onClick={previousPage}>Prev</Button>
                                <p className='text-center'>{page}/3</p>
                                <Button disabled={page === 3} variant="ghost" onClick={nextPage}>Next</Button>
                            </div>
                        </div>
                    </div>

                    <div className="text-sm text-yellow-600 bg-yellow-100 border border-yellow-300 rounded-md p-2 my-2">
                        Credentials can't be sent for now. Google SMTP is currently rate-limited and has a low email sending quota.
                    </div>

                    <DialogFooter>
                        <Button
                            className="w-full relative justify-center"
                            disabled={processing || page !== 3}
                            onClick={submit}
                            type="submit"
                        >
                            <span className="text-center">
                                {processing ? 'Submitting' : editing ? 'Confirm edit' : 'Submit'}
                            </span>
                            {processing && (
                                <LoaderCircle className="animate-spin" />
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

export default AddStudent
