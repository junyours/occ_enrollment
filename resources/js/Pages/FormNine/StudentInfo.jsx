import React from 'react';
import FormField from './components/FormField';
import { cn } from '@/Lib/Utils';
import { formatName } from '@/Lib/InfoUtils';

export default function StudentInfo({ info }) {
    const { information, parent } = info;
    console.log(information);
    console.log(parent);


    return (
        <div className='w-full max-w-4xl mx-auto font-sans text-black font-semibold'>
            {/* Header 1: COLLEGE PERMANENT RECORD */}
            <div className='w-full flex justify-center border-y-[2px] border-black'>
                <p className='text-md font-extrabold uppercase tracking-wide'>College Permanent Record</p>
            </div>

            {/* Section 1: Personal Details */}
            <div className='grid grid-cols-[1fr_260px] gap-x-4 pl-8'>
                <div className='flex flex-col'>
                    <FormField label="Name:" value={formatName(information)} />
                    <FormField label="Date of Birth:" value={information.birthday} />
                    <FormField label=" Place of Birth:" value={information.birthday} />
                    <FormField label="Home Address:" value={information.address} />
                </div>
                <div className='flex flex-col'>
                    <FormField label="Gender:" value={information.gender} />
                    <FormField label="Civil Status:" value={information.civil_status} />
                    <FormField label="Father's Name:" value={formatName({ first_name: parent?.father_first_name, last_name: parent?.father_last_name, middle_name: parent?.father_middle_name })} />
                    <FormField label="Mother's Name:" value={formatName({ first_name: parent?.mother_first_name, last_name: parent?.mother_maiden_last_name, middle_name: parent?.mother_middle_name })} />
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
                        <div className='flex items-end gap-2'>      
                            <span className={`text-xs whitespace-nowrap`} style={{ width: '100px' }}>
                                Elementary:
                            </span>
                            <input type="text" className='border-b border-black text-xs px-2 outline-none w-full text-left bg-transparent' />
                        </div>
                        <input type="text" className='border-b border-black text-xs px-2 outline-none w-full text-center bg-transparent' />
                    </div>

                    {/* Secondary */}
                    <div className='grid grid-cols-[1fr_140px] items-end gap-12'>
                        <div className='flex items-end gap-2'>
                            <span className={`text-xs whitespace-nowrap`} style={{ width: '100px' }}>
                                Secondary:
                            </span>
                            <input type="text" className='border-b border-black text-xs px-2 outline-none w-full text-left bg-transparent' />
                        </div>
                        <input type="text" className='border-b border-black text-xs px-2 outline-none w-full text-center bg-transparent' />
                    </div>
                </div>
            </div>

            {/* Section 3: Degree Details */}
            <div className='w-full border-t-[2px] border-black pl-8 mt-2'>
                <div className='flex flex-col w-full'>
                    <div className='flex items-end gap-2 mt-0.5'>
                        <span className={`text-xs whitespace-nowrap`} style={{ width: '190px' }}>
                            Candidate for the Degree:
                        </span>
                        <input type="text" className='border-b border-black text-xs px-2 outline-none w-full text-left bg-transparent' />
                    </div>
                    <div className='flex items-end gap-2 mt-0.5'>
                        <span className={`text-xs whitespace-nowrap`} style={{ width: '190px' }}>
                            Date of Graduation:
                        </span>
                        <input type="text" className='border-b border-black text-xs px-2 outline-none w-full text-left bg-transparent' />
                    </div>
                </div>
            </div>
        </div>
    );
}