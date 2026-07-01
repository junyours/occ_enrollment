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
                    <FormField label="Term:" value={data.semester} labelWidth="100px" />
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
                        <th className='text-xs font-normal w-16'>Re-</th>
                        <th className='text-xs font-normal w-16'>Units</th>
                    </tr>
                </thead>
                <tbody>
                    {data.subjects.map((subject, index) => {
                        const dropOrfail = subject.grade > 3 || subject.grade == 0;
                        const noGrade = subject.grade == null;

                        return (
                            <tr key={index} className='border-b border-gray-400'>
                                <td className='text-xs  pl-8 py-0.5'>
                                    <input
                                        id={`subject_code${subject.subject_code}`}
                                        name={`subject_code${subject.subject_code}`}
                                        defaultValue={subject.subject_code}
                                        type="text"
                                        className='flex-grow border-b border-none text-xs p-0 outline-none bg-transparent w-full'
                                    />
                                </td>
                                <td className='py-0 h-2'>
                                    <input
                                        id={`descriptive_title_${subject.descriptive_title}`}
                                        name={`descriptive_title_${subject.descriptive_title}`}
                                        defaultValue={subject.descriptive_title}
                                        type="text"
                                        className='flex-grow border-b border-none text-xs p-0 outline-none bg-transparent w-full'
                                    />
                                </td>
                                <td className={`text-xs text-center ${dropOrfail ? 'text-red-500 print:text-black' : ''}`}>{subject.grade}</td>
                                <td className='text-xs text-center'>
                                    <input
                                        id={`re-exam${subject.descriptive_title}`}
                                        defaultValue={'-'}
                                        type="text"
                                        className='flex-grow border-b border-none text-xs p-0 outline-none bg-transparent w-full text-center'
                                    />
                                </td>
                                <td className={`text-xs text-center ${dropOrfail ? 'text-red-500 print:text-black' : ''}`}>
                                    {!noGrade ? dropOrfail ? '0' : parseFloat(subject.credit_units) : ''}
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
