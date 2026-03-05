// components/ProjectCard.jsx
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/Components/ui/card";
import { Button } from "@/Components/ui/button";

export function ProjectCard({
    imageUrl,
    title,
    description,
    primaryLabel,
    secondaryLabel,
    onPrimary,
    onSecondary
}) {
    // Determine which buttons exist
    const buttons = [];
    if (onPrimary && primaryLabel) buttons.push({ label: primaryLabel, onClick: onPrimary, variant: "" });
    if (onSecondary && secondaryLabel) buttons.push({ label: secondaryLabel, onClick: onSecondary, variant: "outline" });

    return (
        <Card className="w-[300px]">
            <CardHeader className="px-4">
                <Card className="overflow-hidden">
                    <CardContent className="h-40 p-0 bg-gray-200 flex items-center justify-center">
                        <div
                            className="w-full h-full bg-gray-200 flex items-center justify-center rounded-lg"
                            style={{
                                backgroundImage: imageUrl ? `url(${imageUrl})` : undefined,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center'
                            }}
                        >
                            {!imageUrl && <span className="text-gray-500 text-sm">Image Placeholder</span>}
                        </div>
                    </CardContent>
                </Card>
            </CardHeader>

            <CardContent className="p-4">
                <CardTitle className="text-lg font-semibold mb-1">{title}</CardTitle>
                <CardDescription className="text-sm text-gray-600">{description}</CardDescription>
            </CardContent>

            {buttons.length > 0 && (
                <CardFooter className={`flex ${buttons.length === 1 ? 'justify-center' : 'justify-between'} p-4 pt-0`}>
                    {buttons.map((btn, idx) => (
                        <Button
                            key={idx}
                            variant={btn.variant}
                            onClick={btn.onClick}
                            className={buttons.length === 1 ? 'w-full' : undefined}
                        >
                            {btn.label}
                        </Button>
                    ))}
                </CardFooter>
            )}
        </Card>
    );
}