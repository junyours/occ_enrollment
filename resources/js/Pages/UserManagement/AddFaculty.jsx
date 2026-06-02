import { Button } from '@/Components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { formatPhoneNumber } from '@/Lib/Utils';
import { useForm, usePage } from '@inertiajs/react';
import { LoaderCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { useToast } from '@/hooks/use-toast';

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

function AddFaculty({ open, setOpen, faculty, editing, setEditing, setFaculty }) {
    const { user } = usePage().props.auth;
    const userRole = user.user_role;

    const { toast } = useToast()

    const [page, setPage] = useState(1);

    const [errorMessage, setErrorMessage] = useState('');

    const [departments, setDepartments] = useState([]);

    const getDepartments = async () => {
        await axios.post(route('departments'))
            .then(response => {
                setDepartments(response.data);
            })
    }

    useEffect(() => {
        if (userRole == 'registrar') {
            getDepartments();
        }
    }, [])

    const { data, setData, post, processing, errors, setError, clearErrors, reset } = useForm({
        id: editing ? faculty.id : 0,
        first_name: editing ? faculty.first_name : '',
        middle_name: editing ? faculty.middle_name : '',
        last_name: editing ? faculty.last_name : '',
        gender: editing ? faculty.gender : '',
        birthday: editing ? faculty.birthday : '',
        contact_number: editing ? faculty.contact_number : '09',
        email_address: editing ? faculty.email_address : '',
        present_address: editing ? faculty.present_address : '',
        zip_code: editing ? faculty.zip_code : '',
        department_id: 0,
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (requiredFields.includes(name) && value.trim() == '') {
            setError(name, { error: true });
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

            if (!data.department_id && userRole == 'registrar') {
                setError('department_id', { error: true });
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

        const routeName = editing ? 'faculty.edit' : 'faculty.add'

        await post(route(routeName), {
            onSuccess: () => {
                reset();
                setPage(1);
                setOpen(false);
                setErrorMessage('');
                setFaculty([])
                setEditing(false);
                reset();
                toast({
                    description: "Faculty added successfully",
                    variant: "success",
                });
            },
            onError: (errors) => {

                if (errors.faculty) {
                    setErrorMessage(errors.faculty);
                    setError('first_name', { error: true })
                    setError('last_name', { error: true })
                    setPage(1);
                } else if (errors.email) {
                    setErrorMessage(errors.email);
                    setError('email_address', { error: true })
                    setPage(2);
                }
            }
        })
    }

    return (
        <div>
            <Dialog open={open} onOpenChange={() => { setOpen(false), setEditing(false), setFaculty([]), reset() }}>
                <DialogContent className="">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit' : 'Add'} Faculty</DialogTitle>
                    </DialogHeader>
                    <div className='flex flex-col justify-between h-full gap-0'>
                        <div className='flex flex-col justify-between h-72'>
                            <div>
                                {page == 1 && (
                                    <div className='flex flex-col gap-2'>
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
                                            <Label>Middle name <span className='text-xs italic'>(not required)</span></Label>
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
                                        {userRole == 'registrar' ? (
                                            <div>
                                                <Label>Department</Label>
                                                <Select
                                                    name="department_id"
                                                    value={data.department_id}
                                                    onValueChange={(value) =>
                                                        handleChange({ target: { name: 'department_id', value } })
                                                    }
                                                >
                                                    <SelectTrigger
                                                        className={`${errors.department_id ? 'border-red-500' : ''}`}
                                                    >
                                                        <SelectValue placeholder="Select..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {departments.map(dept => (
                                                            <SelectItem value={dept.id}>{dept.department_name} - {dept.department_name_abbreviation}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        ) : (
                                            <></>
                                        )}
                                    </div>
                                )}

                                {page == 2 && (
                                    <div className='flex flex-col gap-2'>
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

export default AddFaculty
