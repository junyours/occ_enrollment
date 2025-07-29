import React, { useEffect, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { usePage, useForm } from "@inertiajs/react";
import { cn } from "@/Lib/Utils"
import { Button } from "@/Components/ui/button"
import { useToast } from "@/hooks/use-toast";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/Components/ui/card"
import { Head } from '@inertiajs/react';
import axios from "axios";
import PreLoader from "@/Components/preloader/PreLoader";
import { Separator } from "@/Components/ui/separator"
import { PageTitle } from "@/Components/ui/PageTitle";
import EnhancedDownloadDialog from "./EnhancedDownloadDialog";
import AddNewSection from "./CourseSectionPartials/AddNewSection";
import YearLevelSections from "./CourseSectionPartials/YearLevelSections";

export default function EnrollmentCourseSection({ courseId, error, course, schoolYearId, forSchoolYear = false, semester, schoolYear }) {
    const user = usePage().props.auth.user;

    const [yearLevels, setYearLevels] = useState([]);
    const [fetching, setFetching] = useState(true);

    const { toast } = useToast()
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [editing, setEditing] = useState(false);

    const [isDownloading, setIsDownloading] = useState(false);

    const { data, setData, post, processing, errors, reset, setError, clearErrors } = useForm({
        id: 0,
        course_id: courseId,
        year_level_id: 0,
        section: "",
        max_students: 50
    });

    const yearLevel =
        data.year_level_id === 1 ? 'First year' :
            data.year_level_id === 2 ? 'Second year' :
                data.year_level_id === 3 ? 'Third year' :
                    data.year_level_id === 4 ? 'Fourth year' : '';

    const createNewSection = (year_level_id) => {
        setData('year_level_id', year_level_id);
        setIsDialogOpen(true);

        yearLevels.some((yearLevel) => {
            if (yearLevel.id == year_level_id) {
                const yearSection = yearLevel.year_section.length;

                const sectionLetter = String.fromCharCode(65 + yearSection);

                setData('section', sectionLetter)
                return true;
            }
        });
    };

    const maxStudentsOnChange = (e) => {
        const { name, value } = e.target;
        if (!value) {
            setError('max_students', { error: true })
        } else {
            clearErrors();
        }

        // Allow only numbers
        if (!/^\d*$/.test(value)) return;

        setData("max_students", value);
        clearErrors(name)
    };

    const sectionOnChange = (e) => {
        const { name, value } = e.target;
        if (!value) {
            setError('section', { error: true })
        } else {
            clearErrors();
        }

        setData("section", value);
        clearErrors(name)
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const maxStudents = parseInt(data.max_students, 10);

        if (!maxStudents || maxStudents < 15 || maxStudents > 100) {
            setError("max_students", "Max students must be between 15 and 100.");
            return;
        }

        post(route('add.new.section', { schoolYearId }), {
            onSuccess: () => {
                reset();
                setIsDialogOpen(false);
                toast({
                    description: "Section added successfully.",
                    variant: "success",
                });
                getEnrollmentCourseSection();
            },
            onError: (errors) => {
                if (errors.curriculum_id) {
                    toast({
                        description: errors.curriculum_id,
                        variant: "destructive",
                    });
                }
            },
            preserveScroll: true,
        });
    };

    const submitEdit = (e) => {
        post(route('edit.section'), {
            onSuccess: () => {
                reset();
                toast({
                    description: "Section edited successfully.",
                    variant: "success",
                });
                getEnrollmentCourseSection();
                reset();
                setEditing(false);
            },
            onError: (errors) => {
                if (errors.curriculum_id) {
                    toast({
                        description: errors.curriculum_id,
                        variant: "destructive",
                    });
                }
            },
            preserveScroll: true,
        });
    };

    const getEnrollmentCourseSection = async () => {
        await axios.post(`/enrollment/${courseId}/${schoolYearId}`)
            .then(response => {
                setYearLevels(response.data)
            })
            .finally(() => {
                setFetching(false)
            })
    }

    useEffect(() => {
        getEnrollmentCourseSection()
    }, [])

    const closeAddingSectionDialog = () => {
        setIsDialogOpen(false)
        clearErrors()
    }

    if (fetching) return <PreLoader title="Sections" />

    if (error) return

    return (
        <div className="container">
            <Head title="Sections" />
            <PageTitle className="mb-4" align="center"> {course.course_name} {course.major && ` MAJOR IN ${course.major}`}</PageTitle>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {yearLevels && yearLevels.length > 0 ? (
                    yearLevels.map((yearLevel) => (
                        <Card key={yearLevel.id} className={cn("w-full")}>
                            <div className="flex justify-between items-center mb-2">
                                <CardHeader>
                                    <CardTitle className="text-2xl">{yearLevel.year_level_name}</CardTitle>
                                </CardHeader>
                                {user.user_role == "program_head" && (
                                    <CardHeader className="px-6 mt-4">
                                        <Button
                                            onClick={() => createNewSection(yearLevel.id)}
                                        >
                                            Add Section
                                        </Button>
                                    </CardHeader>
                                )}
                            </div>
                            <Separator />
                            <CardContent className="grid gap-4">
                                <YearLevelSections
                                    yearLevel={yearLevel}
                                    editing={editing}
                                    data={data}
                                    sectionOnChange={sectionOnChange}
                                    errors={errors}
                                    maxStudentsOnChange={maxStudentsOnChange}
                                    setEditing={setEditing}
                                    reset={reset}
                                    clearErrors={clearErrors}
                                    forSchoolYear={forSchoolYear}
                                    courseId={courseId}
                                    setData={setData}
                                    submitEdit={submitEdit}
                                    post={post}
                                    getEnrollmentCourseSection={getEnrollmentCourseSection}
                                    setIsDownloading={setIsDownloading}
                                    schoolYearId={schoolYearId}
                                />
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <p className="text-gray-500">No year levels found.</p>
                )}
            </div>

            {/* Dialog Component (Outside of the Map Loop) */}
            <AddNewSection isDialogOpen={isDialogOpen}
                setIsDialogOpen={setIsDialogOpen}
                data={data}
                yearLevel={yearLevel}
                handleSubmit={handleSubmit}
                maxStudentsOnChange={maxStudentsOnChange}
                errors={errors}
                processing={processing}
                closeAddingSectionDialog={closeAddingSectionDialog}
            />

            <EnhancedDownloadDialog
                isDownloading={isDownloading}
                setIsDownloading={setIsDownloading}
            />
        </div >
    );
}

EnrollmentCourseSection.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
