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
                <div className="flex flex-col sm:flex-row items-center justify-between px-2 sm:px-4 w-full gap-4 sm:gap-0 mt-4">
                    {/* Results Summary */}
                    <div className="text-sm text-muted-foreground text-center sm:text-left">
                        Showing <span className="font-semibold text-foreground">{from}</span> to{' '}
                        <span className="font-semibold text-foreground">{to}</span> of{' '}
                        <span className="font-semibold text-foreground">{total}</span> results
                    </div>

                    {/* Navigation Controls */}
                    <nav className="flex items-center justify-center space-x-2 w-full sm:w-auto" aria-label="Pagination">
                        {/* Previous Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-10 sm:w-20 px-0 sm:pl-2 flex justify-center sm:justify-between sm:pr-4"
                            onClick={() => handlePageChange(prev_page_url)}
                            disabled={!prev_page_url}
                        >
                            <ChevronLeft className="h-4 w-4 sm:mr-1" />
                            <span className="hidden sm:inline mr-2">Prev</span>
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

                        {/* Mobile Page Indicator */}
                        <div className="text-sm font-medium md:hidden px-2">
                            Page {current_page} of {last_page}
                        </div>

                        {/* Next Button */}
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-9 w-10 sm:w-20 px-0 flex justify-center sm:justify-between sm:px-2"
                            onClick={() => handlePageChange(next_page_url)}
                            disabled={!next_page_url}
                        >
                            <span className="hidden sm:inline ml-2">Next</span>
                            <ChevronRight className="h-4 w-4 sm:ml-1" />
                        </Button>
                    </nav>
                </div>
            )}
        </>
    )
}