import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card'
import { Table, TableBody, TableCell, TableRow } from '@/Components/ui/table'
import { detectTwoScheduleConflict } from '@/Lib/ConflictUtilities'
import { convertToAMPM } from '@/Lib/Utils'
import React, { useEffect, useState } from 'react'
import { useSection } from './useSection'
import { useSchoolYearStore } from '@/Components/useSchoolYearStore'

function InstructorSchedules({ instructorId, instructorName }) {

    const selectedSection = useSection(state => state.selectedSection);
    const setInstructorConflict = useSection(state => state.setInstructorConflict);

    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const [facultyYearSectionSubjectSchedules, setFacultyYearSectionSubjectSchedules] = useState([])
    const [facultyNstpSectionSchedules, setFacultyNstpSectionSchedules] = useState([])

    const setLoadingInstructorSchedules = useSection(state => state.setLoadingInstructorSchedules);

    const getInstructorSchedules = async () => {
        setLoadingInstructorSchedules(true);
        await axios.post(route('nstp-director.instructorSchedules'), { instructorId: instructorId, schoolYearID: selectedSchoolYearEntry.id })
            .then(response => {
                setFacultyYearSectionSubjectSchedules(response.data.yearSectionSubjectsSched);
                setFacultyNstpSectionSchedules(response.data.nstpSched)
                detectConflict(response.data.yearSectionSubjectsSched)
            })
            .finally(() => {
                setLoadingInstructorSchedules(false);
            })
    }

    const detectConflict = (selectedSection) => {
        const conflict = collectSchedConflicts(selectedSection)

        setInstructorConflict(!!conflict);
    }

    const collectSchedConflicts = (facList) => {
        if (selectedSection.day == 'TBA' || selectedSection.start_time == 'TBA') return setInstructorConflict(false)

        let hasConflict = false;

        facList.forEach((fac) => {
            // Check primary schedule conflict
            if (detectTwoScheduleConflict(fac, selectedSection) && selectedSection.id !== fac.id) {
                hasConflict = true;
                return; // No need to check further if conflict found
            }

            // Check secondary schedule conflict
            if (
                fac.secondary_schedule &&
                fac.secondary_schedule.id !== selectedSection.id &&
                detectTwoScheduleConflict(selectedSection, fac.secondary_schedule)
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
        detectConflict(facultyYearSectionSubjectSchedules);
    }, [selectedSection.day, selectedSection.start_time, selectedSection.end_time])

    return (
        <Card className='w-full'>
            <CardHeader>
                <CardTitle className="text-2xl">{instructorName} schedules</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        {facultyYearSectionSubjectSchedules.map(faculty => (
                            <React.Fragment key={`${faculty.id}-faculty-year-section`} >
                                <TableRow className={`${(detectTwoScheduleConflict(faculty, selectedSection) && selectedSection.id != faculty.id) ? 'bg-red-500 hover:bg-red-500' : (selectedSection.id == faculty.id) ? 'bg-green-500 hover:bg-green-500' : ''}`}>
                                    <TableCell>{faculty.day}</TableCell>
                                    <TableCell>
                                        {faculty.start_time !== "TBA"
                                            ? convertToAMPM(faculty.start_time) + ' - ' + convertToAMPM(faculty.end_time)
                                            : "TBA"}
                                    </TableCell>
                                </TableRow>
                                {faculty.secondary_schedule ? (
                                    <TableRow className={`${(detectTwoScheduleConflict(faculty.secondary_schedule, selectedSection) && selectedSection.id != faculty.secondary_schedule.id) ? 'bg-red-500 hover:bg-red-500' : (selectedSection.id == faculty.secondary_schedule.id) ? 'bg-green-500 hover:bg-green-500' : ''}`}>
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
                        {facultyNstpSectionSchedules.map(faculty => (
                            <React.Fragment key={`${faculty.id}-faculty-nstp`} >
                                <TableRow className={`${(detectTwoScheduleConflict(faculty, selectedSection) && selectedSection.id != faculty.id) ? 'bg-red-500 hover:bg-red-500' : (selectedSection.id == faculty.id) ? 'bg-green-500 hover:bg-green-500' : ''}`}>
                                    <TableCell>{faculty.day}</TableCell>
                                    <TableCell>
                                        {faculty.start_time !== "TBA"
                                            ? convertToAMPM(faculty.start_time) + ' - ' + convertToAMPM(faculty.end_time)
                                            : "TBA"}
                                    </TableCell>
                                </TableRow>
                                {faculty.secondary_schedule ? (
                                    <TableRow className={`${(detectTwoScheduleConflict(faculty.secondary_schedule, selectedSection) && selectedSection.id != faculty.secondary_schedule.id) ? 'bg-red-500 hover:bg-red-500' : (selectedSection.id == faculty.secondary_schedule.id) ? 'bg-green-500 hover:bg-green-500' : ''}`}>
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
