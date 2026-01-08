
import OCC_LOGO from '../../../images/OCC_LOGO.png'
import { formatFullName } from '@/Lib/Utils';
import CorStudentSubjects from './CorStudentSubjects';
import CorStudentInfo from './CorStudentInfo';
import CorFees from './CorFees';
import Signatories from './Signatories';
function CorGenerator({ data, showSeal }) {
    if (!data) return <>No Data</>

    return (
        <div className="relative space-y-4 p-5 flex justify-center bg-white rounded-lg text-black w-[800px]">
            {showSeal && (
                <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none print:hidden">
                    <div className="bg-red-600 text-white font-bold text-4xl px-4 py-2 rounded-lg opacity-80 rotate-[20deg]">
                        NO PERMISSION TO VIEW
                    </div>
                </div>
            )}

            <div className="p-5 border border-gray-600 w-full space-y-4 relative z-10">
                {/* COR Content */}
                <div className="flex items-center justify-center space-x-4">
                    <div className="text-center flex flex-col relative">
                        <img src={OCC_LOGO} alt="Logo" className="h-full absolute -left-40" />
                        <h1 className="text-lg font-bold">OPOL COMMUNITY COLLEGE</h1>
                        <p className="text-sm">Opol, Misamis Oriental</p>
                        <h2 className="text-xl font-bold">CERTIFICATE OF REGISTRATION</h2>
                    </div>
                </div>

                <CorStudentInfo data={data} showSeal={showSeal} />
                <CorStudentSubjects data={data.student_subject} showSeal={showSeal} />

                <div className='flex justify-around gap-4'>
                    <CorFees
                        subjects={data.student_subject}
                        course={data.year_section.course.course_name_abbreviation}
                        courseId={data.year_section.course.id}
                        yearLevel={data.year_section.year_level_id}
                        showSeal={showSeal}
                        semester={data.year_section.school_year.semester.semester_name}
                        studentType={data.student_type_id}

                    />
                    <Signatories showSeal={showSeal} />
                </div>

                <div className="mt-2 text-[8px]">
                    Evaluator: {formatFullName(data.evaluator.evaluator_information)}
                </div>
            </div>
        </div>
    )

}

export default CorGenerator
