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
import { Edit, List, PlusSquareIcon } from 'lucide-react';

export default function Index() {
    const documentRef = useRef(null);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [addingRecord, setAddingRecord] = useState(false);
    const [addingInfo, setAddingInfo] = useState(false);
    const [viewRecords, setViewRecords] = useState(false);

    const fetchStudentRecord = async () => {
        const { data } = await axios.get(route('permanent-record-student', { id: selectedStudent?.id }));
        return data;
    };

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['permanent-record-student', selectedStudent?.id],
        queryFn: fetchStudentRecord,
        enabled: !!selectedStudent?.id,
        staleTime: 1000 * 60 * 1
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
                <Card className="flex flex-col md:flex-row items-center justify-between p-4 rounded-t-lg border border-b-0 shadow-sm rounded-b-none gap-4 md:gap-8">
                    <div className="flex-1 flex flex-col md:flex-row gap-4 w-full">
                        <StudentSearch onSelect={setSelectedStudent} className='w-full md:max-w-96' />

                        {selectedStudent && (
                            <div className='w-full flex gap-4'>
                                <Button
                                    onClick={() => setAddingRecord(true)}
                                    className="px-4 font-semibold flex items-center gap-2"
                                    variant='secondary'
                                >
                                    <PlusSquareIcon size={18} /> Add Record
                                </Button>
                                
                                <Button
                                    onClick={() => setAddingInfo(true)}
                                    className="px-4 font-semibold flex items-center gap-2"
                                    variant='secondary'
                                >
                                    <Edit size={18} /> Edit Info
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center w-full md:w-auto mt-4 md:mt-0">
                        <Button
                            onClick={handlePrint}
                            className="w-full md:w-auto px-6 font-semibold"
                        >
                            Print Record
                        </Button>
                    </div>
                </Card>
                <Card className="relative flex-1 flex flex-col rounded-b-lg max-h-[calc(100vh-10rem)] min-h-[calc(100vh-10rem)] overflow-auto rounded-t-none text-black">
                    <PaperContainer>
                        <div ref={documentRef} className="px-12 py-4 print:p-0 print:bg-white">
                            {(isLoading || isFetching) ? (
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