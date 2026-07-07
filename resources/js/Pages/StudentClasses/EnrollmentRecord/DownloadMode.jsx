import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/Components/ui/alert-dialog";
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatFullName } from '@/Lib/Utils';
import { Head, Link, usePage } from '@inertiajs/react';
import { AlertCircle, BookOpen, Loader2, ZoomIn, ZoomOut, RotateCcw, Download, EyeOff, Eye, ArrowRight } from 'lucide-react';
import React, { useState, useRef, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/Components/ui/badge';
import FillUpPrompt from '../CollectStudentData/FillUpPrompt';
import { computeFinalGrade } from '@/Pages/Grades/GradeUtility';
import AppLogo from '@/Components/AppLogo';
import html2canvas from 'html2canvas';
import { formatName } from '@/Lib/InfoUtils';
import html2pdf from 'html2pdf.js';

function WatermarkBackground() {
    const logos = Array.from({ length: 80 });
    return (
        <div className="absolute inset-0 z-0 flex flex-wrap justify-center items-center gap-24 overflow-hidden pointer-events-none opacity-[0.07]">
            {logos.map((_, i) => (
                <div key={i} className="transform gap-20">
                    <AppLogo size="xl" className="object-fill grayscale" />
                </div>
            ))}
        </div>
    );
}

function Header({ studentName, studentId }) {
    return (
        <div className="flex flex-col justify-center items-center pt-14 pb-4 px-4 w-full">
            <div className="flex items-center space-x-2">
                <AppLogo
                    size="md"
                    className="object-fill"
                />

                <div className="flex flex-col items-center text-center text-black">
                    <h1
                        className="text-xl font-black tracking-wide h-6"
                        style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
                    >
                        OPOL COMMUNITY COLLEGE
                    </h1>

                    <p
                        className="text-[1rem] font-bold h-[1.1rem]"
                        style={{ fontFamily: "'Times New Roman', Times, serif" }}
                    >
                        Opol, Misamis Oriental
                    </p>

                    <p
                        className="text-[.7rem] font-medium"
                        style={{ fontFamily: "Arial, sans-serif" }}
                    >
                        • opolcommunitycollege@yahoo.com <span className="ml-3">•</span> www.occ.edu.ph
                    </p>

                    <div className='w-full px-10'>
                        <h2
                            className="text-lg font-black tracking-wide h-6"
                            style={{ fontFamily: "'Arial Black', Arial, sans-serif" }}
                        >
                            OFFICE OF THE REGISTRAR
                        </h2>

                        <div className="w-full border-b-[2px] border-black"></div>
                    </div>
                </div>
            </div>

            {(studentName || studentId) && (
                <div className="w-full px-12 mt-8 text-black flex flex-col gap-2">
                    {studentName && (
                        <div className="flex items-end gap-2">
                            <div className="col-span-2 font-bold w-36 uppercase tracking-widest text-sm">Name:</div>
                            <div className="col-span-3 col-start-3 border-b-2 border-gray-900 pl-2 w-96 font-black text-lg uppercase">{studentName}</div>
                        </div>
                    )}
                    {studentId && (
                        <div className="flex items-end gap-2">
                            <div className="col-span-2 font-bold w-36 uppercase tracking-widest text-sm">Student ID No.:</div>
                            <div className="col-span-3 col-start-3 border-b-2 border-gray-900 pl-2 w-96 font-black text-lg uppercase">{studentId}</div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function DownloadMode({ records }) {
    const [error] = useState(null);
    const { user } = usePage().props.auth;
    const name = formatName(user, { format: 'FULL' });

    const printRef = useRef(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [hiddenRecords, setHiddenRecords] = useState([]);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [initialPinchDist, setInitialPinchDist] = useState(null);

    const handleHide = (id) => {
        if (!hiddenRecords.includes(id)) {
            setHiddenRecords([...hiddenRecords, id]);
        }
    };

    const handleShow = (id) => {
        setHiddenRecords(hiddenRecords.filter(recordId => recordId !== id));
    };



    const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.1, 2));
    const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.1, 0.5));
    const handleResetZoom = () => setZoomLevel(1);

    const handleTouchStart = (e) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            setInitialPinchDist(dist);
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 2 && initialPinchDist) {
            const currentDist = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );

            const scale = currentDist / initialPinchDist;

            setZoomLevel((prevZoom) => {
                const newZoom = prevZoom * scale;
                return Math.min(Math.max(newZoom, 0.4), 2.5);
            });

            setInitialPinchDist(currentDist);
        }
    };

    const handleTouchEnd = () => {
        setInitialPinchDist(null);
    };

    const visibleRecords = records.filter(record => !hiddenRecords.includes(record.id));
    const hiddenRecordsList = records.filter(record => hiddenRecords.includes(record.id));

    const handleDownloadPdf = useCallback(async () => {
        setIsDownloading(true);

        try {
            // Increased from 150ms to 300ms to ensure the DOM fully repaints the 1200px layout
            await new Promise(resolve => setTimeout(resolve, 300));

            const element = document.getElementById("record-to-print");
            if (element) {
                const style = document.createElement("style");
                document.head.appendChild(style);
                style.sheet?.insertRule(
                    "body > div:last-child img { display: inline-block; }"
                );

                const options = {
                    filename: `Enrollment_Record_${user?.name?.replace(/\s+/g, "_") || "Document"}.pdf`,
                    html2canvas: {
                        scale: 2, // Reduced from 5 to prevent silent canvas memory failures
                        useCORS: true,
                        scrollY: 0,
                        windowWidth: 1200
                    },
                    jsPDF: {
                        unit: "mm",
                        format: "a4",
                        orientation: "portrait",
                    },
                };

                await html2pdf()
                    .from(element)
                    .set(options)
                    .save();

                style.remove();
            }
        } catch (err) {
            console.error("Error downloading PDF:", err);
        } finally {
            setIsDownloading(false);
        }
    }, [records, user]);

    const handleDownload = async () => {
        setIsDownloading(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 150));

            const element = printRef.current;

            if (element) {
                const style = document.createElement("style");
                document.head.appendChild(style);
                style.sheet?.insertRule('body > div:last-child img { display: inline-block; }');
                style.sheet?.insertRule('td div > svg { display: none !important; }');

                const canvas = await html2canvas(element, {
                    scale: 5,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                });

                const imageUrl = canvas.toDataURL("image/png");

                const filename = `Student_Grades_${user?.name?.replace(/\s+/g, '_') || 'Document'}.png`;

                const link = document.createElement("a");
                link.href = imageUrl;
                link.download = filename;
                link.click();

                style.remove();
            }
        } catch (err) {
            console.error('Error downloading image:', err);
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="flex flex-col items-center w-full">
            <AlertDialog open={isDownloading}>
                <AlertDialogContent className="max-w-xs flex flex-col items-center">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center">Generating Document</AlertDialogTitle>
                        <AlertDialogDescription className="text-center flex flex-col items-center gap-4">
                            <Loader2 className="w-8 h-8 animate-spin text-foreground mt-2" />
                            Please wait while we prepare your enrollment record...
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                </AlertDialogContent>
            </AlertDialog>

            {!isDownloading && (
                <div className="mb-6 p-4 bg-muted border border-border rounded-lg w-full max-w-[1200px]">
                    <h3 className="font-semibold text-foreground mb-2">How to Download Specific Records:</h3>
                    <ul className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                        <li>Click the <span className="font-semibold px-1 bg-background rounded border">Hide</span> button on any School Year cards you do not want to include in your download.</li>
                        <li>The hidden years will appear in a list above. You can restore them by clicking their button if you change your mind.</li>
                        <li>Once only the desired records are visible, click the <span className="font-semibold text-foreground">Download as Image</span> button.</li>
                    </ul>
                </div>
            )}

            {hiddenRecordsList.length > 0 && !isDownloading && (
                <Card className="mb-4 p-4 rounded-lg flex flex-col gap-2 w-full max-w-[1200px]">
                    <span className="text-sm font-semibold">Hidden School Years</span>
                    <div className="flex flex-wrap gap-2">
                        {hiddenRecordsList.map(record => (
                            <Button
                                key={`hidden-${record.id}`}
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-2"
                                onClick={() => handleShow(record.id)}
                            >
                                <Eye className="w-4 h-4" />
                                {record.start_year}-{record.end_year} {record.semester_name} - {record.year_level_name}
                            </Button>
                        ))}
                    </div>
                </Card>
            )}

            <div className={`mb-2 flex items-center justify-between w-full max-w-[1200px] ${isDownloading ? 'hidden' : ''}`}>
                <Button
                    variant="default"
                    onClick={handleDownload}
                    disabled={isDownloading || visibleRecords.length === 0}
                >
                    <Download className="w-4 h-4 mr-2" />
                    Download as Image
                </Button>

                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoomLevel <= 0.4}>
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleResetZoom} disabled={zoomLevel === 1}>
                        <RotateCcw className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoomLevel >= 2.5}>
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div
                className='max-w-[calc(100vw-2rem)] min-w-[calc(100vw-2rem)] sm:w-auto sm:min-w-0 sm:max-w-none overflow-x-auto sm:p-0 h-min sm:h-auto'
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                style={{ touchAction: 'pan-x pan-y' }}
            >
                <div
                    id='record-to-print'
                    ref={printRef}
                    className={`relative pb-12 ${isDownloading ? 'px-8 text-black bg-white' : ''}`}
                    style={
                        isDownloading
                            ? {
                                width: '1200px',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                zIndex: -50 // Keeps it in the viewport bounds but hidden behind the DOM flow
                            }
                            : {
                                zoom: zoomLevel,
                                transform: `scale(${zoomLevel})`,
                                transformOrigin: 'top left',
                                width: `${100 / zoomLevel}%`
                            }
                    }
                >
                    {isDownloading && <WatermarkBackground />}

                    <div className="relative z-10 space-y-4">
                        {isDownloading && (
                            <Header studentName={name} studentId={user?.user_id_no} />
                        )}
                        {visibleRecords.map(record => (
                            <Card
                                key={record.id}
                                id={`${record.id}-record`}
                                className={`md:mx-0 w-full w-[1150px] shadow-none ${isDownloading ? 'bg-transparent text-black border-transparent' : 'border-border'}`}
                            >
                                <CardHeader>
                                    <CardTitle className="text-2xl">
                                        <div className='w-full flex justify-between gap-2 items-center'>
                                            <div className='flex gap-1'>
                                                {!isDownloading && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleHide(record.id)}
                                                    >
                                                        <EyeOff className="w-4 h-4 mr-2" />
                                                        Hide
                                                    </Button>
                                                )}
                                                <div className='self-start'>{record.year_level_name} |</div>
                                                <div className='self-end'>{record.start_year}-{record.end_year} {record.semester_name} Semester</div>
                                            </div>
                                        </div>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow className={isDownloading ? 'border-gray-900/20 hover:bg-transparent' : ''}>
                                                <TableHead className={`w-52 ${isDownloading ? 'text-black' : ''}`}>Instructor</TableHead>
                                                <TableHead className={`w-44 ${isDownloading ? 'text-black' : ''}`}>Subject Code</TableHead>
                                                <TableHead className={`w-96 ${isDownloading ? 'text-black' : ''}`}>Descriptive Title</TableHead>
                                                {!isDownloading && (
                                                    <>
                                                        <TableHead className={`w-18 ${isDownloading ? 'text-black' : ''}`}>Midterm</TableHead>
                                                        <TableHead className={`w-18 ${isDownloading ? 'text-black' : ''}`}>Final Term</TableHead>
                                                    </>
                                                )}
                                                <TableHead className={`w-18 ${isDownloading ? 'text-black' : ''}`}>Grade</TableHead>
                                                <TableHead className={`w-28 ${isDownloading ? 'text-black' : ''}`}>Remarks</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {error ? (
                                                <TableRow>
                                                    <TableCell colSpan={5} className='text-center'>{error}</TableCell>
                                                </TableRow>
                                            ) : (
                                                <>
                                                    {record.subjects.map(classInfo => {
                                                        const finalGrade = classInfo.grade ? classInfo.grade : computeFinalGrade(classInfo.midterm_grade, classInfo.final_grade);
                                                        const isDropped = (classInfo.midterm_grade == 0.0 || classInfo.final_grade == 0.0) || classInfo.grade == 0.0;
                                                        const isPassed = !isDropped && (classInfo.midterm_grade || classInfo.grade) && (classInfo.final_grade || classInfo.grade) && (finalGrade <= 3 || classInfo.grade <= 3);
                                                        const isFailed = !isDropped && classInfo.midterm_grade && classInfo.final_grade && finalGrade > 3;

                                                        return (
                                                            <TableRow key={classInfo.id} className={isDownloading ? 'border-gray-900/20 hover:bg-transparent' : ''}>
                                                                <TableCell>{classInfo.first_name ? formatFullName(classInfo) : classInfo.nstp_faculty_first_name ? formatFullName({ first_name: classInfo.nstp_faculty_first_name, last_name: classInfo.nstp_faculty_last_name, middle_name: classInfo.nstp_faculty_middle_name }) : '-'}</TableCell>
                                                                <TableCell>{classInfo.subject_code}</TableCell>
                                                                <TableCell className='truncate'>{classInfo.descriptive_title}</TableCell>
                                                                {classInfo.evaluated ? (
                                                                    <>
                                                                        {!isDownloading && (
                                                                            <>
                                                                                <TableCell>
                                                                                    {classInfo.midterm_grade === 0.0 ? (
                                                                                        <span className="text-red-500 font-medium">DROPPED</span>
                                                                                    ) : classInfo.midterm_grade ? (
                                                                                        classInfo.midterm_grade?.toFixed(1)
                                                                                    ) : (
                                                                                        '-'
                                                                                    )}
                                                                                </TableCell>
                                                                                <TableCell>
                                                                                    {classInfo.final_grade == 0.0 ? (
                                                                                        <span className="text-red-500 font-medium">DROPPED</span>
                                                                                    ) : classInfo.final_grade ? (
                                                                                        classInfo.final_grade?.toFixed(1)
                                                                                    ) : (
                                                                                        '-'
                                                                                    )}
                                                                                </TableCell>
                                                                            </>
                                                                        )}
                                                                        <TableCell>
                                                                            {finalGrade || '-'}
                                                                        </TableCell>
                                                                        <TableCell>
                                                                            {isDropped ? (
                                                                                <Badge variant="outline" className="border-amber-200 text-amber-800 bg-amber-50">
                                                                                    DROPPED
                                                                                </Badge>
                                                                            ) : isPassed ? (
                                                                                <Badge variant="outline" className="border-green-200 text-green-800 bg-green-50">
                                                                                    PASSED
                                                                                </Badge>
                                                                            ) : isFailed ? (
                                                                                <Badge variant="destructive">
                                                                                    FAILED
                                                                                </Badge>
                                                                            ) : (
                                                                                <span className="text-muted-foreground">-</span>
                                                                            )}
                                                                        </TableCell>
                                                                    </>
                                                                ) : (
                                                                    <TableCell colSpan='4' className='text-center '>
                                                                        <div className='flex flex-row items-center gap-3 justify-end'>
                                                                            <Link href={route('student.evaluation')}>
                                                                                <Button variant='link' className='p-0 h-min'>
                                                                                    <span className='font-medium'>Evaluation Required</span>
                                                                                    {!isDownloading && <ArrowRight className="ml-1 w-4 h-4" />}
                                                                                </Button>
                                                                            </Link>
                                                                        </div>
                                                                    </TableCell>
                                                                )}
                                                            </TableRow>
                                                        )
                                                    })}
                                                </>
                                            )}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ))}

                        <div className="w-full mt-8 pt-4 pb-8 flex flex-col items-center justify-center space-y-1">
                            <p className="italic text-sm font-medium text-gray-700">
                                This is a system-generated document and only for evaluation purpose only.
                            </p>
                            <p className="text-xs text-gray-500">
                                Generated on: {new Date().toLocaleString('en-PH', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
