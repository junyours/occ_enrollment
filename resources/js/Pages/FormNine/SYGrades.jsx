import React from 'react'
import FormField from './components/FormField'

const formatProgram = (text) => {
    return text
        .toLowerCase()
        .split(' ')
        .map((word, index) => {
            if (word === 'of' || word === 'in') {
                return word; // keep lowercase
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
};

export default function SYGrades({ data, className }) {
    return (
        <div className={`space-y-1 break-inside-avoid-page ${className || ''}`}>
            <div className='grid grid-cols-[170px_1fr] gap-2 pl-8'>
                <div className='flex flex-col'>
                    <FormField label="Term:" value={data.semester} labelWidth="80px" />
                    <FormField label="School Year:" value={data.schoolyear} labelWidth="80px" />
                </div>
                <div className='flex flex-col'>
                    <FormField label="Program:" value={formatProgram(data.program)} labelWidth='45px' />
                    <FormField label="School:" value={data.school} labelWidth='45px' />
                </div>
            </div>
            <table className='w-full'>
                <thead>
                    <tr className='border-y border-black'>
                        <th className='text-xs text-left w-32 pl-8 font-normal py-0.5'>Subject Code</th>
                        <th className='text-xs font-normal'>Descriptive Title</th>
                        <th className='text-xs font-normal w-16'>Grade</th>
                        <th className='text-xs font-normal w-16'>Remarks</th>
                        <th className='text-xs font-normal w-16'>Units</th>
                    </tr>
                </thead>
                <tbody>
                    {data.subjects.map((subject, index) => {
                        const isDropped = subject.grade == 0.0;
                        const isPassed = !isDropped && subject.grade && subject.grade <= 3;
                        const isFailed = !isDropped && subject.grade && subject.grade > 3;
                        return (
                            <tr key={index} className='border-b border-gray-400'>
                                <td className='text-xs  pl-8 py-0.5'>{subject.subject_code}</td>
                                <td className='text-xs'>{subject.descriptive_title}</td>
                                <td className='text-xs text-center'>{subject.grade}</td>
                                <td className='text-xs text-center'>
                                    {isDropped ? (
                                        <p className=''>Dropped</p>
                                    ) : isPassed ? (
                                        <p className=''>Passed</p>
                                    ) : isFailed ? (
                                        <p className=''>Failed</p>
                                    ) : (
                                        <span className="text-muted-foreground text-xs">-</span>
                                    )}
                                </td>
                                <td className='text-xs text-center'>{subject.credit_units}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
