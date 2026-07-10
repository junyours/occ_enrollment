import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useQuery } from '@tanstack/react-query';
import { formatName } from '@/Lib/InfoUtils';
import { Button } from '@/Components/ui/button';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';
import StudentSearch from '@/Components/StudentSearch';
import { Head } from '@inertiajs/react';
import Paper from './Paper';
import PaperContainer from './components/PaperContainer';
import { Card } from '@/Components/ui/card';
import AddRecordDialog from './AddRecordDialog';
import AddStudentInfo from './AddStudentInfo';
import { Edit, PlusSquareIcon } from 'lucide-react';

export default function Index() {
    const documentRef = useRef(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [addingRecord, setAddingRecord] = useState(false);
    const [addingInfo, setAddingInfo] = useState(false);

    const fetchStudentRecord = async () => {
        const { data } = await axios.get(route('permanent-record-student', { id: selectedStudent?.id }));
        return data;
    };

    const { data, isLoading } = useQuery({
        queryKey: ['permanent-record-student', selectedStudent?.id],
        queryFn: fetchStudentRecord,
        enabled: !!selectedStudent?.id,
    });

    // --- React-To-Print Setup ---
    const handlePrint = useReactToPrint({
        contentRef: documentRef,
        content: () => documentRef.current,
        documentTitle: `Form 9 - ${data ? formatName(data.info.information, { format: 'LFM' }) : 'Student Record'}`,
        removeAfterPrint: true,
    });

    return (
        <div>
            <Head title='Permanent Record' />
            <div className="flex flex-col ">
                <Card className="flex items-center justify-between p-4 rounded-t-lg border border-b-0 shadow-sm rounded-b-none gap-16">
                    <div className="flex-1 flex gap-4">
                        <StudentSearch onSelect={setSelectedStudent} className='max-w-96' />
                        {selectedStudent && (
                            <>
                                <Button
                                    onClick={() => setAddingRecord(true)}
                                    className="px-6 font-semibold"
                                    variant='secondary'
                                >
                                    <PlusSquareIcon /> Records
                                </Button>
                                <Button
                                    onClick={() => setAddingInfo(true)}
                                    className="px-6 font-semibold"
                                    variant='secondary'
                                >
                                    <Edit /> Info
                                </Button>
                            </>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handlePrint}
                            className="px-6 font-semibold"
                        >
                            Print Record
                        </Button>
                    </div>
                </Card>
                <Card className="relative flex-1 flex flex-col rounded-b-lg max-h-[calc(100vh-10rem)] min-h-[calc(100vh-10rem)] overflow-auto rounded-t-none text-black">
                    <PaperContainer>
                        <div ref={documentRef} className="px-12 py-4 print:p-0 print:bg-white">
                            {(isLoading) ? (
                                <div className="flex flex-col items-center justify-center py-32 text-slate-500">
                                    <div className="animate-pulse font-medium">Loading record...</div>
                                </div>
                            ) : !data ? (
                                <div className="flex flex-col items-center justify-center py-32 text-slate-400 italic">
                                    <p>Select a student to preview Form 9</p>
                                </div>
                            ) : (
                                <Paper data={data} />
                            )}
                        </div>
                    </PaperContainer>
                </Card>
            </div>
            {addingRecord && (
                <AddRecordDialog student={selectedStudent} open={addingRecord} onClose={setAddingRecord} />
            )}
            {addingInfo && (
                <AddStudentInfo student={selectedStudent} open={addingInfo} onClose={setAddingInfo} />
            )}
        </div>
    );
}

Index.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>