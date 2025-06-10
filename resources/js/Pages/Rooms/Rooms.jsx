import PreLoader from '@/Components/preloader/PreLoader';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Button } from '@/Components/ui/button';
import { Head, useForm } from '@inertiajs/react';
import axios from 'axios';
import { AlertCircle, Building2, Check, CircleMinus, CirclePlus, Loader2, Plus } from 'lucide-react';
import React, { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
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
            <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* Rooms Card - Fixed height with better scrolling */}
                <Card className="flex flex-col h-full max-h-[calc(100vh-7rem)] min-h-[calc(100vh-7rem)]">
                    <CardHeader className="flex-shrink-0">
                        <CardTitle className="text-2xl">Available Rooms</CardTitle>
                        {deptId > 0 && (
                            <p className="text-sm text-gray-600">
                                Click <span className="text-green-500">+</span> to assign rooms
                            </p>
                        )}
                    </CardHeader>

                    <CardContent className="flex-1 min-h-0">
                        <div className="h-full overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Room Name</TableHead>
                                        <TableHead>Dept</TableHead>
                                        <TableHead className="w-12">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {rooms.map((room, index) => (
                                        <TableRow key={room.id || index}>
                                            <TableCell className="font-medium">{room.room_name}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-xs ${room.department_name_abbreviation
                                                        ? 'bg-blue-100 text-blue-800'
                                                        : 'bg-gray-100 text-gray-500'
                                                    }`}>
                                                    {room.department_name_abbreviation || 'None'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {room.department_name_abbreviation ? (
                                                    <Button
                                                        disabled={true}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="cursor-not-allowed text-gray-400 hover:bg-transparent">
                                                        <CirclePlus size={16} />
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={!deptId}
                                                        className={`${deptId ? 'text-green-600 hover:text-green-700 hover:bg-green-50' : 'text-gray-400 cursor-not-allowed'}`}
                                                        onClick={() => deptId && assignRoom(room.id)}>
                                                        <CirclePlus size={16} />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>

                    <CardFooter className="flex-shrink-0 border-t pt-4">
                        <Button
                            onClick={() => {
                                setOpenAddRoom(true);
                                setData('room_name', '');
                                clearErrors();
                            }}
                            className='w-full'
                        >
                            <CirclePlus size={16} className="mr-2" />
                            Add New Room
                        </Button>
                    </CardFooter>
                </Card>

                {/* Department Cards */}
                {departments.map((department, index) => (
                    <Card
                        key={department.id || index}
                        className={`flex flex-col h-full max-h-[calc(100vh-7rem)] min-h-[calc(100vh-7rem)] transition-all duration-200 ${department.id == deptId
                                ? 'ring-2 ring-green-500 shadow-lg'
                                : 'hover:shadow-md'
                            }`}>

                        <CardHeader className="flex-shrink-0">
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle className="text-xl">{department.department_name_abbreviation}</CardTitle>
                                    <p className="text-sm text-gray-600 mt-1">
                                        {rooms.filter(room => room.department_id == department.id).length} rooms assigned
                                    </p>
                                </div>
                                {department.id == deptId ? (
                                    <Button
                                        onClick={() => setDeptId(0)}
                                        size="sm"
                                        className="bg-green-500 hover:bg-green-500">
                                        <Check size={14} className="mr-1" />
                                        Selected
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => setDeptId(department.id)}
                                        size="sm"
                                        variant="outline">
                                        Select
                                    </Button>
                                )}
                            </div>
                        </CardHeader>

                        <CardContent className="flex-1 min-h-0">
                            <div className="h-full overflow-y-auto">
                                <Table>
                                    <TableBody>
                                        {rooms.filter(room => room.department_id == department.id).length > 0 ? (
                                            rooms
                                                .filter(room => room.department_id == department.id)
                                                .map((room, roomIndex) => (
                                                    <TableRow key={room.id || roomIndex}>
                                                        <TableCell className="flex justify-between items-center py-2">
                                                            <span className="font-medium">{room.room_name}</span>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                onClick={() => unAssignRoom(room.id)}
                                                            >
                                                                <CircleMinus size={16} />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                        ) : (
                                            <TableRow>
                                                <TableCell className="text-center py-8">
                                                    <div className="text-gray-400">
                                                        <Building2 size={32} className="mx-auto mb-2 opacity-50" />
                                                        <p className="text-sm italic">No rooms assigned</p>
                                                        {deptId == department.id && (
                                                            <p className="text-xs text-blue-600 mt-1">
                                                                Select rooms from the left panel
                                                            </p>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Add Room Dialog */}
            <Dialog open={openAddRoom} onOpenChange={setOpenAddRoom}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New Room</DialogTitle>
                        <DialogDescription>
                            Create a new room that can be assigned to departments.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="room_name" className="text-sm font-medium">
                                Room Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="room_name"
                                name="room_name"
                                value={data.room_name}
                                onChange={handleChange}
                                placeholder="Enter room name..."
                                className={`mt-1 ${errors.room_name ? 'border-red-500 focus:ring-red-500' : ''}`}
                            />
                            {errors.room_name && (
                                <p className="text-red-500 text-sm mt-1 flex items-center">
                                    <AlertCircle size={14} className="mr-1" />
                                    {errors.room_name.message}
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setOpenAddRoom(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            disabled={processing || !data.room_name?.trim()}
                            onClick={submit}
                        >
                            {processing ? (
                                <>
                                    <Loader2 size={14} className="mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus size={14} className="mr-2" />
                                    Create Room
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}


Rooms.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
