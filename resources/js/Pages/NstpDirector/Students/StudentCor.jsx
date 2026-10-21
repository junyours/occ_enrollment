
import React, { useEffect, useRef, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/Components/ui/dialog';
import { Button } from '@/Components/ui/button';
import CorGenerator from '@/Pages/COR/CorGenerator';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
    FileText,
    Loader2,
    ZoomIn,
    ZoomOut,
    Maximize,
    RotateCcw,
    AlertCircle,
} from 'lucide-react';

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2;

export default function StudentCor({ open, setOpen, id }) {
    const viewportRef = useRef(null);
    const documentRef = useRef(null);

    const [fitScale, setFitScale] = useState(1);
    const [manualScale, setManualScale] = useState(null);
    const [documentSize, setDocumentSize] = useState({
        width: 794,
        height: 1123,
    });

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['student.cor', id],
        queryFn: async () => {
            const response = await axios.post(
                route('student.cor', {
                    enrolledStudentId: id,
                })
            );

            return response.data;
        },
        enabled: open && !!id,
        staleTime: 10 * 60 * 1000,
        retry: 1,
    });

    // Calculate the document's actual size and fit it to the viewer.
    useEffect(() => {
        if (!open || !data) return;

        const viewport = viewportRef.current;
        const document = documentRef.current;

        if (!viewport || !document) return;

        const measure = () => {
            const width = Math.max(
                794,
                document.scrollWidth,
                document.offsetWidth
            );

            const height = Math.max(
                document.scrollHeight,
                document.offsetHeight
            );

            setDocumentSize((previous) => {
                if (
                    previous.width === width &&
                    previous.height === height
                ) {
                    return previous;
                }

                return { width, height };
            });

            const styles = window.getComputedStyle(viewport);

            const horizontalPadding =
                parseFloat(styles.paddingLeft) +
                parseFloat(styles.paddingRight);

            const availableWidth =
                viewport.clientWidth - horizontalPadding;

            setFitScale(
                Math.min(1, Math.max(
                    MIN_ZOOM,
                    availableWidth / width
                ))
            );
        };

        const frame = requestAnimationFrame(measure);

        const observer = new ResizeObserver(measure);

        observer.observe(viewport);
        observer.observe(document);

        return () => {
            cancelAnimationFrame(frame);
            observer.disconnect();
        };
    }, [open, data]);

    // Reset zoom when switching students.
    useEffect(() => {
        setManualScale(null);
    }, [id]);

    const scale = manualScale ?? fitScale;

    const changeZoom = (amount) => {
        const next = Math.round((scale + amount) * 10) / 10;

        setManualScale(
            Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next))
        );
    };

    const fitToWidth = () => {
        setManualScale(null);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent
                className="
                    !flex
                    h-[94dvh]
                    w-[98vw]
                    !max-w-[1500px]
                    flex-col
                    !gap-0
                    overflow-hidden
                    !p-0
                    sm:h-[92dvh]
                    sm:rounded-xl
                "
            >
                {/* Header */}
                <div className="shrink-0 border-b bg-background">
                    <div className="flex flex-col gap-3 px-4 py-4 pr-12 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                        <DialogHeader className="min-w-0 text-left">
                            <div className="flex items-center gap-3">
                                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <FileText className="size-5" />
                                </div>

                                <div className="min-w-0">
                                    <DialogTitle className="text-base font-semibold">
                                        Certificate of Registration
                                    </DialogTitle>

                                    <DialogDescription className="mt-0.5 text-xs">
                                        Preview student registration document
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        {/* Document controls */}
                        {!isLoading && !isError && data && (
                            <div className="flex shrink-0 items-center gap-2">
                                <div className="flex items-center rounded-lg border bg-background p-1">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        title="Zoom out"
                                        aria-label="Zoom out"
                                        disabled={scale <= MIN_ZOOM}
                                        onClick={() => changeZoom(-0.1)}
                                    >
                                        <ZoomOut className="size-4" />
                                    </Button>

                                    <span className="w-14 text-center text-xs font-medium tabular-nums">
                                        {Math.round(scale * 100)}%
                                    </span>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="size-8"
                                        title="Zoom in"
                                        aria-label="Zoom in"
                                        disabled={scale >= MAX_ZOOM}
                                        onClick={() => changeZoom(0.1)}
                                    >
                                        <ZoomIn className="size-4" />
                                    </Button>
                                </div>

                                <Button
                                    type="button"
                                    variant={manualScale === null ? 'secondary' : 'outline'}
                                    size="sm"
                                    onClick={fitToWidth}
                                    className="gap-2"
                                >
                                    <Maximize className="size-4" />
                                    <span className="hidden sm:inline">
                                        Fit width
                                    </span>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Document viewer */}
                <div
                    ref={viewportRef}
                    className="min-h-0 flex-1 overflow-auto bg-muted/40 p-3 sm:p-6"
                >
                    {isLoading ? (
                        <div className="flex h-full flex-col items-center justify-center gap-3">
                            <Loader2 className="size-8 animate-spin text-primary" />

                            <div className="text-center">
                                <p className="text-sm font-medium">
                                    Loading registration document
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Please wait...
                                </p>
                            </div>
                        </div>
                    ) : isError ? (
                        <div className="flex h-full flex-col items-center justify-center gap-4">
                            <div className="rounded-full bg-destructive/10 p-4">
                                <AlertCircle className="size-7 text-destructive" />
                            </div>

                            <div className="text-center">
                                <p className="text-sm font-semibold">
                                    Unable to load registration
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Something went wrong while fetching the document.
                                </p>
                            </div>

                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => refetch()}
                            >
                                <RotateCcw className="mr-2 size-4" />
                                Try again
                            </Button>
                        </div>
                    ) : data ? (
                        <div
                            className="relative mx-auto"
                            style={{
                                width: documentSize.width * scale,
                                height: documentSize.height * scale,
                            }}
                        >
                            <div
                                ref={documentRef}
                                className="w-max min-w-[794px] origin-top-left bg-white text-black shadow-xl"
                                style={{
                                    transform: `scale(${scale})`,
                                    transformOrigin: 'top left',
                                }}
                            >
                                <CorGenerator data={data} printable={false}/>
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
                            <FileText className="size-10 opacity-40" />
                            <p className="text-sm">
                                No registration document available.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex shrink-0 items-center justify-between gap-3 border-t bg-background px-4 py-2.5 sm:px-6">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <FileText className="size-3.5" />
                        <span>Certificate of Registration</span>
                    </div>

                    <span className="text-xs text-muted-foreground">
                        {manualScale === null ? 'Fit to width' : 'Custom zoom'}
                    </span>
                </div>
            </DialogContent>
        </Dialog>
    );
}
