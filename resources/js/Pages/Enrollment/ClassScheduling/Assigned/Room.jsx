import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/Components/ui/table'
import { detectTwoScheduleConflict } from '@/Lib/ConflictUtilities';
import { convertToAMPM } from '@/Lib/Utils';
import axios from 'axios'
import React, { useEffect, useState } from 'react'

function Room({ data, roomId, yearSectionId, roomName, setRoomConflict, day, start_time, end_time, setLoadingRooms }) {
    const [mainRooms, setMainRooms] = useState([]);
    const [secondRooms, setSecondRooms] = useState([]);

    const getRoomsSchedules = async () => {
        setLoadingRooms(true)
        await axios.post(route('room.schedules', { roomId, yearSectionId }))
            .then(response => {
                setMainRooms(response.data.main);
                setSecondRooms(response.data.second);

                detectConflict(response.data.main, response.data.second)
            })
            .finally(() => {
                setLoadingRooms(false)
            })
    }

    const detectConflict = (main, second) => {
        if (data.day == 'TBA' || data.start_time == 'TBA') return setRoomConflict(false)

        const mainConflict = collectMainSchedConflicts(main);
        const secondConflict = collectSecondSchedConflicts(second);
        setRoomConflict(mainConflict || secondConflict);

    };

    const collectMainSchedConflicts = (mainRooms) => {
        return mainRooms.some((main) =>
            detectTwoScheduleConflict(data, main) && data.id != main.id
        );
    };

    const collectSecondSchedConflicts = (secondRooms) => {
        return secondRooms.some((second) =>
            detectTwoScheduleConflict(data, second) && data.id != second.id
        );
    };

    useEffect(() => {
        getRoomsSchedules();
    }, [roomId])

    useEffect(() => {
        detectConflict(mainRooms, secondRooms)
    }, [day, start_time, end_time])

    return (
        <Card className='w-full'>
            <CardHeader>
                <CardTitle className="text-2xl">{roomName} schedules</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {mainRooms.map(room => (
                            <TableRow key={`${room.id}-main`} className={`${(detectTwoScheduleConflict(room, data) && data.id != room.id) ? 'bg-red-500 hover:bg-red-500' : (data.id == room.id) ? 'bg-green-500 hover:bg-green-500' : ''}`}>
                                <TableCell>{room.day}</TableCell>
                                <TableCell>
                                    {room.start_time !== "TBA"
                                        ? convertToAMPM(room.start_time) + ' - ' + convertToAMPM(room.end_time)
                                        : "TBA"}
                                </TableCell>
                            </TableRow>
                        ))}
                        {secondRooms.map(room => (
                            <TableRow key={`${room.id}-second`} className={`${(detectTwoScheduleConflict(room, data) && data.id != room.id) ? 'bg-red-500 hover:bg-red-500' : (data.id == room.id) ? 'bg-green-500 hover:bg-green-500' : ''}`}>
                                <TableCell>{room.day}</TableCell>
                                <TableCell>
                                    {room.start_time !== "TBA"
                                        ? convertToAMPM(room.start_time) + ' - ' + convertToAMPM(room.end_time)
                                        : "TBA"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

export default Room
