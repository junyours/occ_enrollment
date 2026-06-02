import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, router, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react'
import CorGenerator from '../COR/CorGenerator';
import PreLoader from '@/Components/preloader/PreLoader';
import { Button } from '@/Components/ui/button';
import { useReactToPrint } from 'react-to-print';
import { useQuery } from '@tanstack/react-query';
import CORSkeleton from './CorSkeleton';
import { set } from 'react-hook-form';
import { cn } from '@/Lib/Utils';

function StudentCor({ courseId, section, yearlevel, studentIdNo, schoolYearId }) {

    const componentRef = useRef(null);

    const getStudentInfoCor = async () => {
        const response = await axios.post(route('enrollment.student.info.cor', {
            courseId,
            section,
            yearlevel,
            studentIdNo,
            schoolYearId
        }));
        return response.data;
    };

    const { data, isLoading, isError } = useQuery({
        queryKey: ['enrollment.student.info.cor', courseId, section, yearlevel, studentIdNo, schoolYearId],
        queryFn: getStudentInfoCor,
        enabled: !!(courseId && section && yearlevel && studentIdNo && schoolYearId),
    });

    const getCorInfo = async () => {
        const response = await axios.post(route('enrollment.corinfo'), {
            enrolledStudentId: data.id
        });
        console.log(response.data);

        return response.data;
    }

    // useEffect(() => {
    //     getCorInfo();
    // }, []);

    const { data: corInfo, isLoading: corInfoLoading } = useQuery({
        queryKey: ['enrollment.corinfo', data?.id],
        queryFn: getCorInfo,
        enabled: !!data?.id,
    });

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    });

    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.key === 'p' || event.key === 'P') {
                handlePrint();
            }
        };

        window.addEventListener('keydown', handleKeyPress);

        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [handlePrint]);

    const { user } = usePage().props.auth;
    const userRole = user.user_role;

    const departmentId = data?.year_section?.course?.department_id;
    const showSeal = departmentId == 1 && (userRole !== 'program_head' && userRole !== 'registrar');

    const [markingAsPrinted, setMarkingAsPrinted] = useState(false);

    const markAsPrinted = async () => {
        setMarkingAsPrinted(true);

        await axios.post(route('enrollment.corinfo.mark-printed'), { enrolledStudentId: data.id })
            .finally(() => setMarkingAsPrinted(false))
            .catch((error) => {
                console.error('Error marking COR as printed:', error);
            });
    };

    return (
        <div className='space-y-4'>
            <Head title='COR' />
            <div className='w-full flex justify-center'>
                <div className="flex justify-between w-[800px] px-5">
                    <div className="flex justify-center text-center space-x-2 rounded-md w-full">
                        <Button
                            disabled={showSeal}
                            onClick={handlePrint}
                            className="w-30 text-lg transition transform active:scale-95"
                        >
                            Print
                        </Button>
                        <p className="content-center text-gray-500 text-sm">or Press "P" on your keyboard to print</p>
                    </div>

                    {/* <>
                        {corInfoLoading ? (
                            <>Loading</>
                        ) : (
                            <Button
                                variant="outline"
                                className={cn(
                                    (markingAsPrinted || true) && "cursor-not-allowed opacity-50"
                                )}
                                onClick={() => {
                                    if ((markingAsPrinted || true)) return
                                    markAsPrinted()
                                }}
                            >
                                Mark as printed
                            </Button>
                        )}
                    </> */}

                </div>
            </div>

            <div ref={componentRef} className="shadow-heavy rounded-2xl w-full flex justify-center">
                <div>
                    {isLoading ? <CORSkeleton /> : isError ? <div className="p-4 text-red-500">Error loading COR data. Please try again later.</div> :
                        <CorGenerator data={data} />
                    }
                </div>
            </div>
        </div >
    )
}

export default StudentCor
StudentCor.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
