import React from 'react'

const CourseSectionsSkeleton = () => {
    // Reusable skeleton block
    const BlinkBlock = ({ className }) => (
        <div
            className={`animate-pulse rounded-md bg-muted ${className}`}
        />
    )

    // Skeleton row
    const SkeletonRow = () => (
        <div className="flex items-center gap-4 py-2 border-b last:border-0 w-full">
            {/* Section */}
            <BlinkBlock className="h-4 w-1/3" />

            {/* Student Count */}
            <BlinkBlock className="h-4 w-1/4" />

            {/* Action - ml-auto pushes this to the far right */}
            <BlinkBlock className="h-4 w-16 ml-auto" />
        </div>
    )

    return (
        <div className="w-full font-sans">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">

                {/* FIRST YEAR */}
                <div className="rounded-2xl border shadow-sm overflow-hidden">
                    <div className="p-5 border-b">
                        <BlinkBlock className="h-6 w-32" />
                    </div>
                    <div className="p-5">
                        <div className="flex justify-between mb-2">
                            <BlinkBlock className="h-3 w-12" />
                            <BlinkBlock className="h-3 w-16" />
                            <BlinkBlock className="h-3 w-16 self-end" />
                        </div>
                        {[...Array(9)].map((_, i) => (
                            <SkeletonRow key={i} />
                        ))}
                    </div>
                </div>

                {/* SECOND YEAR */}
                <div className="rounded-2xl border shadow-sm overflow-hidden">
                    <div className="p-5 border-b">
                        <BlinkBlock className="h-6 w-32" />
                    </div>
                    <div className="p-5">
                        <div className="flex justify-between mb-2">
                            <BlinkBlock className="h-3 w-12" />
                            <BlinkBlock className="h-3 w-16" />
                            <BlinkBlock className="h-3 w-16 self-end" />
                        </div>
                        {[...Array(7)].map((_, i) => (
                            <SkeletonRow key={i} />
                        ))}
                    </div>
                </div>

                {/* THIRD YEAR */}
                <div className="rounded-2xl border shadow-sm overflow-hidden">
                    <div className="p-5 border-b">
                        <BlinkBlock className="h-6 w-32" />
                    </div>
                    <div className="p-5">
                        <div className="flex justify-between mb-2">
                            <BlinkBlock className="h-3 w-12" />
                            <BlinkBlock className="h-3 w-16" />
                            <BlinkBlock className="h-3 w-16 self-end" />
                        </div>
                        {[...Array(4)].map((_, i) => (
                            <SkeletonRow key={i} />
                        ))}
                    </div>
                </div>

                {/* FOURTH YEAR */}
                <div className="rounded-2xl border shadow-sm overflow-hidden">
                    <div className="p-5 border-b">
                        <BlinkBlock className="h-6 w-32" />
                    </div>
                    <div className="p-5">
                        <div className="flex justify-between mb-2">
                            <BlinkBlock className="h-3 w-12" />
                            <BlinkBlock className="h-3 w-16" />
                            <BlinkBlock className="h-3 w-16 self-end" />
                        </div>
                        {[...Array(2)].map((_, i) => (
                            <SkeletonRow key={i} />
                        ))}
                    </div>
                </div>

            </div>
        </div>
    )
}

export default CourseSectionsSkeleton
