import { convertToAMPM, formatFullName, formatFullNameFML } from "@/Lib/Utils";
import OCC_LOGO from '../../../images/OCC_LOGO.png'

function ScheduleGenerator({ data, schoolYear }) {
    const daysOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    const sortedSubjects = data.student_subject
        ? [...data.student_subject].sort((a, b) => {
            const dayA = a.year_section_subjects.day;
            const dayB = b.year_section_subjects.day;
            return daysOrder.indexOf(dayA) - daysOrder.indexOf(dayB);
        })
        : [];

    const logData = () => {
        console.log(data.student_subject);
    }

    return (
        <div key={data.id} className="bg-white p-4 rounded-lg w-max space-y-4">
            <h1 className="text-2xl font-semibold text-gray-800 flex justify-between bg-white shadow-md border p-1 rounded-lg">
                <div className="flex items-center space-x-2">
                    <img onClick={() => {logData()}} src={OCC_LOGO} alt="Logo" className="w-10" />
                    <span className="text-[#2980b9]">
                        {schoolYear.start_year}-{schoolYear.end_year}
                    </span>
                    <span className="text-gray-600 font-normal">
                        {schoolYear.semester.semester_name} Semester
                    </span>
                    <div className="flex items-center space-x-2 justify-center text-sm text-gray-500">
                        <span className="font-semibold">|</span>
                        <span>
                            {data?.year_section?.course?.course_name_abbreviation} - {data?.year_section?.year_level?.year_level}
                            {data?.year_section?.section}
                        </span>
                    </div>
                </div>
                <span className="px-4 text-lg font-bold flex items-center bg-gray-100 border rounded-md text-gray-900 tracking-wide capitalize">
                    {formatFullNameFML(data.student.student_information)}
                </span>
            </h1>

            <table className="shadow-heavy rounded-lg overflow-hidden">
                <thead className="bg-[#2980b9]">
                    <tr className="text-white">
                        {['Subject', 'Day', 'Time', 'Room', 'Instructor'].map((header) => (
                            <th key={header} className="text-left py-2 px-4 text-sm font-semibold">{header}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {sortedSubjects && sortedSubjects.length > 0 ? (
                        sortedSubjects.map((classSubject, index) => (
                            <tr key={index} className={`border-b odd:bg-white even:bg-gray-100 hover:bg-[#dbe4e8]`}>
                                <td className="py-2 px-4 text-sm">{classSubject.year_section_subjects.subject.descriptive_title}</td>
                                <td className="py-2 px-4 text-sm">{classSubject.year_section_subjects.day}</td>
                                <td className="py-2 px-4 text-sm">
                                    {classSubject.year_section_subjects.start_time != "TBA" ? (
                                        convertToAMPM(classSubject.year_section_subjects.start_time) + "-" + convertToAMPM(classSubject.year_section_subjects.end_time)
                                    ) : (
                                        <>TBA</>
                                    )}
                                </td>
                                <td className="py-2 px-4 text-sm text-center">
                                    {classSubject.year_section_subjects.room?.room_name != null ? (
                                        classSubject.year_section_subjects.room.room_name
                                    ) : (
                                        <>TBA</>
                                    )}
                                </td>
                                <td className="py-2 px-4 text-sm">
                                    {(classSubject.year_section_subjects.instructor?.instructor_information.first_name != null) ? (
                                        formatFullName(classSubject.year_section_subjects.instructor.instructor_information)
                                    ) : (
                                        <>TBA</>
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="8" className="text-center py-4 text-gray-600">No class</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}

export default ScheduleGenerator;
