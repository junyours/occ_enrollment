import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/Components/ui/table'
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import { detectTwoScheduleConflict } from '@/Lib/ConflictUtilities';
import { convertToAMPM } from '@/Lib/Utils';
import axios from 'axios'
import React, { useEffect, useState } from 'react'
import { useSection } from './useSection';

function RoomSchedules({ roomId, roomName }) {

    const selectedSection = useSection(state => state.selectedSection);
    const setRoomConflict = useSection(state => state.setRoomConflict);

    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const [mainRooms, setMainRooms] = useState([]);
    const [secondRooms, setSecondRooms] = useState([]);
    const [nstpRooms, setNstpRooms] = useState([]);

    const setLoadingRoomSchedules = useSection(state => state.setLoadingRoomSchedules);

    const getRoomsSchedules = async () => {
        setLoadingRoomSchedules(true);
        await axios.post(route('nstp-director.roomSchedules'), { roomID: roomId, schoolYearID: selectedSchoolYearEntry.id })
            .then(response => {
                setMainRooms(response.data.main);
                setSecondRooms(response.data.second);
                setNstpRooms(response.data.nstp);

                detectConflict(response.data.main, response.data.second, response.data.nstp)
            })
            .finally(() => {
                setLoadingRoomSchedules(false);
            })
    }

    const detectConflict = (main, second, nstp) => {
        if (selectedSection.day == 'TBA' || selectedSection.start_time == 'TBA') return setRoomConflict(false)

        const mainConflict = collectMainSchedConflicts(main);
        const secondConflict = collectSecondSchedConflicts(second);
        const nstpConflict = collectNstpSchedConflicts(nstp);
        setRoomConflict(mainConflict || secondConflict || nstpConflict);

    };

    const collectMainSchedConflicts = (mainRooms) => {
        return mainRooms.some((main) =>
            detectTwoScheduleConflict(selectedSection, main)
        );
    };

    const collectSecondSchedConflicts = (secondRooms) => {
        return secondRooms.some((second) =>
            detectTwoScheduleConflict(selectedSection, second)
        );
    };

    const collectNstpSchedConflicts = (nstpRooms) => {
        return nstpRooms.some((nstp) => {
            if (nstp.id === selectedSection.id) return false;

            return detectTwoScheduleConflict(selectedSection, nstp);
        });
    };

    useEffect(() => {
        getRoomsSchedules();
    }, [roomId])

    useEffect(() => {
        detectConflict(mainRooms, secondRooms, nstpRooms)
    }, [selectedSection.day, selectedSection.start_time, selectedSection.end_time])

    return (
        <Card className='w-full'>
            <CardHeader>
                <CardTitle className="text-2xl">{roomName} schedules</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {mainRooms.map(room => (
                            <TableRow key={`${room.id}-main`} className={`${(detectTwoScheduleConflict(room, selectedSection) && selectedSection.id != room.id) ? 'bg-red-500 hover:bg-red-500' : (selectedSection.id == room.id) ? 'bg-green-500 hover:bg-green-500' : ''}`}>
                                <TableCell>{room.day}</TableCell>
                                <TableCell>
                                    {room.start_time !== "TBA"
                                        ? convertToAMPM(room.start_time) + ' - ' + convertToAMPM(room.end_time)
                                        : "TBA"}
                                </TableCell>
                            </TableRow>
                        ))}
                        {secondRooms.map(room => (
                            <TableRow key={`${room.id}-second`} className={`${(detectTwoScheduleConflict(room, selectedSection) && selectedSection.id != room.id) ? 'bg-red-500 hover:bg-red-500' : (selectedSection.id == room.id) ? 'bg-green-500 hover:bg-green-500' : ''}`}>
                                <TableCell>{room.day}</TableCell>
                                <TableCell>
                                    {room.start_time !== "TBA"
                                        ? convertToAMPM(room.start_time) + ' - ' + convertToAMPM(room.end_time)
                                        : "TBA"}
                                </TableCell>
                            </TableRow>
                        ))}
                        {nstpRooms.map(room => (
                            <TableRow key={`${room.id}-second`} className={`${(detectTwoScheduleConflict(room, selectedSection) && selectedSection.id != room.id) ? 'bg-red-500 hover:bg-red-500' : (selectedSection.id == room.id) ? 'bg-green-500 hover:bg-green-500' : ''}`}>
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
