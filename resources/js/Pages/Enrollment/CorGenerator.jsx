
import OCC_LOGO from '../../../images/OCC_LOGO.png'
import { convertToAMPM, formatDate, formatFullName } from '@/Lib/Utils';
function CorGenerator({ data }) {
    console.log(data);

    return (
        <div className="space-y-4 p-5 flex justify-center bg-white rounded-lg w-max  text-black">
            <div className="p-5 border border-gray-600 w-full space-y-4">
                <div className="flex items-center justify-center space-x-4">
                    <div className="text-center flex flex-col relative">
                        <img src={OCC_LOGO} alt="Logo" className="h-full absolute -left-40" />
                        <h1 className="text-lg font-bold">OPOL COMMUNITY COLLEGE</h1>
                        <p className="text-sm">Opol, Misamis Oriental</p>
                        <h2 className="text-xl font-bold">CERTIFICATE OF REGISTRATION</h2>
                    </div>
                </div>

                <div className="grid grid-cols-[40px,50px,35px,1px,75px,130px,100px,1fr,85px,80px] gap-x-2 text-xs">
                    <div className="col-span-2 font-bold">Registration No.:</div>
                    <div className="col-span-3 col-start-3 border-b border-gray-900 pl-2">{data.registration_number}</div>

                    <div className="col-span-5"></div>

                    <div className="col-span-2 font-bold">Date Enrolled:</div>
                    <div className="col-span-3 col-start-3 border-b border-gray-900 pl-2">{formatDate(data.date_enrolled)}</div>

                    <div className="col-span-1 font-bold text-end">Semester:</div>
                    <div className="col-span-1 border-b border-gray-900 text-center">{data.year_section.school_year.semester.semester_name}</div>

                    <div className="col-span-1 col-start-9 font-bold">School Year:</div>
                    <div className="col-span-1 border-b border-gray-900 text-center">{data.year_section.school_year.start_year}-{data.year_section.school_year.end_year}</div>

                    <div className="col-span-2 font-bold">Student ID No.:</div>
                    <div className="col-span-3 col-start-3 border-b border-gray-900 pl-2">{data.student.user_id_no}</div>

                    <div className="col-span-1 font-bold text-end">Course & Year:</div>
                    <div className="col-span-1 border-b border-gray-900 text-center">{data.year_section.course.course_name_abbreviation} - {data.year_section.year_level_id}{data.year_section.section}
                    </div>

                    <div className="col-span-1 col-start-9 font-bold">Gender:</div>
                    <div className="col-span-1 border-b border-gray-900 text-center">{data.student.student_information.gender}</div>

                    <div className="col-span-1 font-bold">Name:</div>
                    <div className="col-span-2 border-b border-gray-900 text-center">{data.student.student_information.last_name}</div>
                    ,
                    <div className="col-span-2 col-start-5 border-b border-gray-900 text-center">{data.student.student_information.first_name}</div>
                    <div className="col-span-1 border-b border-gray-900 text-center">{data.student.student_information.middle_name}</div>

                    <div className="col-span-1 col-start-9 font-bold">Student Type:</div>
                    <div className="col-span-1 border-b border-gray-900 text-center">{data.student_type.student_type_name}</div>

                    <div className="col-span-2 text-xs italic col-start-2 text-gray-600 text-center">Last Name</div>
                    <div className="col-span-2 col-start-5  text-xs italic text-gray-600 text-center">First Name</div>
                    <div className="col-span-1 text-xs italic text-gray-600 text-center">Middle Name</div>
                </div>

                <table className="table-auto w-full text-[10px] border-collapse">
                    <thead className="bg-gray-200">
                        {/* Row for main headers */}
                        <tr className="h-5">
                            <th className="border border-r-black" rowSpan="2"></th>
                            <th className="border border-black" rowSpan="2">Class Code</th>
                            <th className="border border-black" rowSpan="2">Subject Code</th>
                            <th className="border border-black" rowSpan="2">Descriptive Title</th>
                            <th className="border border-black" colSpan="3">Units</th>
                            <th className="border border-black" colSpan="3">Schedule</th>
                            <th className="border border-black" rowSpan="2">Instructor</th>
                        </tr>
                        {/* Row for sub-headers */}
                        <tr className="h-5">
                            <th className="border border-black">Lec</th>
                            <th className="border border-black">Lab</th>
                            <th className="border border-black">Credit</th>
                            <th className="border border-black">Day</th>
                            <th className="border border-black">Time</th>
                            <th className="border border-black">Room</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.student_subject.map((subjects, index) => {
                            const hasSecondSched = subjects.year_section_subjects.subject_secondary_schedule;

                            return (
                                <tr key={index} className="odd:bg-white even:bg-gray-100">
                                    <td className="border text-center">{index + 1}</td>
                                    <td className="border">{subjects.year_section_subjects.class_code}</td>
                                    <td className="border">{subjects.year_section_subjects.subject.subject_code}</td>
                                    <td className="border">{subjects.year_section_subjects.subject.descriptive_title}</td>
                                    <td className="border text-center">{subjects.year_section_subjects.subject.lecture_hours}</td>
                                    <td className="border text-center">{subjects.year_section_subjects.subject.laboratory_hours}</td>
                                    <td className="border text-center">{subjects.year_section_subjects.subject.credit_units}</td>
                                    <td className="border text-center">
                                        <div className='flex flex-col'>
                                            <div className={`${hasSecondSched && 'border-0 border-b'}`}>
                                                {subjects.year_section_subjects.day}
                                            </div>
                                            <div>
                                                {subjects.year_section_subjects.subject_secondary_schedule?.day || ''}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="border text-center">
                                        <div className='flex flex-col'>
                                            <div className={`${hasSecondSched && 'border-0 border-b'}`}>
                                                {subjects.year_section_subjects.start_time != "TBA" ? (
                                                    convertToAMPM(subjects.year_section_subjects.start_time) + "-" + convertToAMPM(subjects.year_section_subjects.end_time)
                                                ) : (
                                                    <>TBA</>
                                                )}
                                            </div>
                                            {hasSecondSched &&
                                                <div>
                                                    {subjects.year_section_subjects.subject_secondary_schedule.start_time != "TBA" ? (
                                                        convertToAMPM(subjects.year_section_subjects.subject_secondary_schedule.start_time) + "-" + convertToAMPM(subjects.year_section_subjects.subject_secondary_schedule.end_time)
                                                    ) : (
                                                        <>TBA</>
                                                    )}
                                                </div>
                                            }
                                        </div>
                                    </td>
                                    <td className="border text-center ">
                                        <div className='flex flex-col'>
                                            <div className={`${hasSecondSched && 'border-0 border-b'}`}>
                                                {subjects.year_section_subjects.room?.room_name != null ? (
                                                    subjects.year_section_subjects.room.room_name
                                                ) : (
                                                    <>TBA</>
                                                )}
                                            </div>
                                            <div>
                                                {subjects.year_section_subjects.subject_secondary_schedule?.room?.room_name != null ? (
                                                    subjects.year_section_subjects.subject_secondary_schedule?.room.room_name
                                                ) : (
                                                    <>
                                                        {
                                                            subjects.year_section_subjects.subject_secondary_schedule &&
                                                            subjects.year_section_subjects.subject_secondary_schedule?.room.room_name
                                                        }
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="border">
                                        {(subjects.year_section_subjects.instructor?.instructor_information.first_name != null) ? (
                                            formatFullName(subjects.year_section_subjects.instructor.instructor_information)
                                        ) : (
                                            <>TBA</>
                                        )}
                                    </td>
                                </tr>
                            )
                        })}
                        {Array.from({ length: 14 - data.student_subject.length }).map((_, index) => (
                            <tr key={index}>
                                <td className='text-center'>{data.student_subject.length + index + 1}</td>
                                <td className='text-center'>-</td>
                                <td className='text-center'>-</td>
                                <td className='text-center'>-</td>
                                <td className='text-center'>-</td>
                                <td className='text-center'>-</td>
                                <td className='text-center'>-</td>
                                <td className='text-center'>-</td>
                                <td className='text-center'>-</td>
                                <td className='text-center'>-</td>
                                <td className='text-center'>-</td>
                            </tr>
                        ))}
                        {/* Row for total units */}
                        <tr className="bg-gray-200">
                            <td className="border text-right" colSpan="4">Total No. of Units:</td>
                            <td className="border text-center">
                                {data.student_subject.reduce((total, subjects) => total + parseFloat(subjects.year_section_subjects.subject.lecture_hours || 0), 0).toFixed(1)}
                            </td>
                            <td className="border  text-center">
                                {data.student_subject.reduce((total, subjects) => total + parseFloat(subjects.year_section_subjects.subject.laboratory_hours || 0), 0).toFixed(1)}
                            </td>
                            <td className="border text-center">
                                {data.student_subject.reduce((total, subjects) => total + parseFloat(subjects.year_section_subjects.subject.credit_units || 0), 0).toFixed(1)}
                            </td>
                            <td colSpan="4"></td>
                        </tr>
                    </tbody>
                </table>
                <div class="max-w-xs">
                    <div>
                        <h1 class="text-sm font-bold text-gray-800">ASSESSMENT:</h1>

                        <div class="flex justify-between items-center">
                            <span class="text-xs italic text-gray-600">Tuition Fee:</span>
                            <span class="text-xs text-right min-w-16">1,350.00</span>
                        </div>

                        <div class="flex justify-between items-center">
                            <span class="text-xs italic text-gray-600">Miscellaneous Fees:</span>
                            <span class="text-xs text-right min-w-16">1,700.00</span>
                        </div>

                        <div class="flex justify-between items-center border-t border-b border-gray-800 my-1 font-bold">
                            <span class="text- italic text-gray-600">Total School Fees:</span>
                            <span class="text-xs text-right min-w-16">3,050.00</span>
                        </div>

                        <div class="mt-2">
                            <div class="text-xs italic underline mb-1 text-gray-800">Miscellaneous Fees Breakdown:</div>

                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-600">Athletic Fee:</span>
                                <span class="text-xs">100.00</span>
                            </div>

                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-600">Cultural Fee:</span>
                                <span class="text-xs">100.00</span>
                            </div>

                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-600">Guidance Fee:</span>
                                <span class="text-xs">50.00</span>
                            </div>

                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-600">Computer Fee:</span>
                                <span class="text-xs">200.00</span>
                            </div>

                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-600">Handbook:</span>
                                <span class="text-xs text-gray-400">-</span>
                            </div>

                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-600">Library Fee:</span>
                                <span class="text-xs">150.00</span>
                            </div>

                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-600">Medical & Dental Fee:</span>
                                <span class="text-xs">100.00</span>
                            </div>

                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-600">Registration Fee:</span>
                                <span class="text-xs">1,000.00</span>
                            </div>

                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-600">School ID:</span>
                                <span class="text-xs text-gray-400">-</span>
                            </div>

                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-600">Student Insurance:</span>
                                <span class="text-xs text-gray-400">-</span>
                            </div>

                            <div class="flex justify-between items-center">
                                <span class="text-xs text-gray-600">Entrance Exam Fee:</span>
                                <span class="text-xs text-gray-400">-</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-2 text-[8px]">
                    Evaluator: {formatFullName(data.evaluator.evaluator_information)}
                </div>

                <div className="mt-4 text-center text-xs italic text-gray-600">
                    <p>This is a system-generated document and does not require a signature.</p>
                </div>
            </div>
        </div>
    )
}

export default CorGenerator
