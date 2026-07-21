import React, { useEffect, useRef, useState } from 'react'
import StudentInfo from './StudentInfo';
import CollegiateRecords from './components/CollegiateRecords';
import SYGrades from './SYGrades';
import Header from './components/Header';
import { cn } from '@/Lib/Utils';

const THead = React.forwardRef((props, ref) => (
    <thead ref={ref} className="table-header-group">
        <tr><td><Header /></td></tr>
    </thead>
))

const TFoot = React.forwardRef((props, ref) => (
    <tfoot ref={ref} className="table-footer-group">
        <tr>
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
    <div>
        <div className='grid grid-cols-[1fr_200px] border border-black text-xs bg-white'>
            <div className=' py-4 px-2 border-r border-black'>
                <p className='text-center'>
                    I hereby certify that the above-named student have been verified by me and that the true copies of the official records substantiating the same are kept in the files of the school. I also certify that this student has enrolled in this institution.
                </p>
            </div>
            <div className='grid grid-rows-[19px_19px_19px_19px] h-full'>
                <div className='row-span-2'>Prepared by:</div>
                <div className='font-semibold text-center self-end'>BERNADETH T. NACUA, LPT</div>
                <div className='self-end w-full border-t border-black text-center'>Registrar 1</div>
            </div>
        </div>
        <div className='grid grid-cols-[1fr_200px] text-xs'>
            <div />
            <div className='h-full'>
                <div className='row-span-2'>Date: {new Date().toLocaleDateString()}</div>
            </div>
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

        wrapperRef.current.style.height = 'auto';

        setTimeout(() => {
            const screenHeight = tableRef.current.offsetHeight;
            const headerHeight = theadRef.current.offsetHeight;
            const tfootHeight = tfootRef.current.offsetHeight;

            const A4_HEIGHT = 1123;
            const PADDING_Y = 64;
            const BUFFER = 150;

            let estimatedPrintHeight = screenHeight + PADDING_Y + BUFFER;
            let pages = 1;

            while (estimatedPrintHeight > pages * A4_HEIGHT) {
                pages++;
                estimatedPrintHeight += (headerHeight + tfootHeight);
            }

            wrapperRef.current.style.height = `calc(${pages * 297}mm - 1mm)`;
            setTotalPages(pages);
        }, 200);
    }, [data]);

    const totalUnits = data.enrollmentRecord.reduce(
        (sum, record) =>
            sum +
            record.subjects.reduce(
                (subSum, subject) =>
                    (subject.grade > 3 || subject.grade == 0 || subject.grade == null)
                        ? subSum
                        : subSum + parseFloat(subject.credit_units || 0),
                0
            ),
        0
    );

    return (
        <div
            ref={wrapperRef}
            className={cn(`relative w-[210mm] mx-auto bg-white shadow-lg p-8`, className)}
        >
            <style type="text/css" media="print">
                {`
                    @page { 
                        size: A4; 
                        margin: 0mm;
                    }
                    body { 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact; 
                    }
                `}
            </style>
            <table ref={tableRef} className="w-full border-collapse relative z-10">
                <THead ref={theadRef} />
                <tbody>
                    {/* Student Info */}
                    <tr>
                        <td className="p-0 border-0">
                            <StudentInfo info={data.info} lastRecord={data.enrollmentRecord[data.enrollmentRecord.length - 1]} />
                        </td>
                    </tr>

                    {/* Collegiate Records */}
                    <tr>
                        <td className="p-0 border-0">
                            <CollegiateRecords />
                        </td>
                    </tr>

                    {/* Map each semester */}
                    {data.enrollmentRecord.map((record, index) => (
                        <tr key={index}>
                            <td className="p-0 border-0">
                                <SYGrades data={record} className='mb-6' />
                            </td>
                        </tr>
                    ))}

                    {/* Total Units */}
                    <tr>
                        <td className="p-0 border-0">
                            <table className='w-full mb-4'>
                                <thead>
                                    <tr className=''>
                                        <th className='text-xs text-left w-32 pl-8 font-normal py-0.5'></th>
                                        <th className='text-xs font-normal'></th>
                                        <th className='text-xs font-normal w-16'></th>
                                        <th className='text-xs font-normal w-16'></th>
                                        <th className='text-xs font-normal w-16'></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className='border-b border-gray-400'>
                                        <td className='text-xs  pl-8 py-0.5'></td>
                                        <td className='text-xs'></td>
                                        <td className='text-xs text-center'></td>
                                        <td className='text-xs text-center'>Total Units:</td>
                                        <td className='text-xs text-center'>{totalUnits}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>

                    {/* Nothing Follows */}
                    <tr>
                        <td className="p-0 border-0">
                            <NothingFollows />
                        </td>
                    </tr>


                </tbody>
                <TFoot ref={tfootRef} />
            </table>

            {/* Signature */}
            <div
                className="absolute left-0 w-full px-8 print:block z-0"
                style={{ bottom: '20mm' }}
            >
                <Confirmation />
            </div>

            {/* Page Numbers */}
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