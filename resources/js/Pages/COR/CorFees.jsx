import { toTwoDecimals } from '@/Lib/Utils';
import React from 'react'
import { MiscellaneousFeesList, MiscellaneousFeesTotal } from './MiscellaneousFees';

function CorFees({ subjects, course, yearLevel }) {
    const lectureHours = subjects.reduce(
        (total, subjects) => total + parseFloat(subjects.year_section_subjects.subject.lecture_hours || 0),
        0
    );

    const labHours = subjects.reduce(
        (total, subjects) => total + parseFloat(subjects.year_section_subjects.subject.laboratory_hours || 0),
        0
    );

    const tutionFee = (lectureHours + labHours) * 150;

    const miscellaneousFees = MiscellaneousFeesList(course, yearLevel);
    const miscellaneousFeesTotal = MiscellaneousFeesTotal(course, yearLevel)

    return (
        <div className="w-full">
            <div>
                <h1 className="text-sm font-bold text-gray-800">ASSESSMENT:</h1>

                <div className="flex justify-between items-center">
                    <span className="text-xs italic text-gray-600">Tuition Fee:</span>
                    <span className="text-xs text-right min-w-16">{toTwoDecimals(tutionFee)}</span>
                </div>

                <div className="flex justify-between items-center">
                    <span className="text-xs italic text-gray-600">Miscellaneous Fees:</span>
                    <span className="text-xs text-right min-w-16">{toTwoDecimals(miscellaneousFeesTotal)}</span>
                </div>

                <div className="flex justify-between items-center border-t border-b border-gray-800 my-1 font-bold">
                    <span className="text- italic text-gray-600">Total School Fees:</span>
                    <span className="text-xs text-right min-w-16">{toTwoDecimals(Number() + Number(miscellaneousFeesTotal))}</span>
                </div>

                <div className="mt-2">
                    <div className="text-xs italic underline mb-1 text-gray-800">Miscellaneous Fees Breakdown:</div>
                    {miscellaneousFees.map(miscellaneous => (
                        <div className="flex justify-between items-center" key={`${miscellaneous.name}`}>
                            <span className="text-xs text-gray-600">{miscellaneous.name}:</span>
                            <span className="text-xs">{miscellaneous.fee ? toTwoDecimals(miscellaneous.fee) : '-'}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default CorFees
