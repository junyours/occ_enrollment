import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import React from 'react'

function CorStudentSubjects({ data, showSeal = false, settings = {} }) {

    const {
        showSubjectCode = true,
        showCourseSection = true,
        showDescriptiveTitle = true,

        showUnits = true,
        showLecUnits = true,
        showLabUnits = true,
        showCreditUnits = true,

        showSchedule = true,
        showDay = true,
        showTime = true,
        showRoom = true,

        showInstructor = true
    } = settings;

    return (
        <table className="table-auto w-full text-[10px] border-collapse">
            <thead className="bg-gray-200">
                {/* Row for main headers */}
                <tr className="h-5">
                    <th className="border border-r-black" rowSpan="2"></th>
                    <th className={`border border-black ${!showSubjectCode ? 'hidden' : ''}`} rowSpan="2">Subject Code</th>
                    <th className={`border border-black w-16 ${!showCourseSection ? 'hidden' : ''}`} rowSpan="2">Course Section</th>
                    <th className={`border border-black w-56 ${!showDescriptiveTitle ? 'hidden' : ''}`} rowSpan="2">Descriptive Title</th>
                    <th className={`border border-black ${!showUnits ? 'hidden' : ''}`} colSpan={ (showLecUnits ? 1 : 0) + (showLabUnits ? 1 : 0) + (showCreditUnits ? 1 : 0) }>Units</th>
                    <th className={`border border-black ${!showSchedule ? 'hidden' : ''}`} colSpan={ (showDay ? 1 : 0) + (showTime ? 1 : 0) + (showRoom ? 1 : 0) }>Schedule</th>
                    <th className={`border border-black ${!showInstructor ? 'hidden' : ''}`} rowSpan="2">Instructor</th>
                </tr>
                {/* Row for sub-headers */}
                <tr className="h-5">
                    <th className={`border border-black w-8 ${!showUnits || !showLecUnits  ? 'hidden' : ''}`}>Lec</th>
                    <th className={`border border-black w-8 ${!showUnits || !showLabUnits ? 'hidden' : ''}`}>Lab</th>
                    <th className={`border border-black w-8 ${!showUnits || !showCreditUnits ? 'hidden' : ''}`}>Credit</th>
                    <th className={`border border-black ${(!showSchedule || !showDay) ? 'hidden' : ''}`}>Day</th>
                    <th className={`border border-black ${(!showSchedule || !showTime) ? 'hidden' : ''}`}>Time</th>
                    <th className={`border border-black ${(!showSchedule || !showRoom) ? 'hidden' : ''}`}>Room</th>
                </tr>
            </thead>
            <tbody className=''>
                {data.map((subjects, index) => {
                    const hasSecondSched = subjects.year_section_subjects.subject_secondary_schedule;

                    return (
                        <tr key={`${subjects.id}-subject`} className={`odd:bg-white even:bg-gray-100 ${showSeal ? '' : ''}`}>
                            <td className="border text-center">{index + 1}</td>
                            <td className={`border ${!showSubjectCode ? 'hidden' : ''}`}>{!showSeal ? subjects.year_section_subjects.subject.subject_code : ''}</td>
                            <td className={`border ${!showCourseSection ? 'hidden' : ''}`}>{!showSeal ? subjects.year_section_subjects.class_code : ''}</td>
                            <td className={`border ${!showDescriptiveTitle ? 'hidden' : ''}`}>{!showSeal ? subjects.year_section_subjects.subject.descriptive_title : ''}</td>
                            <td className={`border text-center ${!showLecUnits ? 'hidden' : ''}`}>{!showSeal ? subjects.year_section_subjects.subject.lecture_hours : ''}</td>
                            <td className={`border text-center ${!showLabUnits ? 'hidden' : ''}`}>{!showSeal ? subjects.year_section_subjects.subject.laboratory_hours || '' : ''}</td>
                            <td className={`border text-center ${!showCreditUnits ? 'hidden' : ''}`}>{!showSeal ? subjects.year_section_subjects.subject.credit_units : ''}</td>
                            <td className={`border text-center ${!showSchedule ? 'hidden' : ''}`}>
                                <div className='flex flex-col'>
                                    <div className={`${hasSecondSched && 'border-0 border-b'} ${!showDay ? 'hidden' : ''}`}>
                                        {!showSeal ? subjects.year_section_subjects.day : ''}
                                    </div>
                                    <div className={`${!showDay ? 'hidden' : ''}`}>
                                        {!showSeal ? subjects.year_section_subjects.subject_secondary_schedule?.day || '' : ''}
                                    </div>
                                </div>
                            </td>
                            <td className={`border text-center ${(!showSchedule || !showTime) ? 'hidden' : ''}`}>
                                <div className='flex flex-col'>
                                    <div className={`${hasSecondSched && 'border-0 border-b'}`}>
                                        {!showSeal ? (
                                            <>
                                                {
                                                    subjects.year_section_subjects.start_time != "TBA" ? (
                                                        convertToAMPM(subjects.year_section_subjects.start_time) + "-" + convertToAMPM(subjects.year_section_subjects.end_time)
                                                    ) : (
                                                        <>TBA</>
                                                    )
                                                }
                                            </>
                                        ) : (
                                            <></>
                                        )}
                                    </div>
                                    {hasSecondSched &&
                                        <div>
                                            {!showSeal ? (
                                                <>
                                                    {subjects.year_section_subjects.subject_secondary_schedule.start_time != "TBA" ? (
                                                        convertToAMPM(subjects.year_section_subjects.subject_secondary_schedule.start_time) + "-" + convertToAMPM(subjects.year_section_subjects.subject_secondary_schedule.end_time)
                                                    ) : (
                                                        <>TBA</>
                                                    )}
                                                </>
                                            ) : (
                                                <></>
                                            )}
                                        </div>
                                    }
                                </div>
                            </td>
                            <td className={`border text-center ${(!showSchedule || !showRoom) ? 'hidden' : ''}`}>
                                <div className='flex flex-col'>
                                    <div className={`${hasSecondSched && 'border-0 border-b'}`}>
                                        {!showSeal ? subjects.year_section_subjects.room?.room_name || 'TBA' : ''}
                                    </div>
                                    <div>
                                        {!showSeal ? subjects.year_section_subjects.subject_secondary_schedule?.room?.room_name || '' : ''}
                                    </div>
                                </div>
                            </td>
                            <td className={`border text-center ${!showInstructor ? 'hidden' : ''}`}>
                                {!showSeal ? (
                                    <>
                                        {(subjects.year_section_subjects.instructor?.instructor_information.first_name != null) ? (
                                            formatFullName(subjects.year_section_subjects.instructor.instructor_information)
                                        ) : (
                                            <>TBA</>
                                        )}
                                    </>
                                ) : (
                                    <></>
                                )}
                            </td>
                        </tr>
                    )
                })}
                {Array.from({ length: 10 - data.length }).map((_, index) => (
                    <tr key={index}>
                        <td className='text-center'>{data.length + index + 1}</td>
                        <td className='text-center'></td>
                        <td className='text-center'></td>
                        <td className='text-center'></td>
                        <td className='text-center'></td>
                        <td className='text-center'></td>
                        <td className='text-center'></td>
                        <td className='text-center'></td>
                        <td className='text-center'></td>
                        <td className='text-center'></td>
                        <td className='text-center'></td>
                    </tr>
                ))}
                {/* Row for total units */}
                <tr className={`bg-gray-200  ${showSeal ? 'text-transparent' : ''}`}>
                    <td className="border text-right" colSpan={1 + (showSubjectCode ? 1 : 0) + (showCourseSection ? 1 : 0) + (showDescriptiveTitle ? 1 : 0)}>Total No. of Units:</td>
                    <td className={`border text-center ${!showUnits || !showLecUnits ? 'hidden' : ''}`}>
                        {data.reduce((total, subjects) => total + parseFloat(subjects.year_section_subjects.subject.lecture_hours || 0), 0).toFixed(1)}
                    </td>
                    <td className={`border text-center ${!showUnits || !showLabUnits ? 'hidden' : ''}`}>
                        {data.reduce((total, subjects) => total + parseFloat(subjects.year_section_subjects.subject.laboratory_hours || 0), 0).toFixed(1)}
                    </td>
                    <td className={`border text-center ${!showUnits || !showCreditUnits ? 'hidden' : ''}`}>
                        {data.reduce((total, subjects) => total + parseFloat(subjects.year_section_subjects.subject.credit_units || 0), 0).toFixed(1)}
                    </td>
                    <td colSpan="4"></td>
                </tr>
            </tbody>
        </table>
    )
}

export default CorStudentSubjects
