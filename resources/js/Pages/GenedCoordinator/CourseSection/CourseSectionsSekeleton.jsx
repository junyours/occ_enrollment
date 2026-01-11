import { PageTitle } from '@/Components/ui/PageTitle';
import React from 'react';

const CourseSectionsSkeleton = () => {
    // Reusable blinking block component
    const BlinkBlock = ({ className }) => (
        <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
    );

    // Helper to generate a skeleton table row
    const SkeletonRow = () => (
        <div className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
            <BlinkBlock className="h-4 w-4" /> {/* Section Letter */}
            <BlinkBlock className="h-4 w-12" /> {/* Student Count */}
            <BlinkBlock className="h-4 w-10" /> {/* Action Link */}
        </div>
    );

    return (
        <div className="bg-gray-50 w-full font-sans">
            {/* DASHBOARD GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-6xl mx-auto">

                {/* FIRST YEAR CARD */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                        <BlinkBlock className="h-6 w-32" /> {/* Year Title */}
                    </div>
                    <div className="p-5">
                        <div className="flex justify-between mb-4">
                            <BlinkBlock className="h-3 w-12" /> {/* Header: Section */}
                            <BlinkBlock className="h-3 w-12" /> {/* Header: Students */}
                            <BlinkBlock className="h-3 w-12" /> {/* Header: Actions */}
                        </div>
                        {[...Array(9)].map((_, i) => <SkeletonRow key={i} />)}
                    </div>
                </div>

                {/* SECOND YEAR CARD */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                        <BlinkBlock className="h-6 w-32" />
                    </div>
                    <div className="p-5">
                        <div className="flex justify-between mb-4">
                            <BlinkBlock className="h-3 w-12" />
                            <BlinkBlock className="h-3 w-12" />
                            <BlinkBlock className="h-3 w-12" />
                        </div>
                        {[...Array(7)].map((_, i) => <SkeletonRow key={i} />)}
                    </div>
                </div>

                {/* THIRD YEAR CARD */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                        <BlinkBlock className="h-6 w-32" />
                    </div>
                    <div className="p-5">
                        <div className="flex justify-between mb-4">
                            <BlinkBlock className="h-3 w-12" />
                            <BlinkBlock className="h-3 w-12" />
                            <BlinkBlock className="h-3 w-12" />
                        </div>
                        {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
                    </div>
                </div>

                {/* FOURTH YEAR CARD */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100">
                        <BlinkBlock className="h-6 w-32" />
                    </div>
                    <div className="p-5">
                        <div className="flex justify-between mb-4">
                            <BlinkBlock className="h-3 w-12" />
                            <BlinkBlock className="h-3 w-12" />
                            <BlinkBlock className="h-3 w-12" />
                        </div>
                        {[...Array(2)].map((_, i) => <SkeletonRow key={i} />)}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CourseSectionsSkeleton;