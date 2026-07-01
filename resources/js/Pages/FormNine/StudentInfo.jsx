import React from 'react';
import FormField from './components/FormField';
import { formatName } from '@/Lib/InfoUtils';

export default function StudentInfo({ info, lastRecord }) {
    const { information, parent } = info;

    return (
        <div className='w-full max-w-4xl mx-auto font-sans text-black font-semibold'>
            {/* Header 1: COLLEGE PERMANENT RECORD */}
            <div className='w-full flex justify-center border-y-[2px] border-black'>
                <p className='text-md font-extrabold uppercase tracking-wide'>College Permanent Record</p>
            </div>

            {/* Section 1: Personal Details */}
            <div className='grid grid-cols-[1fr_260px] gap-x-4 pl-8'>
                <div className='flex flex-col'>
                    <FormField label="ID Number:" value={info.user_id_no || ''} />
                    <FormField label="Name:" value={formatName(information) ? formatName(information, { format: 'FULL' }).toUpperCase() : ''} />
                    <FormField
                        label="Date of Birth:"
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
                    <FormField label=" Place of Birth:" value={null} />
                    <FormField label="Home Address:" value={information.address ? information.address.toUpperCase() : ''} />
                </div>
                <div className='flex flex-col'>
                    <FormField label="Gender:" value={information.gender ? information.gender.toUpperCase() : ''} />
                    <FormField label="Civil Status:" value={information.civil_status ? information.civil_status.toUpperCase() : ''} />
                    <FormField
                        label="Father's Name:"
                        value={formatName({ first_name: parent?.father_first_name, last_name: parent?.father_last_name, middle_name: parent?.father_middle_name }).toLowerCase() != "unknown" ? formatName({ first_name: parent?.father_first_name, last_name: parent?.father_last_name, middle_name: parent?.father_middle_name }, {format: 'capitalize'}).toUpperCase() : ''}
                    />
                    <FormField
                        label="Mother's Name:"
                        value={formatName({ first_name: parent?.mother_first_name, last_name: parent?.mother_maiden_last_name, middle_name: parent?.mother_middle_name }).toLowerCase() != "unknown" ? formatName({ first_name: parent?.mother_first_name, last_name: parent?.mother_maiden_last_name, middle_name: parent?.mother_middle_name }, {format: 'capitalize'}).toUpperCase() : ''}
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
                        <FormField label="Elementary:" />
                        <input type="text" className='border-b border-black text-xs px-2 outline-none w-full text-center bg-transparent' />
                    </div>

                    {/* Secondary */}
                    <div className='grid grid-cols-[1fr_140px] items-end gap-12'>
                        <FormField label="Secondary:" />
                        <input type="text" className='border-b border-black text-xs px-2 outline-none w-full text-center bg-transparent' />
                    </div>
                </div>
            </div>

            {/* Section 3: Degree Details */}
            <div className='w-full border-t-[2px] border-black pl-8 mt-2'>
                <div className='flex flex-col w-full'>
                    <div className='w-full'>
                        <FormField label="Candidate for the Degree:" labelWidth='147px' value={lastRecord?.program || ''} />
                    </div>
                    <div className='w-full'>
                        <FormField label="Date of Graduation:" labelWidth='147px' />
                    </div>
                </div>
            </div>
        </div>
    );
}