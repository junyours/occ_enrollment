// components/Pagination.jsx
import React from 'react';
import { Button } from '@/Components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, totalPages, totalItems, setPage, customFrom, customTo, data }) {

    // Extract the Laravel pagination attributes safely
    const { from: dataFrom, to: dataTo, total, links, last_page } = data || {};

    // Use custom indices if provided, otherwise fallback to Laravel's
    const from = customFrom !== undefined ? customFrom : dataFrom;
    const to = customTo !== undefined ? customTo : dataTo;
    const displayTotal = total !== undefined ? total : totalItems;

    if (displayTotal === 0 || !links) return null;

    // Laravel's 'links' array includes "Previous" at index 0 and "Next" at the very end.
    // We slice those out so we can keep using your custom lucide-react icon buttons for Prev/Next.
    const middleLinks = links.slice(1, -1);

    // Helper function to extract the page number (e.g., "53") from Laravel's URL string ("...?page=53")
    const handleLinkClick = (url) => {
        if (!url) return;

        // Regex extracts the digits coming immediately after "page="
        const match = url.match(/[?&]page=(\d+)/);
        if (match) {
            setPage(Number(match[1]));
        }
    };

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between px-2 sm:px-4 w-full gap-4 sm:gap-0 mt-4">
            {/* Results Summary */}
            <div className="text-sm text-muted-foreground text-center sm:text-left">
                Showing <span className="font-semibold text-foreground">{from}</span> to{' '}
                <span className="font-semibold text-foreground">{to}</span> of{' '}
                <span className="font-semibold text-foreground">{displayTotal}</span> results
            </div>

            <nav className="flex items-center justify-center space-x-2 w-full sm:w-auto" aria-label="Pagination">

                {/* Previous Button (Maintained with Custom Icons) */}
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-10 sm:w-20 px-0 sm:pl-2 flex justify-center sm:justify-between sm:pr-4"
                    onClick={() => setPage((old) => Math.max(old - 1, 1))}
                    disabled={page === 1}
                >
                    <ChevronLeft className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline mr-2">Prev</span>
                </Button>

                {/* Map over Laravel's pre-calculated page numbers and ellipses */}
                <div className="hidden md:flex items-center gap-1">
                    {middleLinks.map((link, index) => (
                        <Button
                            key={index}
                            variant={link.active ? "default" : "ghost"}
                            size="sm"
                            className={`h-9 w-9 p-0 transition-colors ${link.active ? "shadow-sm" : "hover:bg-accent"}`}
                            onClick={() => handleLinkClick(link.url)}
                            disabled={!link.url}
                        >
                            {/* dangerouslySetInnerHTML handles Laravel's native "..." HTML entities safely */}
                            <span dangerouslySetInnerHTML={{ __html: link.label }} />
                        </Button>
                    ))}
                </div>

                {/* Mobile Page Indicator */}
                <div className="text-sm font-medium md:hidden px-2">
                    Page {page} of {last_page || totalPages}
                </div>

                {/* Next Button (Maintained with Custom Icons) */}
                <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-10 sm:w-20 px-0 flex justify-center sm:justify-between sm:px-2"
                    onClick={() => setPage((old) => (old < totalPages ? old + 1 : old))}
                    disabled={page === (last_page || totalPages) || displayTotal === 0}
                >
                    <span className="hidden sm:inline ml-2">Next</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                </Button>
            </nav>
        </div>
    );
}