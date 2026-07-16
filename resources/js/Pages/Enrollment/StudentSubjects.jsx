import PreLoader from '@/Components/preloader/PreLoader';
import { PageTitle } from '@/Components/ui/PageTitle';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { convertToAMPM, formatFullNameFML } from '@/Lib/Utils';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import { CirclePlus, Loader2, Search, Trash2, TriangleAlert, Users, Undo2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/Components/ui/card';
import { detectTwoScheduleConflict } from '@/Lib/ConflictUtilities';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import TimeTable from '../ScheduleFormats/TimeTable';
import { Button } from '@/Components/ui/button';
import { Badge } from '@/Components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip';
import SearchSubject from './SearchSubject';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function StudentSubjects() {
    const { courseName, yearlevel, section, student, schoolYear } = usePage().props;

    const [stagedAdds, setStagedAdds] = useState([]);
    const [stagedRemoves, setStagedRemoves] = useState([]);
    const [currentSubjects, setCurrentSubjects] = useState([]); // Initialize empty

    // UI States
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [gettingClasses, setGettingClasses] = useState(false);
    const [searchedClasses, setSearchedClasses] = useState([]);
    const [scheduleType, setScheduleType] = useState('tabular');

    const hasPendingChanges = stagedAdds.length > 0 || stagedRemoves.length > 0;

    const fetchStudentSubjects = async () => {
        const response = await axios.post('/api/enrollment/get-student-subjects', {
            schoolYearId: schoolYear.id,
            studentId: student.user_id_no
        });
        return response.data;
    };

    const { data: originalSubjects = [], isLoading: loading, refetch } = useQuery({
        queryKey: ['student-subjects', schoolYear.id, student.user_id_no],
        queryFn: fetchStudentSubjects
    });

    useEffect(() => {
        if (originalSubjects) {
            setCurrentSubjects(originalSubjects);
        }
    }, [originalSubjects]);

    // Staging Helpers
    const handleStageAdd = (classInfo) => {
        // If undoing a previous removal
        if (stagedRemoves.find(c => c.id === classInfo.id)) {
            setStagedRemoves(prev => prev.filter(c => c.id !== classInfo.id));
            setCurrentSubjects(prev => prev.map(c =>
                c.id === classInfo.id ? { ...c, isPendingRemoval: false } : c
            ));
            return;
        }

        const newClass = { ...classInfo, isPendingAdd: true };
        setStagedAdds(prev => [...prev, newClass]);
        setCurrentSubjects(prev => [...prev, newClass]);
    };

    const handleStageRemove = (classInfo) => {
        // If undoing a previous add
        if (classInfo.isPendingAdd) {
            setStagedAdds(prev => prev.filter(c => c.id !== classInfo.id));
            setCurrentSubjects(prev => prev.filter(c => c.id !== classInfo.id));
            return;
        }

        setStagedRemoves(prev => [...prev, classInfo]);
        setCurrentSubjects(prev => prev.map(c =>
            c.id === classInfo.id ? { ...c, isPendingRemoval: true } : c
        ));
    };

    const handleCancelEdit = () => {
        setEditing(false);
        setStagedAdds([]);
        setStagedRemoves([]);
        setCurrentSubjects(originalSubjects); // Restores perfectly now
        setSearchedClasses([]);
    };

    const handleSaveStagedChanges = async () => {
        setSaving(true);
        const payload = {
            studentId: student.user_id_no,
            schoolYearId: schoolYear.id,
            addedSubjects: stagedAdds.map(subj => ({ classId: subj.id })),
            removedSubjects: stagedRemoves.map(subj => ({ studentSubjectId: subj.student_subject_id }))
        };

        try {
            await axios.post(route('enrollment.save.staged-subjects'), payload);

            await refetch();

            setEditing(false);
            setStagedAdds([]);
            setStagedRemoves([]);
            setSearchedClasses([]);

            toast.success('Student subjects updated successfully!')
        } catch (error) {
            console.error(error);
            toast.error('Something went wrong!')
        } finally {
            setSaving(false);
        }
    };

    // Conflict Detection (Evaluates strictly against visible staged subjects)
    const detectOwnConflict = (schedule) => {
        if (schedule.day === "TBA" || schedule.start_time === "TBA") return false;
        let conflict = false;

        // Ignore subjects that are staged for removal
        const activeSubjects = currentSubjects.filter(cls => !cls.isPendingRemoval);

        activeSubjects.forEach((cls) => {
            if (detectTwoScheduleConflict(schedule, cls) && cls.id !== schedule.id) {
                conflict = true;
                return;
            }

            if (cls.secondary_schedule && cls.secondary_schedule.id !== schedule.id) {
                if (detectTwoScheduleConflict(schedule, cls.secondary_schedule)) {
                    conflict = true;
                    return;
                }
            }
        });

        return conflict;
    };

    const searchSubjectClasses = async (value) => {
        setGettingClasses(true);
        axios.post(route('subject.classes', { schoolYearId: schoolYear.id, subjectCode: value }))
            .then(response => setSearchedClasses(response.data))
            .catch(error => {
                console.error(error);
                setSearchedClasses([]);
            })
            .finally(() => setGettingClasses(false));
    };

    if (loading) return <PreLoader title='Subjects' />;

    // Net Change calculations for badging
    const totalUnitsAdded = stagedAdds.reduce((acc, curr) => acc + (curr.credit_units || 0), 0);
    const totalUnitsRemoved = stagedRemoves.reduce((acc, curr) => acc + (curr.credit_units || 0), 0);

    // Calculate how many subjects will actually remain after saving
    const activeSubjectsCount = currentSubjects.filter(c => !c.isPendingRemoval).length;

    return (
        <div className='space-y-4 pb-28 relative'>
            <Head title="Subjects" />
            <PageTitle align="center">{courseName} - {yearlevel}{section}</PageTitle>
            <PageTitle>{formatFullNameFML(student)}</PageTitle>

            <div className="flex justify-between items-center">
                <Tabs className="w-max" value={scheduleType} onValueChange={setScheduleType} defaultValue="tabular">
                    <TabsList className="grid max-w-max grid-cols-2">
                        <TabsTrigger className="w-28" value="tabular">Tabular</TabsTrigger>
                        <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                    </TabsList>
                </Tabs>

                {!editing && (
                    <Button onClick={() => setEditing(true)} variant="outline">
                        Edit Subjects
                    </Button>
                )}
            </div>

            <Card>
                <CardHeader className="flex flex-row gap-2 mb-2">
                    <CardTitle className="text-2xl font-bold w-full content-center flex justify-between items-center">
                        Current Subjects
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {scheduleType === 'tabular' ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    {/* <TableHead className="w-32">Subject Code</TableHead> */}
                                    <TableHead>Descriptive Title</TableHead>
                                    <TableHead className="w-40">Day</TableHead>
                                    <TableHead className="w-40">Time</TableHead>
                                    <TableHead className="w-3">Units</TableHead>
                                    {editing && <TableHead className="w-48 text-center">Status / Action</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {currentSubjects.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                                            No subjects enrolled.
                                        </TableCell>
                                    </TableRow>
                                ) : currentSubjects.map((classInfo) => {
                                    const mainHasConflict = detectOwnConflict(classInfo);
                                    let secondHasConflict = false;
                                    if (classInfo.secondary_schedule) {
                                        secondHasConflict = detectOwnConflict(classInfo.secondary_schedule);
                                    }

                                    return (
                                        <TableRow
                                            key={classInfo.id}
                                            className={`${classInfo.isPendingRemoval ? 'opacity-50 bg-muted/50' : ''}`}
                                        >
                                            {/* <TableCell>{classInfo.subject_code}</TableCell> */}
                                            <TableCell className="truncate max-w-48 overflow-hidden whitespace-nowrap">
                                                {classInfo.descriptive_title}
                                            </TableCell>
                                            <TableCell>
                                                <div className='flex flex-col'>
                                                    <span className={`${mainHasConflict && !classInfo.isPendingRemoval ? 'bg-destructive text-white px-1 rounded' : ''}`}>
                                                        {classInfo.day === 'TBA' ? '-' : classInfo.day}
                                                    </span>
                                                    {classInfo.secondary_schedule && (
                                                        <span className={`${secondHasConflict && !classInfo.isPendingRemoval ? 'bg-destructive text-white px-1 rounded' : ''}`}>
                                                            {classInfo.secondary_schedule.day === 'TBA' ? '-' : classInfo.secondary_schedule.day}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className='flex flex-col'>
                                                    <span className={`${mainHasConflict && !classInfo.isPendingRemoval ? 'bg-destructive text-white px-1 rounded' : ''}`}>
                                                        {classInfo.start_time !== "TBA" ? `${convertToAMPM(classInfo.start_time)} - ${convertToAMPM(classInfo.end_time)}` : "-"}
                                                    </span>
                                                    {classInfo.secondary_schedule && (
                                                        <span className={`${secondHasConflict && !classInfo.isPendingRemoval ? 'bg-destructive text-white px-1 rounded' : ''}`}>
                                                            {classInfo.secondary_schedule.start_time !== "TBA" ? `${convertToAMPM(classInfo.secondary_schedule.start_time)} - ${convertToAMPM(classInfo.secondary_schedule.end_time)}` : '-'}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className='text-center'>{classInfo.credit_units}</TableCell>
                                            {editing && (
                                                <TableCell className="text-center space-x-2 flex items-center justify-end">
                                                    {classInfo.isPendingAdd && <Badge className="bg-green-600 hover:bg-green-700">Pending Add</Badge>}
                                                    {classInfo.isPendingRemoval && <Badge variant="destructive">Pending Removal</Badge>}

                                                    {!classInfo.isPendingRemoval && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" onClick={() => handleStageRemove(classInfo)} className="h-8 w-8 text-destructive">
                                                                    <Trash2 size={16} />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Remove Subject</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                    {classInfo.isPendingRemoval && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button variant="ghost" size="icon" onClick={() => handleStageAdd(classInfo)} className="h-8 w-8">
                                                                    <Undo2 size={16} />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Undo Removal</TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : (
                        <TimeTable data={currentSubjects.filter(c => !c.isPendingRemoval)} />
                    )}
                </CardContent>
            </Card>

            {editing && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle className='text-3xl'>Search Classes</CardTitle>
                            <span className='text-sm italic font-thin text-muted-foreground'>
                                (A red background indicates a conflict of day and time with the active classes.)
                            </span>
                        </CardHeader>
                        <CardContent className='space-y-4'>
                            <div className="flex flex-col mt-2">
                                <SearchSubject searchSubjectClasses={searchSubjectClasses} schoolYearId={schoolYear.id} />
                            </div>
                            <Card className='shadow-lg'>
                                <CardContent className='p-0'>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Course & Section</TableHead>
                                                {/* <TableHead>Subject Code</TableHead> */}
                                                <TableHead>Descriptive Title</TableHead>
                                                <TableHead>Students</TableHead>
                                                <TableHead>Day</TableHead>
                                                <TableHead>Time</TableHead>
                                                <TableHead>Units</TableHead>
                                                <TableHead></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {gettingClasses ? (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center border-y py-6 animate-pulse text-muted-foreground">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span className="font-medium">Searching for classes...</span>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ) : searchedClasses.length > 0 ? (
                                                searchedClasses.map(classInfo => {
                                                    const mainConflict = detectOwnConflict(classInfo);
                                                    const secondConflict = classInfo.secondary_schedule ? detectOwnConflict(classInfo.secondary_schedule) : false;
                                                    const conflict = mainConflict || secondConflict;

                                                    // Ensure we ignore subjects marked as "Pending Removal" when looking up duplicates
                                                    const isCurrentlyEnrolled = currentSubjects.find(c => c.subject_code === classInfo.subject_code && !c.isPendingRemoval);

                                                    return (
                                                        <TableRow key={classInfo.id} className={`${conflict && !isCurrentlyEnrolled ? 'bg-destructive hover:bg-destructive/90 text-destructive-foreground' : ''}`}>
                                                            <TableCell className='w-36'>{classInfo.class_code}</TableCell>
                                                            {/* <TableCell className='w-28'>{classInfo.subject_code}</TableCell> */}
                                                            <TableCell className='truncate max-w-48'>{classInfo.descriptive_title}</TableCell>
                                                            <TableCell className='flex gap-1 items-center'>
                                                                <Users size={14} /> {classInfo.student_count}
                                                            </TableCell>
                                                            <TableCell className="w-36">
                                                                <div className='flex flex-col'>
                                                                    <span>{classInfo.day === 'TBA' ? '-' : classInfo.day}</span>
                                                                    <span>{classInfo.secondary_schedule ? (classInfo.secondary_schedule.day === 'TBA' ? '-' : classInfo.secondary_schedule.day) : null}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="w-40">
                                                                <div className='flex flex-col'>
                                                                    <span>{classInfo.start_time !== "TBA" ? `${convertToAMPM(classInfo.start_time)} - ${convertToAMPM(classInfo.end_time)}` : "-"}</span>
                                                                    <span>{classInfo.secondary_schedule ? (classInfo.secondary_schedule.start_time !== "TBA" ? `${convertToAMPM(classInfo.secondary_schedule.start_time)} - ${convertToAMPM(classInfo.secondary_schedule.end_time)}` : '-') : null}</span>
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className='w-8 text-center'>{classInfo.credit_units}</TableCell>
                                                            <TableCell className="w-8">
                                                                <div className='flex justify-center'>
                                                                    {conflict ? (
                                                                        <Tooltip>
                                                                            <TooltipTrigger asChild>
                                                                                <Button disabled variant="ghost" size="icon" className="text-gray-500 cursor-not-allowed">
                                                                                    <TriangleAlert size={16} />
                                                                                </Button>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent className='flex items-center gap-2 text-orange-500'>
                                                                                <TriangleAlert /> Schedule Conflict
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    ) : (
                                                                        <Button
                                                                            disabled={isCurrentlyEnrolled}
                                                                            variant="ghost"
                                                                            size="icon"
                                                                            className={`${isCurrentlyEnrolled ? 'text-gray-500 cursor-not-allowed' : 'text-green-600 hover:text-green-700'}`}
                                                                            onClick={() => handleStageAdd(classInfo)}
                                                                        >
                                                                            <CirclePlus size={20} />
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    )
                                                })
                                            ) : (
                                                <TableRow>
                                                    <TableCell colSpan={8} className="text-center border-y text-muted-foreground py-6">
                                                        No classes found.
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </CardContent>
                    </Card>

                    {/* Sticky Edit Footer / Staged Changes Summary */}
                    <div className="fixed bottom-4 z-50 flex gap-4 ">
                        <Card>
                            <CardContent className='pt-4 flex gap-10'>
                                <div className="flex items-center gap-6">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-semibold text-muted-foreground">Staged Changes Summary</span>
                                        {hasPendingChanges ? (
                                            <div className="flex gap-4 mt-1">
                                                <Badge className="bg-green-600">Added: {stagedAdds.length} ({totalUnitsAdded} Units)</Badge>
                                                <Badge variant="destructive">Removed: {stagedRemoves.length} ({totalUnitsRemoved} Units)</Badge>
                                                <Badge variant="outline">Net Units: {(totalUnitsAdded - totalUnitsRemoved) > 0 ? '+' : ''}{totalUnitsAdded - totalUnitsRemoved}</Badge>
                                            </div>
                                        ) : (
                                            <span className="text-sm text-muted-foreground">No pending changes.</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-end gap-4">
                                    <Button variant="outline" onClick={handleCancelEdit} disabled={saving}>
                                        <X className="mr-2 h-4 w-4" /> Cancel
                                    </Button>
                                    <Button
                                        onClick={handleSaveStagedChanges}
                                        disabled={!hasPendingChanges || saving || activeSubjectsCount === 0}
                                    >
                                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                        {saving ? "Saving Changes..." : "Save Staged Changes"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
}

StudentSubjects.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;