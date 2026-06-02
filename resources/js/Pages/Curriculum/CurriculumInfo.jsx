import React, { useState, useEffect } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import axios from "axios";
import { Card, CardHeader, CardTitle, CardContent } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";
import { LogOut, Replace, SquarePlus, X } from "lucide-react"; // Close icon for modal
import CurriculumTable from "./CurriculumTable";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/Components/ui/dialog";
import { Head, useForm, usePage } from "@inertiajs/react";
import { useToast } from "@/hooks/use-toast";
import PreLoader from "@/Components/preloader/PreLoader";
import { PageTitle } from "@/Components/ui/PageTitle";

export default function CurriculumInfo() {
    const { course_name, course_name_abbreviation, years } = usePage().props
    const [adding, setAdding] = useState(false);

    const { data, setData, post, processing, errors, reset, setError, clearErrors } = useForm({
        curriculum_term_id: '',
        year_level: '',
        semester_id: '',
        subject_code: '',
        descriptive_title: '',
        credit_units: 3,
        lecture_hours: 3,
        laboratory_hours: 0,
    });

    const yearLevels = {
        firstYear: "First Year",
        secondYear: "Second Year",
        thirdYear: "Third Year",
        fourthYear: "Fourth Year"
    };

    const semesters = {
        1: "First Sem",
        2: "Second Sem",
        3: "Third Sem",
    };

    const [curriculumData, setCurriculumData] = useState({
        firstYear: [],
        secondYear: [],
        thirdYear: [],
        fourthYear: []
    });

    const { toast } = useToast()
    const [fetching, setFetching] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState(null);
    const [nextSemester, setNextSemester] = useState(1);

    const { data: semesterData, setData: setSemesterData, post: semesterPost, processing: semesterProcessing, errors: semesterErrors, reset: semesterReset } = useForm({
        semester_id: '',
        year_level_id: '',
        curr_id: '',
    });

    useEffect(() => {
        getCurriculumInfo();
    }, []);

    const getCurriculumInfo = async () => {
        await axios.post("")
            .then(response => {
                const data = response.data.curriculum;
                setSemesterData('curr_id', response.data.curriculum_id)

                if (Array.isArray(data) && data.length > 0) {
                    const curriculumTerms = data[0].curriculum_term;

                    // Group by year level and sort by semester
                    const groupedByYear = curriculumTerms.reduce((acc, term) => {
                        if (!acc[term.year_level_id]) {
                            acc[term.year_level_id] = [];
                        }
                        acc[term.year_level_id].push(term);
                        return acc;
                    }, {});

                    // Sort each year's terms by semester_id
                    Object.keys(groupedByYear).forEach(year => {
                        groupedByYear[year].sort((a, b) => a.semester_id - b.semester_id);
                    });

                    setCurriculumData({
                        firstYear: groupedByYear[1] || [],
                        secondYear: groupedByYear[2] || [],
                        thirdYear: groupedByYear[3] || [],
                        fourthYear: groupedByYear[4] || []
                    });
                }
            })
            .catch(error => {
                console.error("Error fetching curriculum info:", error);
            })
            .finally(() => {
                setFetching(false);
            })
    };

    const handleOpenModal = (yearKey) => {
        setSelectedYear(yearKey);

        // Mapping yearKey to a numeric year_level_id
        const yearLevelMapping = {
            firstYear: 1,
            secondYear: 2,
            thirdYear: 3,
            fourthYear: 4
        };

        const yearLevelId = yearLevelMapping[yearKey] || null;

        // Get the next semester number
        const currentSemesters = curriculumData[yearKey]?.length || 0;
        const nextSemester = currentSemesters + 1;

        // Set the values
        setNextSemester(nextSemester);
        setSemesterData('year_level_id', yearLevelId);
        setSemesterData('semester_id', nextSemester);

        setDialogOpen(true);
    };

    const handleCloseModal = () => {
        setDialogOpen(false);
        setSelectedYear(null);
        setNextSemester(1);
    };

    const handleAddSemester = (e) => {
        e.preventDefault();
        semesterPost(route('add.semester', semesterData), {
            onSuccess: () => {
                semesterReset('semester_id', 'year_level_id');
                setDialogOpen(false);
                toast({
                    description: "Semester added successfully.",
                    variant: "success",
                })
                getCurriculumInfo();
            },
            preserveScroll: true,
        });
    };

    const addSubject = (termId, yearLevel, semesterId) => {
        setAdding(true);
        setData('curriculum_term_id', termId)
        setData('year_level', yearLevel)
        setData('semester_id', semesterId)
    }

    const submit = async () => {
        let error
        if (!data.subject_code) {
            setError('subject_code', { error: true })
            error = true
        }
        if (!data.descriptive_title) {
            setError('descriptive_title', { error: true })
            error = true
        }

        if (error) return

        await post(route('curr.addsubject'), {
            onSuccess: () => {
                getCurriculumInfo();
                setAdding(false);
            },
        })
    }

    const onChange = (e) => {
        const { name, value } = e.target;
        if (name == 'subject_code' && value.includes(' ')) return;
        setData(name, value);
        clearErrors(name);
        if (!value) setError(name, { error: true });
    }

    const onNumberFormChange = (name) => (value) => {
        if (name === 'subject_code' && value.includes(' ')) return;
        setData(name, value);
    };

    if (fetching) return <PreLoader title="Curriculum" />

    return (
        <div className="p-6 space-y-6">
            <Head title={course_name_abbreviation + ' Curriculum'} />
            <PageTitle align='center' >CURRICULUM: {course_name_abbreviation}  {years.join('-')}</PageTitle>

            {Object.entries(yearLevels).map(([yearKey, yearName]) => (
                <Card key={yearKey}>
                    <CardHeader>
                        <CardTitle className="text-2xl">{yearName}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {curriculumData[yearKey].length > 0 ? (
                            curriculumData[yearKey].map((term) => (
                                <CurriculumTable key={term.id} termId={term.id} data={term} yearlevel={yearName} semesterId={term.semester_id} adding={adding} addSubject={addSubject} form={data} setAdding={setAdding} submit={submit} onChange={onChange} onNumberFormChange={onNumberFormChange} errors={errors} processing={processing} getCurriculumInfo={getCurriculumInfo} />
                            ))
                        ) : (
                            <p className="text-gray-500">No data available</p>
                        )}

                        {(curriculumData[yearKey].length < 3 && !adding) && (
                            <div className="w-full flex justify-center">
                                <Button
                                    size="lg"
                                    variant="ghost"
                                    className="self-center flex items-center gap-2"
                                    onClick={() => handleOpenModal(yearKey)}
                                >
                                    Add Semester
                                    <SquarePlus className="w-5 h-5" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            ))}

            {/* ADD SEMESTER */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Semester</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleAddSemester} className="space-y-4">
                        <div className="space-y-4">
                            <p className="text-lg font-semibold">{yearLevels[selectedYear]} - {semesters[nextSemester]}</p>
                        </div>

                        <DialogFooter>
                            {/* Cancel button explicitly set to type="button" */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleCloseModal}>
                                Cancel
                            </Button>

                            {/* Submit button first so Enter triggers it */}
                            <Button
                                type="submit"
                                disabled={semesterProcessing}>
                                Confirm
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

CurriculumInfo.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
