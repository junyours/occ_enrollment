import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function SubjectSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">
            {/* Array.from creates a dummy array of 6 items to fill the grid while loading */}
            {Array.from({ length: 20 }).map((_, index) => (
                <Card key={index} className="flex flex-col justify-between">
                    <CardHeader>
                        <Skeleton className="h-7 w-24" />
                    </CardHeader>

                    <CardContent className="space-y-4 flex-grow flex flex-col justify-end mt-2">
                        {/* Descriptive Title Skeleton (simulating 2 lines of text) */}
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-full" />
                        </div>

                        {/* Buttons Skeleton */}
                        <div className="flex gap-2 pt-2">
                            {/* View Button */}
                            <Skeleton className="h-10 w-full" />
                            {/* Download Button */}
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}