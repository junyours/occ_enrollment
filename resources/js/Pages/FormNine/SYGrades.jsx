import React from 'react';
import FormField from './components/FormField';
import { Form9Input } from './form9Fields';
import { isDroppedGrade } from './recordGrades';

const formatProgram = text => String(text ?? '').toLowerCase().split(' ').map(word => {
    if (word === 'of' || word === 'in') return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
}).join(' ');

export default function SYGrades({ data = {}, className, recordIndex = 0, subjectStart = 0, subjectEnd, continued = false, measurement = false }) {
    const record = data || {};
    const subjects = Array.isArray(record.subjects) ? record.subjects : [];
    const start = Math.max(0, Math.min(subjects.length, Number.isInteger(subjectStart) ? subjectStart : 0));
    const end = subjectEnd == null ? subjects.length : Math.max(start, Math.min(subjects.length, Number.isInteger(subjectEnd) ? subjectEnd : subjects.length));
    const prefix = `record:${recordIndex}`;
    return (
        <div className={`space-y-1 ${className || ''}`} data-form9-record={recordIndex}>
            <div data-form9-metadata>
                <div className="grid grid-cols-[170px_1fr] gap-2 pl-8">
                    <div className="flex min-w-0 flex-col">
                        <FormField fieldKey={`${prefix}:semester`} label="Term:" value={record.semester} labelWidth="100px" />
                        <FormField fieldKey={`${prefix}:schoolyear`} label="School Year:" value={record.schoolyear} labelWidth="80px" />
                    </div>
                    <div className="flex min-w-0 flex-col">
                        <FormField fieldKey={`${prefix}:program`} label="Program:" value={formatProgram(record.program)} labelWidth="45px" />
                        <FormField fieldKey={`${prefix}:school`} label="School:" value={record.school} labelWidth="45px" />
                    </div>
                </div>
                {continued && <p className="m-0 pl-8 text-[10px] italic leading-3">(continued)</p>}
            </div>
            <table className="w-full table-fixed">
                <thead data-form9-heading>
                    <tr className="border-y border-black">
                        <th className="text-xs text-left w-32 pl-8 font-normal py-0.5">Subject Code</th>
                        <th className="text-xs font-normal">Descriptive Title</th>
                        <th className="text-xs font-normal w-16">Grade</th>
                        <th className="text-xs font-normal w-16">Re-</th>
                        <th className="text-xs font-normal w-16">Units</th>
                    </tr>
                </thead>
                <tbody>
                    {subjects.slice(start, end).map((entry, offset) => {
                        const subject = entry || {};
                        const index = start + offset;
                        const fieldPrefix = `${prefix}:subject:${index}`;
                        const dropped = isDroppedGrade(subject.grade);
                        const dropOrfail = subject.grade > 3 || dropped;
                        const noGrade = subject.grade == null || String(subject.grade).trim() === '';
                        return (
                            <tr key={index} data-form9-subject={index} className="border-b border-gray-400">
                                <td className="text-xs pl-8 py-0.5">
                                    <Form9Input fieldKey={`${fieldPrefix}:code`} defaultValue={subject.subject_code} type="text" measurement={measurement}
                                        aria-label={`Subject code, record ${recordIndex + 1}, subject ${index + 1}`} className="flex-grow border-b border-none text-xs p-0 outline-none bg-transparent w-full" />
                                </td>
                                <td className="py-0 h-2">
                                    <Form9Input fieldKey={`${fieldPrefix}:title`} defaultValue={subject.descriptive_title} type="text" measurement={measurement}
                                        aria-label={`Descriptive title, record ${recordIndex + 1}, subject ${index + 1}`} className="flex-grow border-b border-none text-xs p-0 outline-none bg-transparent w-full" />
                                </td>
                                <td className={`text-xs text-center ${dropOrfail ? 'text-red-500 print:text-black' : ''}`}>
                                    <Form9Input fieldKey={`${fieldPrefix}:grade`} defaultValue={dropped ? 'Dropped' : subject.grade} type="text" measurement={measurement}
                                        aria-label={`Grade, record ${recordIndex + 1}, subject ${index + 1}`} className="flex-grow border-b border-none text-xs p-0 outline-none bg-transparent w-full text-center" />
                                </td>
                                <td className="text-xs text-center">
                                    <Form9Input fieldKey={`${fieldPrefix}:reExam`} defaultValue="-" type="text" measurement={measurement}
                                        aria-label={`Re-exam, record ${recordIndex + 1}, subject ${index + 1}`} className="flex-grow border-b border-none text-xs p-0 outline-none bg-transparent w-full text-center" />
                                </td>
                                <td className={`text-xs text-center ${dropOrfail ? 'text-red-500 print:text-black' : ''}`}>
                                    <Form9Input fieldKey={`${fieldPrefix}:units`} defaultValue={!noGrade ? dropOrfail ? '0' : parseFloat(subject.credit_units) : ''} type="text" measurement={measurement}
                                        aria-label={`Units, record ${recordIndex + 1}, subject ${index + 1}`} className="flex-grow border-b border-none text-xs p-0 outline-none bg-transparent w-full text-center" />
                                </td>
                            </tr>
                        );
                    })}
                    {!subjects.length && subjectEnd !== 0 && <tr data-form9-subject="0"><td colSpan={5} className="pl-8 py-1 text-xs italic">No subjects recorded.</td></tr>}
                </tbody>
            </table>
        </div>
    );
}
