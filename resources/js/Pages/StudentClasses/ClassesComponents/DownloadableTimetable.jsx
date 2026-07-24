import React, { useState } from 'react';
import TimeTable from '@/Pages/ScheduleFormats/ModernTimtable/TimeTable';
import html2canvas from 'html2canvas';
import { Button } from '@/Components/ui/button';
import { ImageDown } from 'lucide-react';
import { Card, CardContent } from '@/Components/ui/card';

export default function DownloadableTimetable({ classes, schoolYear }) {
    // 1. Add a state to track downloading status
    const [isDownloading, setIsDownloading] = useState(false);
    const [scale, setScale] = useState(1);

    const downloadImage = async (elementId) => {
        try {
            // 2. Set downloading to true to trigger the UI update (hiding indicators)
            setIsDownloading(true);

            // 3. Wait a moment for React to re-render the DOM without the indicators
            await new Promise(resolve => setTimeout(resolve, 150));

            const filename = `${schoolYear}.png`;
            const element = document.getElementById(elementId);

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
        } finally {
            // 4. Always turn indicators back on after download (even if it fails)
            setIsDownloading(false);
        }
    };

    const zoomIn = () => setScale((prev) => Math.min(prev + 0.1, 2));
    const zoomOut = () => setScale((prev) => Math.max(prev - 0.1, 0.4));

    return (
        <>
            {/* MOBILE VIEW */}
            <div className="sm:hidden relative border border-border rounded-lg overflow-hidden bg-background max-w-[calc(100vw-2rem)] min-w-[calc(100vw-2rem)]">
                <div className="absolute top-0 left-0 z-20 flex items-center shadow-md bg-background rounded-br-lg border-r border-b border-border">
                    <Button variant="ghost" className="rounded-none border-r border-border px-3" onClick={zoomOut}>
                        -
                    </Button>
                    <span className="px-3 text-sm font-medium w-[60px] text-center">
                        {Math.round(scale * 100)}%
                    </span>
                    <Button variant="ghost" className="rounded-none border-l border-border px-3" onClick={zoomIn}>
                        +
                    </Button>
                    <Button
                        className="rounded-none rounded-br-lg"
                        onClick={() => downloadImage('classes-mobile')}
                        disabled={isDownloading} // Optional: prevent multiple clicks
                    >
                        {isDownloading ? "Downloading..." : "Download"}
                        {!isDownloading && <ImageDown className="ml-2 h-4 w-4" />}
                    </Button>
                </div>

                <section className="pt-14 max-h-[calc(100vh-19rem)] min-h-[calc(100vh-19rem)] overflow-auto">
                    <div
                        style={{
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            transition: 'transform 0.2s ease-in-out'
                        }}
                        className="min-w-max p-4"
                    >
                        <Card id="classes-mobile" className="w-[1200px] pt-6 border-border">
                            <CardContent>
                                <TimeTable
                                    data={classes}
                                    showCurrentTime={!isDownloading} // 5. Toggle prop
                                    showCurrentDay={!isDownloading}  // 5. Toggle prop
                                />
                            </CardContent>
                        </Card>
                    </div>
                </section>
            </div>

            {/* DESKTOP VIEW */}
            <div className="hidden sm:block">
                <div className="relative">
                    <div className="flex items-center shadow-md bg-background rounded-t-lg border-b border-border p-2">
                        <Button variant="ghost" className="rounded-none border-r border-border px-3" onClick={zoomOut}>
                            -
                        </Button>
                        <span className="px-3 text-sm font-medium w-[60px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <Button variant="ghost" className="rounded-none border-l border-border px-3" onClick={zoomIn}>
                            +
                        </Button>
                        <Button
                            className="ml-auto"
                            onClick={() => downloadImage('classes-desktop')}
                            disabled={isDownloading} // Optional: prevent multiple clicks
                        >
                            {isDownloading ? "Downloading..." : "Download"}
                            {!isDownloading && <ImageDown className="ml-2 h-4 w-4" />}
                        </Button>
                    </div>

                    <div
                        style={{
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                            transition: 'transform 0.2s ease-in-out'
                        }}
                        className="pt-4 overflow-auto"
                    >
                        <Card id="classes-desktop" className="w-auto pt-6 border-border">
                            <CardContent>
                                <TimeTable
                                    data={classes}
                                    showCurrentTime={!isDownloading} // 6. Toggle prop
                                    showCurrentDay={!isDownloading}  // 6. Toggle prop
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </>
    );
}