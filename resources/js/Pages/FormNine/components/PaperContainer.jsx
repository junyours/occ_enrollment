import React, { Children, useEffect, useState } from 'react'

export default function PaperContainer({ children }) {
    const [container, setContainer] = useState(null);
    const [zoom, setZoom] = useState(0.8);

    // --- Zoom Controls ---
    useEffect(() => {
        if (!container) return;

        const handleWheel = (e) => {
            if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                setZoom(prev => {
                    const zoomChange = e.deltaY < 0 ? 0.05 : -0.05;
                    return Math.min(Math.max(prev + zoomChange, 0.5), 2.5);
                });
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [container]);

    return (
        <div
            ref={setContainer}
            className="flex-1 overflow-auto p-4 flex justify-center"
        >
            <div
                className="origin-top transition-transform duration-75 ease-out"
                style={{ transform: `scale(${zoom})` }}
            >
                {children}
            </div>
            {/* Floating Zoom Controls & Instructions */}
            <div className="absolute bottom-6 right-6 flex flex-col items-end gap-2 print:hidden">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded shadow-sm border border-border pointer-events-none">
                    Ctrl + Scroll to zoom
                </div>
                <div className="flex items-center bg-card shadow-lg rounded-lg border border-border overflow-hidden">
                    <button
                        onClick={() => setZoom(prev => Math.max(prev - 0.1, 0.5))}
                        className="p-2.5 hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
                        title="Zoom Out"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                        </svg>
                    </button>
                    <span className="w-14 text-center text-sm font-medium text-foreground border-x border-border py-2.5 ">
                        {Math.round(zoom * 100)}%
                    </span>
                    <button
                        onClick={() => setZoom(prev => Math.min(prev + 0.1, 2.5))}
                        className="p-2.5 hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors"
                        title="Zoom In"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    )
}
