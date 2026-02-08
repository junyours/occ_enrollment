import React, { useState } from 'react';
import axios from 'axios';
import { FileDown, Loader2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Button } from "@/Components/ui/button";
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';

export function DownloadButton({ selectedTab }) {
    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const [isDownloading, setIsDownloading] = useState(false);
    const [open, setOpen] = useState(false);

    const handleDownload = async () => {
        setIsDownloading(true);

        const routeName = selectedTab === 'enrolled'
            ? 'nstp-director.enrolled-students.download'
            : 'nstp-director.not-enrolled-students.download';

        try {
            const response = await axios.post(route(routeName),
                { schoolYearId: selectedSchoolYearEntry.id },
                { responseType: 'blob' }
            );

            // 1. Extract filename from Content-Disposition header
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'Downloaded_Report.xlsx'; // Fallback name

            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch && fileNameMatch.length === 2) {
                    fileName = fileNameMatch[1];
                }
            }

            // 2. Create the download link
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // 3. Set the dynamic filename from backend
            link.setAttribute('download', fileName);

            document.body.appendChild(link);
            link.click();

            // Cleanup
            link.remove();
            window.URL.revokeObjectURL(url);
            setOpen(false);
        } catch (error) {
            console.error("Download failed", error);
        } finally {
            setIsDownloading(false);
        }
    };

    if (!selectedSchoolYearEntry?.id) return <></>

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="outline">
                    <FileDown className="mr-2 h-4 w-4" />
                    <span>Download</span>
                </Button>
            </AlertDialogTrigger>

            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Download</AlertDialogTitle>
                    <AlertDialogDescription>
                        You are about to generate an Excel report for the school year <strong>{selectedSchoolYearEntry.name}</strong>.
                        This may take a few moments depending on the number of students.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDownloading}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={(e) => {
                            e.preventDefault(); // Prevent modal from closing immediately
                            handleDownload();
                        }}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            "Continue"
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}