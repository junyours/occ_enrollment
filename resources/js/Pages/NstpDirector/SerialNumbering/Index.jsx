import { Card, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from '@/Components/ui/alert-dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/ui/table";
import CopyButton from '@/Components/ui/CopyButton';
import UseQueryTable from '@/Components/UseQueryTable/Index';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { formatName } from '@/Lib/InfoUtils';
import React, { useState, useRef } from 'react';
import { Pencil, Check, X, Download, Upload, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { useQueryClient } from "@tanstack/react-query";
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

const SerialNumberCell = ({ row }) => {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [serialNumber, setSerialNumber] = useState(row.serial_number || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await axios.post(route('nstp-director.serial-numbering.serial-change'), {
                id: row.id,
                serialNumber: serialNumber
            });
            await queryClient.invalidateQueries({
                queryKey: ['nstp-director-serial-numbering.student-list']
            });
            setIsEditing(false);
            toast.success('Serial number updated successfully');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Error saving serial number');
            console.error("Error saving serial number:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setSerialNumber(row.serial_number || '');
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <Input
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    placeholder="Enter Serial No."
                    className="h-8 w-full max-w-[160px]"
                    autoFocus
                />
                <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="h-8 w-8 p-0"
                >
                    {isSaving ? (
                        <span className="animate-pulse">...</span>
                    ) : (
                        <Check className="h-4 w-4" />
                    )}
                    <span className="sr-only">Save</span>
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="h-8 w-8 p-0"
                >
                    <X className="h-4 w-4 text-muted-foreground" />
                    <span className="sr-only">Cancel</span>
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center group gap-2 h-8">
            <div className="flex items-center gap-2">
                {row.serial_number ? (
                    <>
                        <CopyButton text={row.serial_number} size="xs" />
                        <span>{row.serial_number}</span>
                    </>
                ) : (
                    <span className="text-muted-foreground text-sm italic">No serial number</span>
                )}
            </div>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsEditing(true)}
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Pencil className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Edit</span>
            </Button>
        </div>
    );
};

const columns = [
    {
        header: 'ID Number',
        accessor: 'user_id_no',
        className: 'w-[150px]',
        render: (row) => (
            <div className="flex items-center gap-2">
                <CopyButton text={row.user_id_no} size='xs' />
                <span>{row.user_id_no}</span>
            </div>
        )
    },
    {
        header: 'Student Name',
        className: 'w-[250px]',
        render: (row) => {
            return `${formatName(row, { format: 'LFM' })}`;
        }
    },
    {
        header: 'Serial Number',
        className: 'w-[300px]',
        render: (row) => <SerialNumberCell row={row} />
    },
]

export default function Index() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);

    // Upload State
    const [parsedData, setParsedData] = useState([]);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadErrors, setUploadErrors] = useState([]); // NEW: State to hold backend conflict errors

    const downloadExcel = () => {
        const worksheet = XLSX.utils.json_to_sheet([]);

        XLSX.utils.sheet_add_json(
            worksheet,
            [],
            {
                header: ['Student ID', 'Last Name', 'First Name', 'Serial Number'],
                skipHeader: false,
                origin: 'A1',
            }
        );

        worksheet['!cols'] = [
            { wch: 20 }, // Student ID
            { wch: 15 }, // Last Name
            { wch: 15 }, // First Name
            { wch: 20 }, // Serial Number
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
        XLSX.writeFile(workbook, 'serial_number_students_template.xlsx');
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadErrors([]); // Reset errors on new file select

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    toast.error("The uploaded file is empty.");
                    return;
                }

                setParsedData(data);
                setIsAlertOpen(true);
            } catch (error) {
                toast.error("Failed to read the file. Please ensure it's a valid Excel file.");
            }
        };
        reader.readAsBinaryString(file);

        // Reset input so the same file can be selected again if needed
        e.target.value = null;
    };

    const confirmUpload = async () => {
        setIsUploading(true);
        setUploadErrors([]);

        try {
            await axios.post(route('nstp-director.serial-numbering.bulk-upload'), {
                students: parsedData
            });

            await queryClient.invalidateQueries({
                queryKey: ['nstp-director-serial-numbering.student-list']
            });

            toast.success(`Successfully uploaded ${parsedData.length} records.`);
            setIsAlertOpen(false);
            setParsedData([]);
        } catch (error) {
            // Check if backend returned a 422 with our errors array
            if (error.response?.status === 422 && error.response?.data?.errors) {
                setUploadErrors(error.response.data.errors);
                toast.error('Validation failed. Please fix the conflicts shown.');
            } else {
                toast.error(error.response?.data?.message || 'Error uploading file data');
                setIsAlertOpen(false); // Only close modal if it's a critical server error
            }
            console.error("Upload error:", error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex gap-2 self-end">
                <Button variant="outline" onClick={downloadExcel}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Template
                </Button>

                {/* Hidden File Input */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                />

                <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Students
                </Button>
            </div>

            <Card>
                <CardContent className='pt-4'>
                    <UseQueryTable
                        queryKeyPrefix={`nstp-director-serial-numbering.student-list`}
                        routeName="student-list"
                        method="POST"
                        columns={columns}
                        limit={10}
                        searchPlaceholder="Search by ID, Name or Serial Number..."
                        tableName="Serial Numbering"
                    />
                </CardContent>
            </Card>

            {/* Upload Preview & Error Alert Dialog */}
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent className="max-w-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {uploadErrors.length > 0 ? 'Upload Failed' : 'Confirm Upload Data'}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {uploadErrors.length > 0
                                ? 'We found conflicts in your file. No data was saved. Please review the errors below.'
                                : `You are about to upload ${parsedData.length} student records. Please review the preview below before confirming.`
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    {/* Show Errors if they exist, otherwise show Table Preview */}
                    {uploadErrors.length > 0 ? (
                        <div className="max-h-[50vh] overflow-auto border border-red-200 bg-red-50 rounded-md p-4">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-red-800 mb-3">
                                <AlertCircle className="w-4 h-4" />
                                Fix the following rows in your Excel file:
                            </h4>
                            <ul className="space-y-1 text-sm text-red-700 list-disc pl-5">
                                {uploadErrors.map((err, idx) => (
                                    <li key={idx}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className="max-h-[50vh] overflow-auto border rounded-md">
                            <Table>
                                <TableHeader className="bg-muted sticky top-0 shadow-sm z-10">
                                    <TableRow>
                                        <TableHead>Student ID</TableHead>
                                        <TableHead>Last Name</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Serial Number</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parsedData.slice(0, 50).map((row, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell>{row['Student ID']}</TableCell>
                                            <TableCell>{row['Last Name']}</TableCell>
                                            <TableCell>{row['First Name']}</TableCell>
                                            <TableCell>{row['Serial Number']}</TableCell>
                                        </TableRow>
                                    ))}
                                    {parsedData.length > 50 && (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground italic">
                                                ...and {parsedData.length - 50} more rows
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}

                    <AlertDialogFooter>
                        {uploadErrors.length > 0 ? (
                            <AlertDialogCancel onClick={() => setUploadErrors([])}>
                                Close & Fix File
                            </AlertDialogCancel>
                        ) : (
                            <>
                                <AlertDialogCancel disabled={isUploading}>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                    onClick={(e) => {
                                        e.preventDefault();
                                        confirmUpload();
                                    }}
                                    disabled={isUploading}
                                >
                                    {isUploading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        'Confirm Upload'
                                    )}
                                </AlertDialogAction>
                            </>
                        )}
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

Index.layout = page => <AuthenticatedLayout children={page} title="Serial Numbering" />