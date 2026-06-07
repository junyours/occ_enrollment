import StudentList from './StudentList';
import { useRef, useState } from 'react';
import SubmitButton from './SubmitButton';
import { toast } from 'sonner';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import GradeHeader from '@/Pages/Grades/GradeHeader';
import { formatName } from '@/Lib/InfoUtils';
import { useReactToPrint } from 'react-to-print';
import { Button } from '@/Components/ui/button';
import { Printer } from 'lucide-react';
import GradeSignatories from '../../ClassComponents/GradePartials/GradeSignatories';
import NstpGradeSignatories from './NstpGradeSignatories';

export default function GradesIndex({ id, allowMidtermUpload, allowFinalUpload, faculty, componentName, sectionName, schoolYear }) {


    /* ==========================================================================
       Queries
       ========================================================================== */
    const getNstpSectionGradeSubmissionStatus = async () => {
        try {
            const url = route('nstp-section.grade-submission-status', { id });

            const response = await axios.get(url);

            return response.data;
        } catch (error) {
            toast.error('Something went wrong! Please try refreshing your browser');
            throw error;
        }
    }

    const { data: gradeSubmissionStatus, isLoading, isError, refetch } = useQuery({
        queryKey: ['nstp-section.grade-submission-status', id],
        queryFn: getNstpSectionGradeSubmissionStatus,
        enabled: !!id,
        staleTime: 5 * 60 * 1000,
    });


    /* ==========================================================================
       State
       ========================================================================== */
    const [missingFields, setMissingFields] = useState({});
    const [localGrades, setLocalGrades] = useState({});


    /* ==========================================================================
       State
       ========================================================================== */
    const componentRef = useRef(null);
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    });

    /* ==========================================================================
        Render
       ========================================================================== */
    return (
        <div className="">
            {/* TOP */}
            <Button
                variant="outline"
                onClick={handlePrint}
                className="h-11 mb-4"
            >
                <Printer className="w-4 h-4 mr-2" />
                Print
            </Button>

            {/* MAIN CONTENT */}
            <div ref={componentRef} className='print:p-4 print:space-y-4'>
                <GradeHeader
                    name={formatName(faculty, { format: "LFM" })}
                    subjectCode={'NSTP'}
                    descriptiveTitle={componentName.toUpperCase()}
                    courseSection={`${componentName.toUpperCase()} - ${sectionName.toUpperCase()}`}
                    schoolYear={schoolYear}
                />
                <StudentList
                    id={id}
                    allowMidtermUpload={allowMidtermUpload}
                    allowFinalUpload={allowFinalUpload}
                    localGrades={localGrades}
                    setLocalGrades={setLocalGrades}
                    missingFields={missingFields}
                    setMissingFields={setMissingFields}
                    gradeSubmissionLoading={isLoading || !gradeSubmissionStatus || isError}
                    gradeSubmissionStatus={gradeSubmissionStatus}
                />

                {/* SINATORIES */}
                <NstpGradeSignatories faculty={formatName(faculty, { format: 'FMI', casing: 'upper' })} />
            </div>

            <div className='h-28' />

            {!isLoading && gradeSubmissionStatus && !isError && (
                <SubmitButton
                    nstpSectionId={id}
                    allowMidtermUpload={allowMidtermUpload}
                    allowFinalUpload={allowFinalUpload}
                    localGrades={localGrades}
                    setMissingFields={setMissingFields}
                    gradeSubmissionStatus={gradeSubmissionStatus}
                    refetchGradeSubmissionStatus={refetch}
                />
            )}
        </div>
    )
}