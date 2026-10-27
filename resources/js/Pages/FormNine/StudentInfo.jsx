import React from 'react';
import FormField from './components/FormField';
import { Form9Input } from './form9Fields';
import { formatName } from '@/Lib/InfoUtils';
import { nameFields } from './torNames';

export default function StudentInfo({ info, lastRecord }) {
    const information = info?.information || {};
    const parent = info?.parent || {};
    const preliminary_education = info?.preliminary_education || {};
    const studentName = nameFields(information);
    const fatherName = nameFields({ first_name: parent?.father_first_name, last_name: parent?.father_last_name, middle_name: parent?.father_middle_name });
    const motherName = nameFields({ first_name: parent?.mother_first_name, last_name: parent?.mother_maiden_last_name, middle_name: parent?.mother_middle_name });

    return (
        <div className='w-full max-w-4xl mx-auto font-sans text-black font-semibold'>
            {/* Header 1: COLLEGE PERMANENT RECORD */}
            <div className='w-full flex justify-center border-y-[2px] border-black'>
                <p className='text-md font-extrabold uppercase tracking-wide'>College Permanent Record</p>
            </div>

            {/* Section 1: Personal Details */}
            <div className='grid grid-cols-[1fr_260px] gap-x-4 pl-8'>
                <div className='flex flex-col'>
                    <FormField fieldKey="student:user_id_no" label="ID Number:" value={info?.user_id_no || ''} />
                    <FormField fieldKey="student:name" label="Name:" value={formatName(studentName, { format: 'FULL', defaultValue: '' }).toUpperCase()} />
                    <FormField
                        fieldKey="student:birthday" label="Date of Birth:"
                        value={
                            information.birthday
                                ? new Date(information.birthday).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                }).toUpperCase()
                                : ''
                        }
                    />
                    <FormField fieldKey="student:place_of_birth" label=" Place of Birth:" value={information.place_of_birth ? information.place_of_birth.toUpperCase() : ''} />
                    <FormField fieldKey="student:address" label="Home Address:" value={information.address ? information.address.toUpperCase() : ''} />
                </div>
                <div className='flex flex-col'>
                    <FormField fieldKey="student:gender" label="Gender:" value={information.gender ? information.gender.toUpperCase() : ''} />
                    <FormField fieldKey="student:civil_status" label="Civil Status:" value={information.civil_status ? information.civil_status.toUpperCase() : ''} />
                    <FormField
                        fieldKey="student:father_name" label="Father's Name:"
                        value={formatName(fatherName, { format: 'capitalize', defaultValue: '' }).toUpperCase()}
                    />
                    <FormField
                        fieldKey="student:mother_name" label="Mother's Name:"
                        value={formatName(motherName, { format: 'capitalize', defaultValue: '' }).toUpperCase()}
                    />
                </div>
            </div>

            {/* Header 2: RECORD OF PRELIMINARY EDUCATION */}
            <div className='w-full flex justify-center border-y-[2px] border-black mt-2'>
                <p className='text-sm font-extrabold uppercase tracking-wide'>Record of Preliminary Education</p>
            </div>

            {/* Section 2: Education Details */}
            <div className='pl-8'>
                {/* Column Headers */}
                <div className='flex gap-4'>
                    <div className='w-10'></div> {/* Spacer to align with "Elementary" */}
                    <div className='flex-grow text-center text-sm italic'>
                        Name of School/Address
                    </div>
                    <div className='w-36 text-center text-sm italic'>
                        School Year
                    </div>
                </div>

                {/* Rows */}
                <div className='flex flex-col space-y-1'>
                    {/* Elementary */}
                    <div className='grid grid-cols-[1fr_140px] items-end gap-12'>
                        <FormField fieldKey="student:elementary" label="Elementary:" value={preliminary_education?.elementary_name ? `${preliminary_education?.elementary_name.toUpperCase()} / ${String(preliminary_education?.elementary_address || '').toUpperCase()}` : ''} />
                        <Form9Input fieldKey="student:elementary_year" type="text" className='border-b border-black text-xs px-2 outline-none w-full text-center bg-transparent' defaultValue={preliminary_education?.elementary_year ? preliminary_education?.elementary_year : ''} />
                    </div>

                    {/* Secondary */}
                    <div className='grid grid-cols-[1fr_140px] items-end gap-12'>
                        <FormField fieldKey="student:secondary" label="Secondary:" value={preliminary_education?.secondary_name ? `${preliminary_education?.secondary_name.toUpperCase()} / ${String(preliminary_education?.secondary_address || '').toUpperCase() }` : ''}/>
                        <Form9Input fieldKey="student:secondary_year" type="text" className='border-b border-black text-xs px-2 outline-none w-full text-center bg-transparent' defaultValue={preliminary_education?.secondary_year ? preliminary_education?.secondary_year : ''}/>
                    </div>
                </div>
            </div>

            {/* Section 3: Degree Details */}
            <div className='w-full border-t-[2px] border-black pl-8 mt-2'>
                <div className='flex flex-col w-full'>
                    <div className='w-full'>
                        <FormField fieldKey="student:program" label="Candidate for the Degree:" labelWidth='147px' value={lastRecord?.program || ''} />
                    </div>
                    <div className='w-full'>
                        <FormField fieldKey="student:date_graduation" label="Date of Graduation:" labelWidth='147px' />
                    </div>
                </div>
            </div>
        </div>
    );
}
