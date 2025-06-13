import React, { useEffect, useState } from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DataTable from "@/Components/ui/DataTable";
import { PageTitle } from '@/Components/ui/PageTitle';
import { Head, Link, usePage } from '@inertiajs/react';
import PreLoader from '@/Components/preloader/PreLoader';
import { formatFullName } from '@/Lib/Utils';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader } from '@/Components/ui/card';
import { Trash, UserMinus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip';
import StudentActions from './StudentActions';
import { useToast } from "@/hooks/use-toast";
import { router } from '@inertiajs/react';

export default function EnrolledStudentList() {
    const { hashedCourseId, courseId, yearlevel, section, yearSectionId, courseName } = usePage().props;
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const { toast } = useToast()

    const yearLevelName =
        yearlevel == 1 ? 'First Year' :
            yearlevel == 2 ? 'Second Year' :
                yearlevel == 3 ? 'Third Year' :
                    yearlevel == 4 ? 'Fourth Year' : '';

    const getEnrolledStudentList = async () => {
        await axios.post(route('get.enrolled.student.list', { id: courseId, yearlevel: yearlevel, yearSectionId: yearSectionId }))
            .then(response => {
                setStudents(response.data)
            })
            .finally(() => {
                setLoading(false);
            })
    }

    useEffect(() => {
        getEnrolledStudentList();
    }, [])


    // state to control modal
    const [studentToUnenroll, setStudentToUnenroll] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const unEnrollStudent = async (id) => {
        try {
            await router.delete(route('enrollment.unenroll', id), {
                preserveScroll: true,
                onSuccess: () => {
                    // Remove the student from the list
                    setStudents(prev => prev.filter(student => student.id !== id));

                    // Close the modal
                    setShowModal(false);

                    // Show success message
                    toast({
                        description: "Student Unenrolled.",
                        variant: "success",
                    });
                },
            });
        } catch (error) {
            console.error("Unenrollment failed", error);
        }
    };

    const openUnenrollModal = (studentId) => {
        const student = students.find(student => student.id == studentId)
        setStudentToUnenroll(student);
        setShowModal(true);
    };

    const handleUnenroll = () => {
        if (studentToUnenroll) {
            unEnrollStudent(studentToUnenroll.id);
        }
    };

    const columns = [
        {
            colName: "Student ID no.",
            accessorKey: "user_id_no",
            header: "Student ID no.",
            headerClassName: 'w-32',
        },
        {
            colName: "Name",
            accessorKey: "name",
            header: "Name",
            headerClassName: 'w-52',
            filterValue: (row) => {
                const { first_name, middle_name, last_name } = row;
                return formatFullName({ first_name, middle_name, last_name }).toLowerCase();
            },
            cell: ({ row }) => {
                const { first_name, middle_name, last_name } = row.original;
                const formattedName = formatFullName({ first_name, middle_name, last_name });
                return <div className="font-medium">{formattedName}</div>;
            },
        },
        {
            colName: "Email",
            accessorKey: "email_address",
            header: "Email",
        },
        {
            colName: "Actions",
            header: "Actions",
            headerClassName: 'w-32 text-right',
            cell: ({ row }) => {
                const { user_id_no, id } = row.original;
                return (
                    <div className="flex justify-end">
                        <Link
                            href={`${route('enrollment.view.student.subjects', {
                                id: hashedCourseId,
                                yearlevel: yearLevelName ? yearLevelName.replace(/\s+/g, '-') : 'First-Year'
                            })}?section=${encodeURIComponent(section)}&id-no=${user_id_no}`}
                        >
                            <Button className="text-green-500 h-auto py-0" variant="link">
                                Subjects
                            </Button>
                        </Link>
                        <Link
                            href={`${route('enrollment.view.student.cor', {
                                id: hashedCourseId,
                                yearlevel: yearLevelName ? yearLevelName.replace(/\s+/g, '-') : 'First-Year'
                            })}?section=${encodeURIComponent(section)}&id-no=${user_id_no}`}
                        >
                            <Button className="text-blue-500 h-auto py-0" variant="link">
                                COR
                            </Button>
                        </Link>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => openUnenrollModal(id)}
                                    variant="icon"
                                    className="text-red-500 py-0 h-min"
                                >
                                    <UserMinus />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Unenroll student</TooltipContent>
                        </Tooltip>
                    </div>
                );
            },
        },
    ];

    if (loading) return <PreLoader title="Students" />

    return (
        <div className='space-y-4'>
            <Head title='Students' />
            <PageTitle align="center">{courseName} - {yearlevel}{section}</PageTitle>
            <Card>
                <CardHeader>
                    {/* <CardTitle>Student List</CardTitle> */}
                </CardHeader>
                <CardContent>
                    <DataTable
                        searchBar={true}
                        columnsFilter={false}
                        columns={columns}
                        data={students}
                    />
                </CardContent>
            </Card>
            {studentToUnenroll && (
                <StudentActions
                    show={showModal}
                    setShowModal={setShowModal}
                    onCancel={() => setShowModal(false)}
                    onConfirm={handleUnenroll}
                    student={studentToUnenroll}
                />
            )}
        </div>
    )
}

EnrolledStudentList.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
