import React, { useState } from 'react';
import TimeTable from '@/Pages/ScheduleFormats/ModernTimtable/TimeTable';
import html2canvas from 'html2canvas';
import { Button } from '@/Components/ui/button';
import { ImageDown } from 'lucide-react';
import { Card, CardContent } from '@/Components/ui/card';

export default function DownloadableTimetable({ classes }) {
    const downloadImage = async () => {
        try {
            await new Promise(resolve => setTimeout(resolve, 100));

            const filename = `classes.png`;
            const element = document.getElementById(`classes`);

            if (element) {
                const style = document.createElement("style");
                document.head.appendChild(style);
                style.sheet?.insertRule('body > div:last-child img { display: inline-block; }');
                style.sheet?.insertRule('td div > svg { display: none !important; }');

                const canvas = await html2canvas(element, { scale: 5 });
                const imageUrl = canvas.toDataURL("image/png");

                const link = document.createElement("a");
                link.href = imageUrl;
                link.download = filename;
                link.click();

                style.remove();
            }
        } catch (error) {
            console.error('Error downloading image:', error);
        }
    };

    const [scale, setScale] = useState(1);

    const zoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2));
    const zoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.4));

    return (
        <>
            <div className="sm:hidden relative border border-border rounded-lg overflow-hidden bg-background max-w-[calc(100vw-2rem)] min-w-[calc(100vw-2rem)]">
                {/* Floating Toolbar */}
                <div className="absolute top-0 left-0 z-20 flex items-center shadow-md bg-background rounded-br-lg border-r border-b border-border">
                    <Button
                        variant="ghost"
                        className="rounded-none border-r border-border px-3"
                        onClick={zoomOut}
                    >
                        -
                    </Button>
                    <span className="px-3 text-sm font-medium w-[60px] text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <Button
                        variant="ghost"
                        className="rounded-none border-l border-border px-3"
                        onClick={zoomIn}
                    >
                        +
                    </Button>
                    <Button
                        className="rounded-none rounded-br-lg"
                        onClick={downloadImage}
                    >
                        Download
                        <ImageDown className="ml-2 h-4 w-4" />
                    </Button>
                </div>

                {/* Scrollable Area */}
                <section className="pt-14 max-h-[calc(100vh-19rem)] min-h-[calc(100vh-19rem)] overflow-auto">
                    <div
                        style={{
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            transition: 'transform 0.2s ease-in-out'
                        }}
                        className="min-w-max p-4"
                    >
                        <Card id="classes" className="w-[1200px] pt-6 border-border">
                            <CardContent>
                                <TimeTable data={classes} />
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </div>

            {/* DESKTOP: Full-width card, no scrolling section */}
            <div className="hidden sm:block">
                <div className="relative">
                    {/* Toolbar */}
                    <div className="flex items-center shadow-md bg-background rounded-t-lg border-b border-border p-2">
                        <Button
                            variant="ghost"
                            className="rounded-none border-r border-border px-3"
                            onClick={zoomOut}
                        >
                            -
                        </Button>
                        <span className="px-3 text-sm font-medium w-[60px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <Button
                            variant="ghost"
                            className="rounded-none border-l border-border px-3"
                            onClick={zoomIn}
                        >
                            +
                        </Button>
                        <Button
                            className="ml-auto"
                            onClick={downloadImage}
                        >
                            Download
                            <ImageDown className="ml-2 h-4 w-4" />
                        </Button>
                    </div>

                    {/* Full Timetable */}
                    <div
                        style={{
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            transition: 'transform 0.2s ease-in-out'
                        }}
                        className="pt-4 overflow-auto"
                    >
                        <Card id="classes" className="w-auto pt-6 border-border">
                            <CardContent>
                                <TimeTable data={classes} />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}