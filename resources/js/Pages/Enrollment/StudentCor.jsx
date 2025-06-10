import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, usePage } from '@inertiajs/react';
import axios from 'axios';
import React, { useEffect, useRef, useState } from 'react'
import CorGenerator from './CorGenerator';
import PreLoader from '@/Components/preloader/PreLoader';
import { Button } from '@/Components/ui/button';
import { CircleArrowOutUpLeft } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

function StudentCor() {
    const { courseId, section, yearlevel, studentIdNo } = usePage().props;

    const [loading, setLoading] = useState([]);

    const componentRef = useRef(null);

    const [data, setData] = useState([]);

    const getStudentInfoCor = async () => {
        try {
            const response = await axios.post(route('enrollment.student.info.cor', {
                courseId,
                section,
                yearlevel,
                studentIdNo
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

    if (loading) return <PreLoader title="COR" />

    return (
        <div className='space-y-4'>
            <Head title='COR' />
            <div className="flex justify-center text-center space-x-2 rounded-md w-full">
                <Button
                    onClick={handlePrint}
                    className="w-30 text-lg transition transform active:scale-95"
                >
                    Print
                </Button>
                <p className="content-center text-gray-500 text-sm">or Press "P" on your keyboard to print</p>
            </div>

            <div className="shadow-heavy rounded-2xl w-full flex justify-center">
                <div ref={componentRef}>
                    <CorGenerator data={data} />
                </div>
            </div>
        </div>
    )
}

export default StudentCor
StudentCor.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
