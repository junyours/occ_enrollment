import PreLoader from '@/Components/preloader/PreLoader';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';
import { CircleMinus, CirclePlus } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Label } from '@/Components/ui/label';
import { Input } from '@/Components/ui/input';
import { useToast } from '@/hooks/use-toast';

export default function Rooms() {
    const [rooms, setRooms] = useState([])
    const [loading, setLoading] = useState(true);
    const [openAddRoom, setOpenAddRoom] = useState(false);
    const [deptId, setDeptId] = useState(0)
    const [departments, setDepartments] = useState([]);
    const { toast } = useToast()

    const { data, setData, post, processing, errors, setError, clearErrors, reset } = useForm({
        room_name: '',
    });

    const getRooms = async () => {
        await axios.post(route('rooms'))
            .then(response => {
                setRooms(response.data.rooms);
                setDepartments(response.data.department)
            })
            .finally(() => {
                setLoading(false);
            })
    }

    useEffect(() => {
        getRooms();
    }, [])

    if (loading) return <PreLoader title='Rooms' />

    const assignRoom = async (id) => {
        const originalRooms = rooms.map(room => ({ ...room }));
        const deptName = departments.find(dept => dept.id == deptId);
        const newRooms = rooms.map((room) =>
            room.id == id
                ? {
                    ...room,
                    department_id: deptId,
                    department_name_abbreviation: deptName?.department_name_abbreviation || '',
                }
                : room
        );
        setRooms(newRooms);

        await axios
            .patch(route('rooms.edit', { id }), { department_id: deptId })
            .catch((error) => {
                setRooms(originalRooms);
                console.error('Request failed:', error);
            });
    };

    const unAssignRoom = async (id) => {
        const originalRooms = rooms.map(room => ({ ...room }));
        const newRooms = rooms.map((room) =>
            room.id == id ? { ...room, department_id: null, department_name_abbreviation: null } : room
        );
        setRooms(newRooms);

        await axios
            .patch(route('rooms.edit', { id }), { department_id: null })
            .catch((error) => {
                setRooms(originalRooms);
                console.error('Request failed:', error);
            });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (value.trim() === '') {
            setError(name, { message: 'Required' });
        } else {
            clearErrors(name);
        }
        setData(name, value);
    }

    const submit = async () => {
        if (!data.room_name) return setError('room_name', { message: 'Required' })

        await post(route('rooms.add'), {
            onSuccess: () => {
                reset();
                getRooms();
                toast({
                    description: "Room added successfully",
                    variant: "success",
                });
                setOpenAddRoom(false);
            },
            onError: (errors) => {
                if (errors.room_name) {
                    setError('room_name', { message: errors.room_name });
                }
            },
            preserveScroll: true,
        });
    };

    return (
        <div>
            <Head title='Rooms' />
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 md:h-full">
                <Card className="w-full md:w-full min-h-min max-h-full">
                    <CardHeader>
                        <CardTitle className="text-2xl">Rooms</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col h-full gap-2 overflow-y-auto">
                            <Table>
                                <TableBody>
                                    {rooms.map((room, index) => (
                                        <TableRow key={index} className='gap-1'>
                                            <TableCell className='p-0'>{room.room_name}</TableCell>
                                            <TableCell className='py-0 px-2'>{room.department_name_abbreviation}</TableCell>
                                            <TableCell className='p-0'>
                                                {room.department_name_abbreviation ? (
                                                    <Button
                                                        disabled={true}
                                                        variant="icon"
                                                        className="cursor-not-allowed text-gray-600">
                                                        <CirclePlus size={15} />
                                                    </Button>
                                                ) : (
                                                    <>
                                                        {deptId ? (
                                                            <Button
                                                                variant="icon"
                                                                style={{ color: '#00FF1A' }}
                                                                onClick={() => { assignRoom(room.id) }}>
                                                                <CirclePlus size={15} />
                                                            </Button>
                                                        ) : (
                                                            <Button
                                                                variant="icon"
                                                                className="text-gray-500 cursor-not-allowed">
                                                                <CirclePlus size={15} />
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button
                            onClick={() => {
                                setOpenAddRoom(true);
                                setData('room_name', '');
                                clearErrors();
                            }}
                            className='w-full'
                        >
                            Add Room
                        </Button>
                    </CardFooter>
                </Card>

                {departments.map((department, index) => (
                    <Card
                        key={index}
                        className={`w-full md:w-full shadow-light ${department.id == deptId ? 'ring-2 ring-[#00ff1a]' : ''}`}>
                        <div className="flex justify-between items-center">
                            <CardHeader className='w-full flex-row justify-between space-y-0'>
                                <CardTitle className="text-2xl">{department.department_name_abbreviation}</CardTitle>
                                {department.id == deptId ? (
                                    <Button
                                        onClick={() => { setDeptId(0) }}
                                        className="bg-green-500 hover:bg-green-600 px-2 py-1 h-max opacity-75 cursor-pointer m-0">
                                        Selected
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => { setDeptId(department.id) }}
                                        className="bg-blue-500 px-2 py-1 h-max hover:bg-blue-600 transition duration-150 ease-in-out m-0">
                                        Select
                                    </Button>
                                )}
                            </CardHeader>
                        </div>

                        <CardContent className="space-y-2">
                            <Table>
                                <TableBody>
                                    {rooms.filter(room => room.department_id == department.id).length > 0 ? (
                                        rooms
                                            .filter(room => room.department_id == department.id)
                                            .map((room, index) => (
                                                <TableRow key={index} className="gap-1">
                                                    <TableCell className="flex justify-between items-center p-0">
                                                        <span>{room.room_name}</span>
                                                        <Button
                                                            variant="icon"
                                                            style={{ color: "#C82333" }}
                                                            onClick={() => { unAssignRoom(room.id) }}
                                                        >
                                                            <CircleMinus size={18} />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                    ) : (
                                        <TableRow>
                                            <TableCell className="text-center italic text-gray-500" colSpan={1}>
                                                No rooms assigned
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                ))}
            </div>
            <Dialog open={openAddRoom} onOpenChange={setOpenAddRoom}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add Room</DialogTitle>
                    </DialogHeader>
                    <div className="max-h-64">
                        <Label>Name:</Label>
                        <Input
                            name="room_name"
                            value={data.room_name}
                            onChange={handleChange}
                            className={`mb-2 ${errors.room_name && 'border-red-500'}`}
                        />
                        {errors.room_name && (
                            <p className="text-red-500 text-sm mt-1">{errors.room_name.message}</p>
                        )}
                    </div>
                    <DialogFooter>
                        <Button disabled={processing} onClick={submit} type="submit">Save changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}


Rooms.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
