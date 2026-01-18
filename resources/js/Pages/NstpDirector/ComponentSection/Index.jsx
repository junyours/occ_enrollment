import { PageTitle } from '@/Components/ui/PageTitle';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, BookOpen, CircleCheck, CircleX, Pencil } from 'lucide-react';
import SectionSkeleton from './SectionSkeleton';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Button } from '@/Components/ui/button';
import { useSection } from './useSection';
import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { formatFullName } from '@/Lib/Utils';
import Scheduling from './Scheduling';
import RoomSchedules from './RoomSchedules';
import InstructorSchedules from './InstructorSchedules';
import { Input } from '@/Components/ui/input';
import { toast } from 'sonner';
import axios from 'axios';

const TableHeadTemplate = ({ children }) => {
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead className='border-r pr-4'>Students</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead />
                </TableRow>
            </TableHeader>
            <TableBody>
                {children}
            </TableBody>
        </Table>
    );
};

export default function Index({ component }) {
    const { selectedSchoolYearEntry } = useSchoolYearStore();
    const setSections = useSection(state => state.setSections);
    const setEditingSection = useSection(state => state.setEditingSection);
    const selectedSection = useSection(state => state.selectedSection);
    const setSelectedSectionField = useSection(state => state.setSelectedSectionField);
    const rooms = useSection(state => state.rooms);
    const setRooms = useSection(state => state.setRooms);
    const instructors = useSection(state => state.instructors);
    const setInstructors = useSection(state => state.setInstructors);
    const mainScheduleConflictList = useSection(state => state.mainScheduleConflictList);


    const [editingSectionMaxStudnet, setEditingSectionMaxStudnet] = useState([]);

    const submitMaxStudents = async () => {
        if (editingSectionMaxStudnet.max_students <= 15) return toast.error('The maximum number of students must exceed 15.');
        await axios.post(route('nstp-director.change-max-students'), { nstpSectionId: editingSectionMaxStudnet.id, maxStudent: editingSectionMaxStudnet.max_students })
            .finally(() => {
                refetch();
                setEditingSectionMaxStudnet([]);
            });
    }

    useEffect(() => {
        useSection.getState().reset();
    }, [component]);

    const [addingSection, setAddingSection] = useState(false);

    const getSections = async () => {
        const response = await axios.post('', {
            schoolYearId: selectedSchoolYearEntry.id,
        })
        setSections(response.data)
        return response.data;
    };

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['nstp-director.component.sections', component, selectedSchoolYearEntry?.id],
        queryFn: getSections,
        enabled: !!selectedSchoolYearEntry?.id && !!component,
    });

    if (!selectedSchoolYearEntry?.id) return <></>

    const addSection = async () => {
        setAddingSection(true);

        router.post(
            route('nstp-director.add-section', {
                schoolYearId: selectedSchoolYearEntry.id,
            }),
            { component },
            {
                preserveScroll: true,
                onFinish: async () => {
                    await refetch();
                    setAddingSection(false);
                },
                onError: (errors) => {
                    console.log(errors);
                    toast({
                        description: Object.values(errors)[0] ?? 'Something went wrong',
                        variant: 'destructive',
                    });
                },
            }
        );
    };

    const editSchedule = (section) => {
        getRooms();
        getInstructors();

        const sectionName = section.section || '-';
        const day = section.schedule.day || 'TBA';
        const start_time = section.schedule.start_time || 'TBA';
        const end_time = section.schedule.end_time || 'TBA';
        const room = section.schedule.room_id || null;
        const instructorId = section.schedule.faculty_id || null;

        const sectionData = {
            id: section.id,
            faculty_id: instructorId,
            room_id: room,
            day: day,
            start_time: start_time,
            end_time: end_time,
            section: sectionName,
        }

        setEditingSection(true);
        setSelectedSectionField('id', sectionData.id);
        setSelectedSectionField('faculty_id', sectionData.faculty_id);
        setSelectedSectionField('room_id', sectionData.room_id);
        setSelectedSectionField('day', sectionData.day);
        setSelectedSectionField('start_time', sectionData.start_time);
        setSelectedSectionField('end_time', sectionData.end_time);
        setSelectedSectionField('section', sectionData.section);
    }

    const getRooms = async () => {
        if (rooms.length > 0) return;

        const response = await axios.post(route('nstp-director.all-rooms'));
        setRooms(response.data);

    };

    const getInstructors = async () => {
        if (instructors.length > 0) return;

        const response = await axios.post(route('nstp-director.all-instructors'));
        setInstructors(response.data);
    };


    return (
        <div className='space-y-4'>
            <PageTitle align='center'>{component.toUpperCase()}</PageTitle>
            <Card>
                <CardHeader className="mb-2">
                    <CardTitle className="text-2xl">Sections</CardTitle>
                </CardHeader>
                <CardContent>
                    {!selectedSchoolYearEntry?.id ? (
                        <></>
                    ) : isLoading ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <SectionSkeleton />
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center py-12 text-destructive">
                            <AlertCircle className="w-8 h-8 mb-3" />
                            <p className="text-sm font-medium">Failed to load sections</p>
                            <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
                        </div>
                    ) : (!data || data.length == 0) ? ( // <-- check for undefined safely
                        <TableHeadTemplate>
                            <TableRow>
                                <TableCell colSpan={6}>
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                        <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                                        <p className="text-sm font-medium">No sections</p>
                                        <p className="text-xs mt-1">
                                            Check back later or contact administration
                                        </p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        </TableHeadTemplate>
                    ) : (
                        <TableHeadTemplate>
                            {data.map((section) => {
                                const sectionName = section.section || '-';
                                const day = section.schedule.day == 'TBA' ? '-' : section.schedule.day;
                                const start_time = section.schedule.start_time == 'TBA' ? '' : section.schedule.start_time;
                                const end_time = section.schedule.end_time == 'TBA' ? '' : section.schedule.end_time;
                                const time = start_time ? `${start_time} – ${end_time}` : '-';
                                const room = section.schedule.room?.room_name || '-';
                                const instructor = section.schedule.instructor?.instructor_info ? formatFullName(section.schedule.instructor?.instructor_info) : '-';

                                const isEditing = selectedSection.id === section.id;

                                const maxStudents = section.max_students || 0;
                                const students = section.students_count || 0;

                                return (
                                    <TableRow key={section.id} className={`${isEditing ? 'bg-green-500 hover:bg-green-500' : ''} ${mainScheduleConflictList.includes(section.id) ? 'bg-red-700 hover:bg-red-700 text-white' : ''}`}>
                                        <TableCell>{sectionName}</TableCell>
                                        <TableCell className='border-r '>
                                            {(editingSectionMaxStudnet.id > 0 && editingSectionMaxStudnet.id == section.id) ? (
                                                <div className='flex justify-between px-4'>
                                                    <Input
                                                        value={editingSectionMaxStudnet.max_students}
                                                        onChange={(e) => {
                                                            const value = e.target.value
                                                            if (isNaN(value)) return
                                                            console.log(value)
                                                            setEditingSectionMaxStudnet(prev => ({ ...prev, max_students: value }))
                                                        }}
                                                        className='h-min w-10 p-1 text-center'
                                                    />
                                                    <div className='flex items-center gap-1'>
                                                        <CircleX onClick={() => setEditingSectionMaxStudnet([])} className='text-red-500 cursor-pointer' />
                                                        <CircleCheck onClick={submitMaxStudents} className='text-green-500 cursor-pointer' />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className='flex justify-between px-4'>
                                                    <p>{students}/{maxStudents}</p>
                                                    <Pencil
                                                        onClick={() => setEditingSectionMaxStudnet(section)}
                                                        size={15}
                                                        className={` ${!!selectedSection.id ? 'text-transparent' : 'cursor-pointer text-green-500'}`}
                                                    />
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>{day}</TableCell>
                                        <TableCell>{time}</TableCell>
                                        <TableCell>{room}</TableCell>
                                        <TableCell>{instructor}</TableCell>
                                        <TableCell>
                                            <Pencil
                                                onClick={() => { if (!!!selectedSection.id) editSchedule(section) }}
                                                size={15}
                                                className={` ${!!selectedSection.id ? 'text-transparent' : 'cursor-pointer text-green-500'}`}
                                            />
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableHeadTemplate>
                    )}
                </CardContent>
                <CardFooter>
                    <Button disabled={isLoading || addingSection || isError} onClick={addSection}>Add section</Button>
                </CardFooter>
            </Card>

            {!!selectedSection.id && (
                <Scheduling refetch={refetch} />
            )}

            <div className='flex gap-4'>
                {(selectedSection.room_id && rooms.length > 0) ? (
                    <RoomSchedules
                        roomId={selectedSection.room_id}
                        roomName={rooms.find(room => room.id == selectedSection.room_id)?.room_name}
                    />
                ) : (
                    <></>
                )}

                {(selectedSection.faculty_id && instructors.length > 0) ? (
                    <>
                        {(() => {
                            const instructor = instructors.find(instructor => instructor.id == selectedSection.faculty_id)

                            return (
                                <InstructorSchedules
                                    instructorId={selectedSection.faculty_id}
                                    instructorName={formatFullName(instructor)}
                                />
                            )
                        })()}
                    </>
                ) : (
                    <></>
                )}
            </div>
        </div>
    )
}

Index.layout = page => <AuthenticatedLayout>{page}</AuthenticatedLayout>
