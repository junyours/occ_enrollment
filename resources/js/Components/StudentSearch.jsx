import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/Components/ui/input";
import { Search, Loader2, User, XCircle, AlertCircle } from "lucide-react";
import axios from "axios";
import { formatName } from "@/Lib/InfoUtils";
import { cn } from "@/Lib/Utils";

// Debounce Hook
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

export default function StudentSearch({ onSelect,className, props }) {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);

    const wrapperRef = useRef(null);

    const debouncedQuery = useDebounce(query, 300);

    // Outside click
    useEffect(() => {
        function handleClickOutside(event) {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target)
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);

        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // TanStack Query
    const {
        data: students = [],
        isLoading,
        error,
    } = useQuery({
        queryKey: ["students-search", debouncedQuery],

        queryFn: async ({ signal }) => {
            const response = await axios.post(
                route("search-student"),
                { key: debouncedQuery },
                { signal }
            );

            return response.data;
        },

        enabled: debouncedQuery.trim().length > 0,

        staleTime: 1000 * 60 * 5, // 5 mins cache
    });

    const handleSelectStudent = (student) => {
        setQuery(formatName(student));
        setIsOpen(false);
        setActiveIndex(-1);

        onSelect?.(student);
    };

    const handleClear = () => {
        setQuery("");
        setIsOpen(false);
        setActiveIndex(-1);

        onSelect?.(null);
    };

    const handleKeyDown = (e) => {
        if (!isOpen || students.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();

            setActiveIndex((prev) =>
                prev < students.length - 1 ? prev + 1 : prev
            );
        } else if (e.key === "ArrowUp") {
            e.preventDefault();

            setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter" && activeIndex >= 0) {
            e.preventDefault();

            handleSelectStudent(students[activeIndex]);
        } else if (e.key === "Escape") {
            setIsOpen(false);
        }
    };

    return (
        <div ref={wrapperRef} className={cn("relative w-full", className)} {...props}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                </div>

                <Input
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls="student-search-listbox"
                    aria-activedescendant={
                        activeIndex >= 0
                            ? `student-${activeIndex}`
                            : undefined
                    }
                    placeholder="Search students by name or ID..."
                    className="pl-10 pr-10"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);

                        if (e.target.value.trim()) {
                            setIsOpen(true);
                        } else {
                            setIsOpen(false);
                            onSelect?.(null);
                        }
                    }}
                    onFocus={() => {
                        if (query.trim()) {
                            setIsOpen(true);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                />

                {isLoading && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}

                {query && !isLoading && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute inset-y-0 right-0 flex items-center pr-3"
                    >
                        <XCircle className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md overflow-hidden">
                    {isLoading ? (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                            Searching records...
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center gap-2 p-4 text-sm text-destructive">
                            <AlertCircle className="h-4 w-4" />
                            Failed to load results.
                        </div>
                    ) : students.length > 0 ? (
                        <ul className="py-1 max-h-60 overflow-auto">
                            {students.map((student, index) => {
                                const isSelected = activeIndex === index;

                                return (
                                    <li
                                        key={student.id || student.user_id_no}
                                        id={`student-${index}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() =>
                                            handleSelectStudent(student)
                                        }
                                        onMouseEnter={() =>
                                            setActiveIndex(index)
                                        }
                                        className={`flex items-center px-4 py-2 cursor-pointer transition-colors ${isSelected
                                                ? "bg-accent text-accent-foreground"
                                                : "hover:bg-accent/50"
                                            }`}
                                    >
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted mr-3 shrink-0">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                        </div>

                                        <div className="truncate">
                                            <div className="text-sm font-medium truncate">
                                                {formatName(student)}
                                            </div>

                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                ID: {student.user_id_no}
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                            No students found.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}