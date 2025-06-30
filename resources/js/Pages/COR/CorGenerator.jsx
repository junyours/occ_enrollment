
import OCC_LOGO from '../../../images/OCC_LOGO.png'
import { convertToAMPM, formatDate, formatFullName, toTwoDecimals } from '@/Lib/Utils';
import { MiscellaneousFeesList, MiscellaneousFeesTotal } from './MiscellaneousFees';
import CorStudentSubjects from './CorStudentSubjects';
import CorStudentInfo from './CorStudentInfo';
import CorFees from './CorFees';
function CorGenerator({ data }) {
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

                {/* STUDENT INFORMATION */}
                <CorStudentInfo data={data} />

                {/* SUBJECTS */}
                <CorStudentSubjects data={data.student_subject} />

                {/* FEES */}
                <CorFees
                    subjects={data.student_subject}
                    course={data.year_section.course.course_name_abbreviation}
                    yearLevel={data.year_section.year_level_id}
                />

                <div className="mt-2 text-[8px]">
                    Evaluator: {formatFullName(data.evaluator.evaluator_information)}
                </div>
            </div>
        </div>
    )
}

export default CorGenerator
