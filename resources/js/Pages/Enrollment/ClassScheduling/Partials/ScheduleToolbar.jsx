import React from 'react'
import { Card, CardContent } from "@/Components/ui/card"
import { FileDown, ImageDown, Loader2 } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { Label } from '@/Components/ui/label';
import { Switch } from '@/Components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { usePage } from '@inertiajs/react';
import html2canvas from 'html2canvas';

function ScheduleToolbar({ scheduleType, isDownloading, colorful, setColorful, setScheduleType, setIsDownloading }) {
    const { courseName, yearlevel, section } = usePage().props;

    const downloadImage = async () => {
        setIsDownloading(true);

        try {
            // Small delay to let the UI update and show the spinner
            await new Promise(resolve => setTimeout(resolve, 100));

            const filename = `${courseName} - ${yearlevel}${section} classes.png`;
            const element = document.getElementById(`section-schedule`);

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
            setIsDownloading(false);
        }
    };

    return (
        <Card>
            <CardContent className="p-2">
                <div className="flex gap-2 w-min">
                    <Tabs className="w-max" value={scheduleType} onValueChange={(value) => setScheduleType(value)} defaultValue="account" >
                        <TabsList className="grid max-w-max grid-cols-2">
                            <TabsTrigger className="w-28" value="tabular">Tabular</TabsTrigger>
                            <TabsTrigger className="w-28" value="timetable">Timetable</TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Button className="bg-green-600 hover:bg-green-500" variant="">
                        <FileDown />
                        Excel
                    </Button>
                    <Button
                        className="bg-blue-700 hover:bg-blue-600"
                        onClick={downloadImage}
                        disabled={isDownloading}
                    >
                        {isDownloading ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <ImageDown />
                        )}
                        Image
                    </Button>

                    <div className="flex items-center space-x-2">
                        <Switch
                            checked={colorful}
                            onCheckedChange={(value) => setColorful(value)}
                            id="color"
                        />
                        <Label htmlFor="airplane-mode">Color</Label>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}

export default ScheduleToolbar
