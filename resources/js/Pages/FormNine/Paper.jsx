import React, { useEffect, useRef, useState } from 'react'
import StudentInfo from './StudentInfo';
import CollegiateRecords from './components/CollegiateRecords';
import SYGrades from './SYGrades';
import Header from './components/Header';
import { cn } from '@/Lib/Utils';

// 1. Used React.forwardRef so we can measure the Header perfectly
const THead = React.forwardRef((props, ref) => (
    <thead ref={ref} className="table-header-group">
        <tr><td><Header /></td></tr>
    </thead>
))

// 2. Used React.forwardRef for the footer
const TFoot = React.forwardRef((props, ref) => (
    <tfoot ref={ref} className="table-footer-group">
        <tr>
            {/* Kept your 15mm height to protect the page numbers */}
            <td className="h-[15mm] print:h-[15mm]"></td>
        </tr>
    </tfoot>
))

const NothingFollows = () => (
    <div className='border-y border-black mt-4'>
        <p className='text-center text-sm italic'>*** Nothing Follows ***</p>
    </div>
)

const Confirmation = () => (
    <div className='flex border border-black text-xs bg-white'>
        <div className=' py-4 px-2 border-r border-black'>
            <p className='text-center'>
                I hereby certify that the above-named student have been verified by me and that the true copies of the official records substantiating the same are kept in the files of the school. I also certify that this student has enrolled in this institution.
            </p>
        </div>
        <div className='grid grid-rows-[19px_19px_19px_19px] w-[500px] h-full'>
            <div className='row-span-2'>Prepared by:</div>
            <div className='font-semibold text-center self-end'>BERNADETH T. NACUA, LPT</div>
            <div className='self-end w-full border-t border-black text-center'>Registrar 1</div>
        </div>
    </div>
)

export default function Paper({ data, className }) {
    const wrapperRef = useRef(null);
    const tableRef = useRef(null);
    const theadRef = useRef(null);
    const tfootRef = useRef(null);

    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        if (!data || !wrapperRef.current || !tableRef.current || !theadRef.current || !tfootRef.current) return;

        // Reset to auto to get an accurate, raw measurement
        wrapperRef.current.style.height = 'auto';

        setTimeout(() => {
            const screenHeight = tableRef.current.offsetHeight;
            const headerHeight = theadRef.current.offsetHeight;
            const tfootHeight = tfootRef.current.offsetHeight;

            const A4_HEIGHT = 1123; // standard A4 at 96dpi
            const PADDING_Y = 64;   // your p-8 wrapper padding

            let pages = 1;

            // Add a 50px tolerance to account for space lost when the browser breaks rows
            let estimatedPrintHeight = screenHeight + PADDING_Y + 50;

            // This loop calculates EXACTLY how many pages it takes by simulating the
            // print engine adding a new Header & Footer onto every single extra page
            while (estimatedPrintHeight > pages * A4_HEIGHT) {
                pages++;
                estimatedPrintHeight = screenHeight + PADDING_Y + 50 + ((pages - 1) * (headerHeight + tfootHeight));
            }

            // Lock the wrapper height exactly to the multiples of A4 
            // The -1mm prevents hardware margins from forcing a blank page
            wrapperRef.current.style.height = `calc(${pages * 297}mm - 1mm)`;
            setTotalPages(pages);
        }, 150);
    }, [data]);

    return (
        <div
            ref={wrapperRef}
            className={cn(`relative w-[210mm] mx-auto bg-white shadow-lg p-8`, className)}
        >
            {/* Added relative and z-10 so it sits above the absolute signature */}
            <table ref={tableRef} className="w-full border-collapse relative z-10">
                <THead ref={theadRef} />
                <tbody>
                    {/* 1. Put Student Info in its own row */}
                    <tr>
                        <td className="p-0 border-0">
                            <StudentInfo info={data.info} />
                        </td>
                    </tr>

                    {/* 2. Put Collegiate Records in its own row */}
                    <tr>
                        <td className="p-0 border-0">
                            <CollegiateRecords />
                        </td>
                    </tr>

                    {/* 3. Map each semester to its OWN row! */}
                    {data.enrollmentRecord.map((record, index) => (
                        <tr key={index}>
                            <td className="p-0 border-0">
                                <SYGrades data={record} className='mb-6' />
                            </td>
                        </tr>
                    ))}

                    {/* 4. Nothing Follows */}
                    <tr>
                        <td className="p-0 border-0">
                            <NothingFollows />
                        </td>
                    </tr>

                    {/* 5. The Bumper */}
                    <tr className="hidden print:table-row">
                        <td className="h-[250px] print:h-[250px] text-transparent select-none p-0 border-0">.</td>
                    </tr>
                </tbody>
                <TFoot ref={tfootRef} />
            </table>

            {/* THE SIGNATURE: Pinned to the floor of our perfectly calculated wrapper.
                It sits exactly 20mm from the bottom, safely above your page numbers. */}
            <div
                className="absolute left-0 w-full px-8 hidden print:block z-0"
                style={{ bottom: '20mm' }}
            >
                <Confirmation />
            </div>

            {/* Page Overlays */}
            {Array.from({ length: totalPages }).map((_, i) => (
                <div
                    key={i}
                    className="absolute left-0 w-full text-center text-sm font-semibold print:text-[11px] hidden print:block"
                    style={{ top: `calc(${(i + 1) * 297}mm - 15mm)` }}
                >
                    {i + 1} / {totalPages}
                </div>
            ))}
        </div>
    )
}