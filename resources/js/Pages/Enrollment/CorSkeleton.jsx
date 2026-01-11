import React from 'react';

// Utility for a blinking gray block
const BlinkBlock = ({ className }) => (
    <div className={`animate-pulse bg-gray-200 rounded ${className}`}></div>
);

const CORSkeleton = () => {
    return (
        <div className="w-[800px] mx-auto p-8 bg-white border border-gray-200 shadow-sm">

            {/* HEADER SKELETON */}
            <div className="flex flex-col items-center mb-10">
                <div className="flex items-center gap-4">
                    <BlinkBlock className="w-16 h-16 rounded-full" />
                    <div className="flex flex-col items-center gap-2">
                        <BlinkBlock className="h-6 w-64" />
                        <BlinkBlock className="h-4 w-40" />
                        <BlinkBlock className="h-8 w-80 mt-2" />
                    </div>
                </div>
            </div>

            {/* INFO GRID SKELETON */}
            <div className="grid grid-cols-3 gap-6 mb-8 border-b pb-6">
                {[...Array(6)].map((_, i) => (
                    <div key={i} className="flex flex-col gap-1">
                        <BlinkBlock className="h-3 w-20" /> {/* Label */}
                        <BlinkBlock className="h-5 w-full" /> {/* Value */}
                    </div>
                ))}
            </div>

            {/* TABLE SKELETON */}
            <div className="space-y-3 mb-10">
                <BlinkBlock className="h-8 w-full" /> {/* Table Header */}
                {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex gap-2">
                        <BlinkBlock className="h-6 w-1/4" />
                        <BlinkBlock className="h-6 w-1/2" />
                        <BlinkBlock className="h-6 w-1/4" />
                    </div>
                ))}
            </div>

            {/* ASSESSMENT SKELETON */}
            <div className="grid grid-cols-2 gap-12">
                <div className="space-y-2">
                    <BlinkBlock className="h-5 w-32 mb-4" />
                    <BlinkBlock className="h-4 w-full" />
                    <BlinkBlock className="h-4 w-full" />
                    <BlinkBlock className="h-6 w-3/4 mt-4" />
                </div>
                <div className="flex flex-col justify-end gap-2">
                    <BlinkBlock className="h-3 w-full" />
                    <BlinkBlock className="h-3 w-full" />
                    <BlinkBlock className="h-3 w-2/3" />
                </div>
            </div>

            {/* SIGNATURES SKELETON */}
            <div className="grid grid-cols-2 gap-20 mt-16">
                <div className="flex flex-col items-center gap-2">
                    <BlinkBlock className="h-5 w-48" />
                    <BlinkBlock className="h-3 w-32" />
                </div>
                <div className="flex flex-col items-center gap-2">
                    <BlinkBlock className="h-5 w-48" />
                    <BlinkBlock className="h-3 w-32" />
                </div>
            </div>

        </div>
    );
};

export default CORSkeleton;