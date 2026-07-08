import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/Components/ui/alert-dialog";
import { formatFullName } from '@/Lib/Utils';
import { Link, usePage } from '@inertiajs/react';
import { Loader2, ZoomIn, ZoomOut, RotateCcw, EyeOff, Eye, ArrowRight } from 'lucide-react';
import React, { useState, useRef } from 'react'
import { Badge } from '@/Components/ui/badge';
import { computeFinalGrade } from '@/Pages/Grades/GradeUtility';
import AppLogo from '@/Components/AppLogo';
import html2canvas from 'html2canvas';
import { formatName } from '@/Lib/InfoUtils';
import { jsPDF } from 'jspdf';
import { MdFileDownload } from 'react-icons/md';

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
                <div className="w-full px-12 mt-8 text-black flex flex-col gap-2 bg-transparent">
                    {studentName && (
                        <div className="flex items-end gap-2">
                            <div className="col-span-2 font-bold w-24 tracking-widest text-sm">Name:</div>
                            <div className="col-span-3 font-semibold col-start-3 border-b-2 border-gray-900 pl-2 w-96 text-md">{studentName}</div>
                        </div>
                    )}
                    {studentId && (
                        <div className="flex items-end gap-2">
                            <div className="col-span-2 font-bold w-24 tracking-widest text-sm">ID Number.:</div>
                            <div className="col-span-3 font-semibold col-start-3 border-b-2 border-gray-900 pl-2 w-96 text-md">{studentId}</div>
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

    const handleDownload = async () => {
        setIsDownloading(true);

        try {
            await new Promise(resolve => setTimeout(resolve, 150));

            const style = document.createElement("style");
            document.head.appendChild(style);
            style.sheet?.insertRule('body > div:last-child img { display: inline-block; }');
            style.sheet?.insertRule('td div > svg { display: none !important; }');

            const headerEl = document.getElementById('pdf-header');
            const footerEl = document.getElementById('pdf-footer');
            const watermarkEl = document.getElementById('pdf-watermark');

            // Grab all the individual cards instead of the giant wrapper
            const cardElements = document.querySelectorAll('.print-record-card');

            const canvasOptions = { scale: 2, useCORS: true, backgroundColor: '#ffffff' };

            const headerCanvas = await html2canvas(headerEl, canvasOptions);
            const footerCanvas = await html2canvas(footerEl, canvasOptions);
            const watermarkCanvas = await html2canvas(watermarkEl, { scale: 4, useCORS: true, backgroundColor: null });

            const headerImg = headerCanvas.toDataURL("image/jpeg", 0.95);
            const footerImg = footerCanvas.toDataURL("image/jpeg", 0.95);
            const watermarkImg = watermarkCanvas.toDataURL("image/png");

            const pdfWidth = 210;
            const pdfHeight = 297;

            const hHeight = (headerCanvas.height * pdfWidth) / headerCanvas.width;
            const fHeight = (footerCanvas.height * pdfWidth) / footerCanvas.width;

            const PAGE_MARGIN = 10;
            const GAP = 8;

            const topBlocked = PAGE_MARGIN + hHeight + GAP;
            const bottomBlocked = PAGE_MARGIN + fHeight + GAP;

            const wmWidth = 150;
            const wmHeight = (watermarkCanvas.height * wmWidth) / watermarkCanvas.width;
            const wmX = (pdfWidth - wmWidth) / 2;
            const wmY = (pdfHeight - wmHeight) / 2;

            const pdf = new jsPDF('p', 'mm', 'a4');

            // 1. Helper to stamp the solid background elements (Header/Footer)
            const drawBackground = () => {
                pdf.addImage(headerImg, 'JPEG', 0, PAGE_MARGIN, pdfWidth, hHeight);
                pdf.addImage(footerImg, 'JPEG', 0, pdfHeight - PAGE_MARGIN - fHeight, pdfWidth, fHeight);
            };

            // 2. Helper to stamp the transparent watermark ON TOP of everything
            const drawWatermark = () => {
                pdf.addImage(watermarkImg, 'PNG', wmX, wmY, wmWidth, wmHeight);
            };

            // Initialize Page 1 Background
            drawBackground();
            let currentY = topBlocked;

            // Loop through each card one by one
            for (let i = 0; i < cardElements.length; i++) {
                const cardCanvas = await html2canvas(cardElements[i], canvasOptions);
                const cardImg = cardCanvas.toDataURL("image/jpeg", 0.85); // Kept as JPEG for tiny file size
                const cardHeight = (cardCanvas.height * pdfWidth) / cardCanvas.width;

                // Check if this card bleeds off the page
                if (currentY + cardHeight > pdfHeight - bottomBlocked) {
                    // The page is full! Stamp the watermark over this finished page BEFORE adding a new one
                    drawWatermark();

                    pdf.addPage();
                    drawBackground();
                    currentY = topBlocked;
                }

                // Stamp the solid white JPEG card
                pdf.addImage(cardImg, 'JPEG', 0, currentY, pdfWidth, cardHeight);

                currentY += cardHeight + (GAP / 2);
            }

            // The loop is finished. Stamp the watermark on the very last page!
            drawWatermark();

            const filename = `Student_Grades_${user?.name?.replace(/\s+/g, '_') || 'Document'}.pdf`;
            pdf.save(filename);

            style.remove();
        } catch (err) {
            console.error('Error downloading document:', err);
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
                    <MdFileDownload className="w-4 h-4 mr-2" />
                    Download as PDF
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
                    className={`relative pb-12 ${isDownloading ? 'mx-4 text-black bg-white' : ''}`}
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
                    {isDownloading && (
                        <div className="absolute top-0 left-0 -z-50 pointer-events-none p-10 opacity-[0.08]" id="pdf-watermark">
                            <AppLogo size="4xl" className="object-fill grayscale" />
                        </div>
                    )}

                    <div className="relative z-10 space-y-4">
                        <div id="pdf-header" className="bg-white">
                            {isDownloading && (
                                <Header studentName={name} studentId={user?.user_id_no} />
                            )}
                        </div>

                        {/* 2. MAIN CONTENT SECTION (Watermark placed inside) */}
                        <div id="pdf-content" className={`relative space-y-2 ${isDownloading && 'bg-white'}`}>
                            {visibleRecords.map(record => (
                                <Card
                                    key={record.id}
                                    id={`${record.id}-record`}
                                    className={`print-record-card md:mx-0 w-full shadow-none ${isDownloading ? 'bg-transparent text-black border-transparent p-0 w-full px-12' : 'border-border'}`}
                                >
                                    <CardHeader className={`${isDownloading ? 'p-0' : ''}`}>
                                        <CardTitle className="text-2xl">
                                            <div className='w-full flex justify-between gap-2 items-center'>
                                                <div className='sm:flex gap-1'>
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
                                                    <div className='flex flex-col sm:flex-row sm:gap-2'>
                                                        <div>{record.year_level_name}</div>
                                                        <div className='hidden sm:block'>|</div>
                                                        <div className='flex gap-1'>{record.start_year}-{record.end_year} {record.semester_name} <span className='hidden sm:block'>Semester</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className={`${isDownloading ? 'p-0' : ''}`}>
                                        <Table>
                                            <TableHeader>
                                                <TableRow className={isDownloading ? 'border-gray-900/20 hover:bg-transparent' : ''}>
                                                    {isDownloading && (
                                                        <>
                                                            <TableHead className={`w-52 ${isDownloading ? 'text-black' : ''}`}>Instructor</TableHead>
                                                            <TableHead className={`w-44 ${isDownloading ? 'text-black' : ''}`}>Subject Code</TableHead>
                                                        </>
                                                    )}
                                                    <TableHead className={`w-96 ${isDownloading ? 'text-black' : ''}`}>Descriptive Title</TableHead>
                                                    {!isDownloading && (
                                                        <>
                                                            {/* <TableHead className={`w-18 ${isDownloading ? 'text-black' : ''}`}>Midterm</TableHead> */}
                                                            {/* <TableHead className={`w-18 ${isDownloading ? 'text-black' : ''}`}>Final Term</TableHead> */}
                                                        </>
                                                    )}
                                                    <TableHead className={`w-18 text-center ${isDownloading ? 'text-black' : ''}`}>Grade</TableHead>
                                                    <TableHead className={`w-24 text-center ${isDownloading ? 'text-black' : ''}`}>Remarks</TableHead>
                                                    <TableHead className={`w-16 text-center ${isDownloading ? 'text-black' : ''}`}>Credit</TableHead>
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

                                                            const instructor = classInfo.first_name ? formatFullName(classInfo) : classInfo.nstp_faculty_first_name ? formatFullName({ first_name: classInfo.nstp_faculty_first_name, last_name: classInfo.nstp_faculty_last_name, middle_name: classInfo.nstp_faculty_middle_name }) : '-'

                                                            const dropOrfail = finalGrade > 3 || finalGrade == 0;
                                                            const noGrade = finalGrade == null;

                                                            return (
                                                                <TableRow key={classInfo.id} className={isDownloading ? 'border-gray-900/20 hover:bg-transparent' : ''}>
                                                                    {isDownloading && (
                                                                        <>
                                                                            <TableCell>{instructor}</TableCell>
                                                                            <TableCell>{classInfo.subject_code}</TableCell>
                                                                        </>
                                                                    )}
                                                                    <TableCell className='truncate'>{classInfo.descriptive_title}</TableCell>
                                                                    {classInfo.evaluated ? (
                                                                        <>
                                                                            {!isDownloading && (
                                                                                <>
                                                                                    {/* <TableCell>
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
                                                                                    </TableCell> */}
                                                                                </>
                                                                            )}
                                                                            <TableCell className='text-center'>
                                                                                {finalGrade || '-'}
                                                                            </TableCell>
                                                                            <TableCell className='text-center'>
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
                                                                            <TableCell className='text-center'>
                                                                                {!noGrade ? dropOrfail ? '0' : parseFloat(classInfo.credit_units) : ''}
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
                        </div>

                        {/* 3. FOOTER SECTION */}
                        {isDownloading && (
                            <div id="pdf-footer" className="w-full pt-6 pb-8 flex flex-col items-center justify-center space-y-1 bg-white">
                                <p className="italic text-sm font-medium text-gray-700">
                                    This is a system-generated document intended for evaluation purposes only.
                                </p>
                                <p className="text-xs text-gray-500">
                                    Generated on: {new Date().toLocaleString('en-PH', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true,
                                    })}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
