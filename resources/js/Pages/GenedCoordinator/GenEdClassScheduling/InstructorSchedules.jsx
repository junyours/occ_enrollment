import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/Components/ui/table'
import { detectTwoScheduleConflict } from '@/Lib/ConflictUtilities'
import { convertToAMPM } from '@/Lib/Utils'
import React, { useEffect, useState } from 'react'
import useScheduleStore from './useClassScheduleStore'
import { useSchoolYearStore } from '@/Components/useSchoolYearStore'

function InstructorSchedules({ instructorId, instructorName }) {

    const selectedSubject = useScheduleStore(state => state.selectedSubject);
    const setInstructorConflict = useScheduleStore(state => state.setInstructorConflict);

    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const [facultySchedules, setFacultySchedules] = useState([])

    const getInstructorSchedules = async () => {
        await axios.post(route('gened-coordinator.instructorSchedules'), { instructorId: instructorId, schoolYearID: selectedSchoolYearEntry.id })
            .then(response => {
                setFacultySchedules(response.data);
                detectConflict(response.data)
            })
    }

    const detectConflict = (selectedSubject) => {
        const conflict = collectSchedConflicts(selectedSubject)

        setInstructorConflict(!!conflict);
    }

    const collectSchedConflicts = (facList) => {
        if (selectedSubject.day == 'TBA' || selectedSubject.start_time == 'TBA') return setInstructorConflict(false)

        let hasConflict = false;

        facList.forEach((fac) => {
            // Check primary schedule conflict
            if (detectTwoScheduleConflict(fac, selectedSubject) && selectedSubject.id !== fac.id) {
                hasConflict = true;
                return; // No need to check further if conflict found
            }

            // Check secondary schedule conflict
            if (
                fac.secondary_schedule &&
                fac.secondary_schedule.id !== selectedSubject.id &&
                detectTwoScheduleConflict(selectedSubject, fac.secondary_schedule)
            ) {
                hasConflict = true;
                return;
            }
        });

        return hasConflict;
    };


    useEffect(() => {
        getInstructorSchedules();
    }, [instructorId])

    useEffect(() => {
        detectConflict(facultySchedules);
    }, [selectedSubject.day, selectedSubject.start_time, selectedSubject.end_time])

    return (
        <Card className='w-full'>
            <CardHeader>
                <CardTitle className="text-2xl">{instructorName} schedules</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {facultySchedules.map(faculty => (
                            <React.Fragment key={`${faculty.id}-faculty`} >
                                <TableRow className={`${(detectTwoScheduleConflict(faculty, selectedSubject) && selectedSubject.id != faculty.id) ? 'bg-red-500 hover:bg-red-500' : (selectedSubject.id == faculty.id) ? 'bg-green-500 hover:bg-green-500' : ''}`}>
                                    <TableCell>{faculty.day}</TableCell>
                                    <TableCell>
                                        {faculty.start_time !== "TBA"
                                            ? convertToAMPM(faculty.start_time) + ' - ' + convertToAMPM(faculty.end_time)
                                            : "TBA"}
                                    </TableCell>
                                </TableRow>
                                {faculty.secondary_schedule ? (
                                    <TableRow className={`${(detectTwoScheduleConflict(faculty.secondary_schedule, selectedSubject) && selectedSubject.id != faculty.secondary_schedule.id) ? 'bg-red-500 hover:bg-red-500' : (selectedSubject.id == faculty.secondary_schedule.id) ? 'bg-green-500 hover:bg-green-500' : ''}`}>
                                        <TableCell>{faculty.secondary_schedule.day}</TableCell>
                                        <TableCell>
                                            {faculty.secondary_schedule.start_time !== "TBA"
                                                ? convertToAMPM(faculty.secondary_schedule.start_time) + ' - ' + convertToAMPM(faculty.secondary_schedule.end_time)
                                                : "TBA"}
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    <></>
                                )}
                            </React.Fragment>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}

export default InstructorSchedules
