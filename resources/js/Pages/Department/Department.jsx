import PreLoader from '@/Components/preloader/PreLoader';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/Components/ui/card';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import axios from 'axios';
import { CirclePlus, UserPlus } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { Pencil } from 'lucide-react';
import AddDepartment from './AddDepartment';
import AddProgram from './AddProgram';
import AssignDean from './AssignDean';

export default function Department() {
    const [departments, setDepartments] = useState([])

    const [loading, setLoading] = useState(true);
    const [openAddhHead, setOpenAddhHead] = useState(false);
    const [openProgram, setOpenProgram] = useState(false);
    const [editingProgram, setEditingProgram] = useState(false);
    const [openDepartment, setOpenDepartment] = useState(false);
    const [program, setProgram] = useState({}); 

    const [selectedDepartment, setSelectedDepartment] = useState([])
    const [faculties, setFaculties] = useState([])

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

    const getDepartmentFaculties = async (id) => {
        await axios.post(route('department.faculties', { id: id }))
            .then(response => {
                setFaculties(response.data)
            })
    }


    if (loading) return <PreLoader title="Department" />

    return (
        <div className="space-y-8">
            <Head title="Department Overview" />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {departments.map((dept) => (
                    <Card key={dept.id} className="rounded-2xl border shadow-sm">
                        <CardHeader className="pb-2 border-b">
                            <div className="flex items-start justify-between flex-wrap gap-2">
                                <div>
                                    <h2 className="text-lg font-bold leading-tight">
                                        {dept.department_name}
                                    </h2>
                                    <p className="text-sm text-muted-foreground">
                                        ({dept.department_name_abbreviation})
                                    </p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setOpenAddhHead(true);
                                        if (selectedDepartment.id === dept.id && faculties.length > 0) return;
                                        setFaculties([]);
                                        getDepartmentFaculties(dept.id);
                                        setSelectedDepartment(dept);
                                    }}
                                    title="Assign Department Head"
                                    aria-label="Assign Head"
                                >
                                    <UserPlus className="mr-1 w-4 h-4" />
                                    Assign Head
                                </Button>
                            </div>
                        </CardHeader>

                        <CardContent className="space-y-4 pt-6">
                            <div className="text-sm">
                                <span className="text-muted-foreground">Head:</span>{" "}
                                <span className="font-medium">{dept.full_name || "Unassigned"}</span>
                            </div>

                            <div>
                                <h3 className="text-sm font-medium text-muted-foreground mb-1">
                                    Programs Offered:
                                </h3>
                                {dept.course.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {dept.course.map((course) => (
                                            <div className='flex gap-2 w-full'>
                                                <div
                                                    key={course.id}
                                                    className="inline-flex items-center gap-2 px-3 py-1.5 border rounded-md bg-muted/60 text-sm hover:bg-muted transition w-full"
                                                >
                                                    <span>{course.course_name}</span>
                                                </div>
                                                <div className='flex items-center'>
                                                    <Pencil
                                                        onClick={() => {
                                                            setProgram(course);
                                                            setEditingProgram(true);
                                                            setOpenProgram(true);
                                                            setSelectedDepartment(dept);
                                                        }}
                                                        size={14}
                                                        className="text-green-600 cursor-pointer hover:scale-105 transition"
                                                        title="Edit Program"
                                                        aria-label="Edit Program"
                                                    />
                                                </div>
                                            </div >
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground text-sm italic border border-dashed rounded-md px-4 py-2 bg-muted/30">
                                        No programs available for this department.
                                    </p>
                                )}
                            </div>
                        </CardContent>

                        <CardFooter className="flex justify-end pt-3 border-t">
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => {
                                    setOpenProgram(true);
                                    setSelectedDepartment(dept);
                                }}
                            >
                                <CirclePlus className="mr-1 h-4 w-4" />
                                Add Program
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end">
                <Button onClick={() => setOpenDepartment(true)} size="lg">
                    <CirclePlus className="mr-2 h-5 w-5" />
                    Add Department
                </Button>
            </div>

            {/* Modals */}
            <AssignDean
                open={openAddhHead}
                setOpen={setOpenAddhHead}
                department={selectedDepartment}
                faculties={faculties}
                getDepartmentsAndPrograms={getDepartmentsAndPrograms}
            />

            <AddProgram
                open={openProgram}
                setOpen={setOpenProgram}
                department={selectedDepartment}
                setDepartment={setSelectedDepartment}
                getDepartmentsAndPrograms={getDepartmentsAndPrograms}
                editing={editingProgram}
                setEditing={setEditingProgram}
                program={program}
            />

            <AddDepartment
                open={openDepartment}
                setOpen={setOpenDepartment}
                getDepartmentsAndPrograms={getDepartmentsAndPrograms}
            />
        </div>

    )
}


Department.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
