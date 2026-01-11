import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/Components/ui/table'
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import { detectTwoScheduleConflict } from '@/Lib/ConflictUtilities';
import { convertToAMPM } from '@/Lib/Utils';
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import useScheduleStore from './useClassScheduleStore';

function RoomSchedules({ roomId, roomName }) {

    const selectedSubject = useScheduleStore(state => state.selectedSubject);
    const setRoomConflict = useScheduleStore(state => state.setRoomConflict);

    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const [mainRooms, setMainRooms] = useState([]);
    const [secondRooms, setSecondRooms] = useState([]);

    const getRoomsSchedules = async () => {
        await axios.post(route('gened-coordinator.roomSchedules'), { roomID: roomId, schoolYearID: selectedSchoolYearEntry.id })
            .then(response => {
                setMainRooms(response.data.main);
                setSecondRooms(response.data.second);

                detectConflict(response.data.main, response.data.second)
            })
    }

    const detectConflict = (main, second) => {
        if (selectedSubject.day == 'TBA' || selectedSubject.start_time == 'TBA') return setRoomConflict(false)

        const mainConflict = collectMainSchedConflicts(main);
        const secondConflict = collectSecondSchedConflicts(second);
        setRoomConflict(mainConflict || secondConflict);

    };

    const collectMainSchedConflicts = (mainRooms) => {
        return mainRooms.some((main) =>
            detectTwoScheduleConflict(selectedSubject, main) && selectedSubject.id != main.id
        );
    };

    const collectSecondSchedConflicts = (secondRooms) => {
        return secondRooms.some((second) =>
            detectTwoScheduleConflict(selectedSubject, second) && selectedSubject.id != second.id
        );
    };

    useEffect(() => {
        getRoomsSchedules();
    }, [roomId])

    useEffect(() => {
        detectConflict(mainRooms, secondRooms)
    }, [selectedSubject.day, selectedSubject.start_time, selectedSubject.end_time])

    return (
        <Card className='w-full'>
            <CardHeader>
                <CardTitle className="text-2xl">{roomName} schedules</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {mainRooms.map(room => (
                            <TableRow key={`${room.id}-main`} className={`${(detectTwoScheduleConflict(room, selectedSubject) && selectedSubject.id != room.id) ? 'bg-red-500 hover:bg-red-500' : (selectedSubject.id == room.id) ? 'bg-green-500 hover:bg-green-500' : ''}`}>
                                <TableCell>{room.day}</TableCell>
                                <TableCell>
                                    {room.start_time !== "TBA"
                                        ? convertToAMPM(room.start_time) + ' - ' + convertToAMPM(room.end_time)
                                        : "TBA"}
                                </TableCell>
                            </TableRow>
                        ))}
                        {secondRooms.map(room => (
                            <TableRow key={`${room.id}-second`} className={`${(detectTwoScheduleConflict(room, selectedSubject) && selectedSubject.id != room.id) ? 'bg-red-500 hover:bg-red-500' : (selectedSubject.id == room.id) ? 'bg-green-500 hover:bg-green-500' : ''}`}>
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

export default RoomSchedules
