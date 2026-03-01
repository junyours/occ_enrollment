import React from 'react'
import { Button } from '@/Components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { router } from '@inertiajs/react';

export default function PaginationPages({ data = {} }) {

    const { prev_page_url, next_page_url, from, to, total, links, current_page, last_page } = data || {};

    const handlePageChange = (url) => {
        if (url) {
            router.get(url, {}, {
                preserveState: true,
                replace: true,
            });
        }
    };

    return (
        <>
            {(data?.data?.length > 0) && (
                <div className="flex items-center justify-between px-4 w-full">
                    {/* Results Summary */}
                    <div className="text-sm text-muted-foreground">
                        Showing <span className="font-semibold text-foreground">{from}</span> to{' '}
                        <span className="font-semibold text-foreground">{to}</span> of{' '}
                        <span className="font-semibold text-foreground">{total}</span> results
                    </div>

                    {/* Navigation Controls */}
                    <nav className="flex items-center space-x-2" aria-label="Pagination">
                        {/* Previous Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-24 pl-2 flex justify-between pr-4"
                            onClick={() => handlePageChange(prev_page_url)}
                            disabled={!prev_page_url}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Previous</span>
                        </Button>

                        {/* Page Numbers - Hidden on mobile if there are many */}
                        <div className="hidden md:flex items-center gap-1">
                            {links?.slice(1, -1).map((link, index) => (
                                <Button
                                    key={index}
                                    variant={link.active ? "default" : "ghost"}
                                    size="sm"
                                    className={`h-9 w-9 p-0 transition-colors ${link.active ? "shadow-sm" : "hover:bg-accent"
                                        }`}
                                    onClick={() => handlePageChange(link.url)}
                                    disabled={!link.url}
                                >
                                    <span dangerouslySetInnerHTML={{ __html: link.label }} />
                                </Button>
                            ))}
                        </div>

                        {/* Mobile Page Indicator (Optional) */}
                        <div className="text-sm font-medium md:hidden">
                            Page {current_page} of {last_page}
                        </div>

                        {/* Next Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-24 px-2 flex justify-between"
                            onClick={() => handlePageChange(next_page_url)}
                            disabled={!next_page_url}
                        >
                            <span className="hidden sm:inline">Next</span>
                            <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </nav>
                </div>
            )}
        </>
    )
}
