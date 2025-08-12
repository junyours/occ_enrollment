import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import React from 'react'

function CorStudentSubjects({ data, showSeal = false }) {

    return (
        <table className="table-auto w-full text-[10px] border-collapse">
            <thead className="bg-gray-200">
                {/* Row for main headers */}
                <tr className="h-5">
                    <th className="border border-r-black" rowSpan="2"></th>
                    <th className="border border-black" rowSpan="2">Subject Code</th>
                    <th className="border border-black" rowSpan="2">Course&Section</th>
                    <th className="border border-black w-56" rowSpan="2">Descriptive Title</th>
                    <th className="border border-black" colSpan="3">Units</th>
                    <th className="border border-black" colSpan="3">Schedule</th>
                    <th className="border border-black" rowSpan="2">Instructor</th>
                </tr>
                {/* Row for sub-headers */}
                <tr className="h-5">
                    <th className="border border-black w-8">Lec</th>
                    <th className="border border-black w-8">Lab</th>
                    <th className="border border-black w-8">Credit</th>
                    <th className="border border-black">Day</th>
                    <th className="border border-black">Time</th>
                    <th className="border border-black">Room</th>
                </tr>
            </thead>
            <tbody className=''>
                {data.map((subjects, index) => {
                    const hasSecondSched = subjects.year_section_subjects.subject_secondary_schedule;

                    return (
                        <tr key={`${subjects.id}-subject`} className={`odd:bg-white even:bg-gray-100 ${showSeal ? '' : ''}`}>
                            <td className="border text-center">{index + 1}</td>
                            <td className="border">{!showSeal ? subjects.year_section_subjects.subject.subject_code : ''}</td>
                            <td className="border">{!showSeal ? subjects.year_section_subjects.class_code : ''}</td>
                            <td className="border">{!showSeal ? subjects.year_section_subjects.subject.descriptive_title : ''}</td>
                            <td className="border text-center">{!showSeal ? subjects.year_section_subjects.subject.lecture_hours : ''}</td>
                            <td className="border text-center">{!showSeal ? subjects.year_section_subjects.subject.laboratory_hours || '' : ''}</td>
                            <td className="border text-center">{!showSeal ? subjects.year_section_subjects.subject.credit_units : ''}</td>
                            <td className="border text-center">
                                <div className='flex flex-col'>
                                    <div className={`${hasSecondSched && 'border-0 border-b'}`}>
                                        {!showSeal ? subjects.year_section_subjects.day : ''}
                                    </div>
                                    <div>
                                        {!showSeal ? subjects.year_section_subjects.subject_secondary_schedule?.day || '' : ''}
                                    </div>
                                </div>
                            </td>
                            <td className="border text-center">
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
                            <td className="border text-center">
                                <div className='flex flex-col'>
                                    <div className={`${hasSecondSched && 'border-0 border-b'}`}>
                                        {!showSeal ? subjects.year_section_subjects.room?.room_name || 'TBA' : ''}
                                    </div>
                                    <div>
                                        {!showSeal ? subjects.year_section_subjects.subject_secondary_schedule?.room?.room_name || '' : ''}
                                    </div>
                                </div>
                            </td>
                            <td className="border text-center">
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
                {Array.from({ length: 14 - data.length }).map((_, index) => (
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
                    <td className="border text-right" colSpan="3">Total No. of Units:</td>
                    <td className="border text-center">
                        {data.reduce((total, subjects) => total + parseFloat(subjects.year_section_subjects.subject.lecture_hours || 0), 0).toFixed(1)}
                    </td>
                    <td className="border  text-center">
                        {data.reduce((total, subjects) => total + parseFloat(subjects.year_section_subjects.subject.laboratory_hours || 0), 0).toFixed(1)}
                    </td>
                    <td className="border text-center">
                        {data.reduce((total, subjects) => total + parseFloat(subjects.year_section_subjects.subject.credit_units || 0), 0).toFixed(1)}
                    </td>
                    <td colSpan="4"></td>
                </tr>
            </tbody>
        </table>
    )
}

export default CorStudentSubjects
