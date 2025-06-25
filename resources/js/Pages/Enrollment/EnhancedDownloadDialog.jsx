import React, { useState } from 'react';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';

const EnhancedDownloadDialog = ({ isDownloading, setIsDownloading }) => {
    return (
        <Dialog open={isDownloading} onOpenChange={setIsDownloading}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader className="text-center space-y-4">
                    {/* Icon */}
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                        <div className="relative">
                            <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600">
                                <Download className="h-3 w-3 text-white" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <DialogTitle className="text-xl font-semibold">
                            Preparing Download
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Please wait while we prepare your file...
                        </DialogDescription>
                    </div>
                </DialogHeader>

                {/* Loading Section */}
                <div className="flex flex-col items-center space-y-4 py-4">
                    {/* Loading Indicator */}
                    <div className="flex items-center space-x-2 rounded-lg bg-muted px-4 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <span className="text-sm font-medium text-muted-foreground">
                            Processing...
                        </span>
                    </div>

                    {/* File Info Card */}
                    <div className="w-full rounded-lg border p-4">
                        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                            <FileSpreadsheet className="h-4 w-4 text-green-600" />
                            <span>Excel file will be downloaded automatically</span>
                        </div>
                    </div>

                    {/* Animated Dots */}
                    <div className="flex space-x-1">
                        <div className="h-2 w-2 animate-pulse rounded-full bg-blue-600"></div>
                        <div
                            className="h-2 w-2 animate-pulse rounded-full bg-blue-600"
                            style={{ animationDelay: '0.2s' }}
                        ></div>
                        <div
                            className="h-2 w-2 animate-pulse rounded-full bg-blue-600"
                            style={{ animationDelay: '0.4s' }}
                        ></div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default EnhancedDownloadDialog;
