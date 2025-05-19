import PreLoader from '@/Components/preloader/PreLoader';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';
import { CirclePlus } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { formatFullName } from '@/Lib/Utils';
import { Label } from '@/Components/ui/label';
import { Input } from '@/Components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function Department() {
    const [departments, setDepartments] = useState([])

    const { toast } = useToast()

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [openAddhHead, setOpenAddhHead] = useState(false);
    const [openProgram, setOpenProgram] = useState(false);
    const [openDepartment, setOpenDepartment] = useState(false);

    const [selectedDepartment, setSelectedDepartment] = useState([])
    const [faculties, setFaculties] = useState([])
    const [assigningHeadId, setAssigningHeadId] = useState(0)

    const { data: programData, setData: setProgramData, post: programPost, processing: programProcessing, errors: programErrors, setError: setProgramError, reset: programReset, clearErrors: clearProgramErrors, reset: resetProgram } = useForm({
        department_id: 0,
        course_name: '',
        course_name_abbreviation: '',
    });

    const { data: departmentData, setData: setDepartmentData, post: departmentPost, processing: departmentProcessing, errors: departmentErrors, setError: setDepartmentError, reset: departmentReset, clearErrors: clearDepartmentErrors, reset: resetDepartment } = useForm({
        department_name: '',
        department_name_abbreviation: '',
    });

    const getDepartmentsAndPrograms = async () => {
        await axios.post(route('department.course'))
            .then(response => {
                setDepartments(response.data);
            })
            .finally(() => {
                setLoading(false);
            });
    }

    useEffect(() => {
        getDepartmentsAndPrograms()
    }, []);

    const submitDeptHead = async (deptid, facid) => {
        setSubmitting(true);
        setAssigningHeadId(facid);

        await axios.post(route('assign.department.head', { deptID: deptid, facID: facid }))
            .then(response => {
                if (response.data.message == 'success') {
                    setOpenAddhHead(false);
                    getDepartmentsAndPrograms();
                    toast({
                        description: "Dean assigned successfully",
                        variant: "success",
                    })
                };
            })
            .finally(() => {
                setSubmitting(false);
                setAssigningHeadId(0);
            })
    }

    const getDepartmentFaculties = async (id) => {
        await axios.post(route('department.faculties', { id: id }))
            .then(response => {
                setFaculties(response.data)
            })
    }

    const handleProgramChange = (e) => {
        const { name, value } = e.target;
        if (value.trim() === '') {
            setProgramError(name, 'Required');
        } else {
            clearProgramErrors(name);
        }
        setProgramData(name, value);
    };

    const checkProgramErrors = () => {
        clearProgramErrors();

        let errors = {};

        if (programData.course_name == '') errors.course_name = "Required";
        if (programData.course_name_abbreviation == '') errors.course_name_abbreviation = "Required";

        if (Object.keys(errors).length > 0) {
            setProgramError(errors);
            return true;
        }
        return;
    }

    const submitProgram = async () => {
        if (checkProgramErrors()) return;
        await programPost(route('department.add.program', programData), {
            onSuccess: () => {
                resetProgram()
                getDepartmentsAndPrograms()
                toast({
                    description: "Program added successfuly",
                    variant: "success",
                })
                setOpenProgram(false);
            },
            preserveScroll: true,
        });
    };

    const handleDepartmentChange = (e) => {
        const { name, value } = e.target;
        if (value.trim() === '') {
            setDepartmentError(name, 'Required');
        } else {
            clearDepartmentErrors(name);
        }
        setDepartmentData(name, value);
    };

    const checkDepartmentErrors = () => {
        clearDepartmentErrors();

        let errors = {};

        if (departmentData.department_name == '') errors.department_name = "Required";
        if (departmentData.department_name_abbreviation == '') errors.department_name_abbreviation = "Required";

        if (Object.keys(errors).length > 0) {
            setDepartmentError(errors);
            return true;
        }
        return;
    }

    const submitDepartment = async () => {
        if (checkDepartmentErrors()) return;
        await departmentPost(route('department.add.department', programData), {
            onSuccess: () => {
                resetProgram()
                getDepartmentsAndPrograms()
                toast({
                    description: "Department added successfuly",
                    variant: "success",
                })
                setOpenDepartment(false);
            },
            preserveScroll: true,
        });
    }

    if (loading) return <PreLoader title="Departments" />

    return (
        <div className='space-y-4'>
            <Head title='Departments' />
            {departments.map((dept) => (
                <Card key={dept.id}>
                    <CardHeader>
                        <CardTitle>{dept.department_name} - {dept.department_name_abbreviation}</CardTitle>
                        <CardDescription
                            className='flex gap-2'>
                            Head: {dept.full_name || 'none'}
                            <Pencil onClick={() => {
                                setOpenAddhHead(true);
                                if (selectedDepartment.id == dept.id && faculties.length > !0) return
                                setFaculties([]);
                                getDepartmentFaculties(dept.id);
                                setSelectedDepartment(dept);
                            }}
                                className='cursor-pointer text-green-500'
                                size={15} />
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableBody>
                                {dept.course.length > 0 ? (
                                    dept.course.map((course) => (
                                        <TableRow key={course.id}>
                                            <TableCell>
                                                {course.course_name} - {course.course_name_abbreviation}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={1} className="text-center text-gray-500">
                                            No programs available.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                    <CardFooter>
                        <Button
                            onClick={() => {
                                setOpenProgram(true)
                                setSelectedDepartment(dept)
                                setProgramData('department_id', dept.id)
                            }}
                            variant="secondary"
                        >
                            Add program
                        </Button>
                    </CardFooter>
                </Card>
            ))}

            <Button
                onClick={() => setOpenDepartment(true)}
            >
                Add Department
                <CirclePlus
                    size={15}
                />
            </Button>

            <Dialog open={openAddhHead} onOpenChange={setOpenAddhHead}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Assign Dean</DialogTitle>
                        <DialogDescription>
                            {selectedDepartment.department_name} - {selectedDepartment.department_name_abbreviation}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mb-6 h-64 max-h-64 overflow-y-auto">
                        <Table>
                            <TableBody>
                                {faculties.map((fac) => (
                                    <TableRow key={fac.id}>
                                        <TableCell>
                                            {formatFullName(fac)}
                                        </TableCell>
                                        <TableCell className='text-right'>
                                            <Button
                                                disabled={fac.user_role == 'program_head' || fac.user_role == 'registrar' || submitting}
                                                className='py-1 h-max disabled:cursor-not-allowed'
                                                onClick={() => { submitDeptHead(selectedDepartment.id, fac.id) }}
                                            >
                                                {fac.id == assigningHeadId ? 'Assigning' : 'Assign'}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={openProgram} onOpenChange={setOpenProgram}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add Program</DialogTitle>
                        <DialogDescription>
                            {selectedDepartment.department_name} - {selectedDepartment.department_name_abbreviation}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="max-h-64">
                        <Label>Name:</Label>
                        <Input
                            name="course_name"
                            value={programData.course_name}
                            onChange={handleProgramChange}
                            className={`mb-2 ${programErrors.course_name && 'border-red-500'}`}
                        />
                        <Label>Abbreviation:</Label>
                        <Input
                            name="course_name_abbreviation"
                            value={programData.course_name_abbreviation}
                            onChange={handleProgramChange}
                            className={`mb-2 ${programErrors.course_name_abbreviation && 'border-red-500'}`}
                        />
                    </div>
                    <DialogFooter>
                        <Button disabled={programProcessing} onClick={submitProgram} type="submit">Save changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={openDepartment} onOpenChange={setOpenDepartment}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add Department</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-64">
                        <Label>Name:</Label>
                        <Input
                            name="department_name"
                            value={departmentData.department_name}
                            onChange={handleDepartmentChange}
                            className={`mb-2 ${departmentErrors.department_name && 'border-red-500'}`}
                        />
                        <Label>Abbreviation:</Label>
                        <Input
                            name="department_name_abbreviation"
                            value={departmentData.department_name_abbreviation}
                            onChange={handleDepartmentChange}
                            className={`mb-2 ${departmentErrors.department_name_abbreviation && 'border-red-500'}`}
                        />
                    </div>
                    <DialogFooter>
                        <Button disabled={departmentProcessing} onClick={submitDepartment} type="submit">Save changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}


Department.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
