import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react'
import CorGenerator from '../COR/CorGenerator';
import PreLoader from '@/Components/preloader/PreLoader';
import { Button } from '@/Components/ui/button';
import { useReactToPrint } from 'react-to-print';

function StudentCor({ courseId, section, yearlevel, studentIdNo, schoolYearId }) {
    const [loading, setLoading] = useState([]);

    const componentRef = useRef(null);

    const [data, setData] = useState([]);

    const getStudentInfoCor = async () => {
        try {
            const response = await axios.post(route('enrollment.student.info.cor', {
                courseId,
                section,
                yearlevel,
                studentIdNo,
                schoolYearId
            }));
            setData(response.data);
            setLoading(false);
        } catch (error) {
            console.error("Failed to fetch student info:", error);
            // Optionally handle error state in UI
        }
    };

    useEffect(() => {
        getStudentInfoCor();
    }, [])

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
    const { user } = usePage().props.auth; // always called
    const userRole = user.user_role;

    const departmentId = data?.year_section?.course?.department_id;
    const showSeal = departmentId == 1 && (userRole !== 'program_head' && userRole !== 'registrar');


    if (loading) return <PreLoader title="COR" />



    return (
        <div className='space-y-4'>
            <Head title='COR' />
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

            <div ref={componentRef} className="shadow-heavy rounded-2xl w-full flex justify-center">
                <div>
                    <CorGenerator data={data} showSeal={showSeal} />
                </div>
            </div>
        </div>
    )
}

export default StudentCor
StudentCor.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
