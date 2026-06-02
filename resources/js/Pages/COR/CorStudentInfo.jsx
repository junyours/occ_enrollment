import { formatDate } from '@/Lib/Utils'
import React from 'react'

function CorStudentInfo({data}) {
  return (
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
  )
}

export default CorStudentInfo
