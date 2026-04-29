import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/Components/ui/input";
import { Search, Loader2, User, XCircle, AlertCircle } from "lucide-react";
import axios from "axios";
import { formatName } from "@/Lib/InfoUtils";

// Custom hook for debouncing input values
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(timer);
        };
    }, [value, delay]);

    return debouncedValue;
}

export default function StudentSearch({ onSelect }) {
    const [query, setQuery] = useState("");
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [error, setError] = useState(null);
    const [activeIndex, setActiveIndex] = useState(-1); // Track keyboard navigation

    const debouncedQuery = useDebounce(query, 300);
    const wrapperRef = useRef(null);
    const skipNextSearch = useRef(false);

    // Handle outside clicks to close the dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Handle API fetching with cancellation
    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setStudents([]);
            setIsOpen(false);
            setError(null);
            return;
        }

        if (skipNextSearch.current) {
            skipNextSearch.current = false;
            return;
        }

        // ENHANCEMENT: AbortController prevents race conditions from rapid typing
        const controller = new AbortController();

        const fetchStudents = async () => {
            setIsLoading(true);
            setIsOpen(true);
            setError(null);

            try {
                const response = await axios.post(
                    route('search-student'),
                    { key: debouncedQuery },
                    { signal: controller.signal }
                );
                setStudents(response.data);
                setActiveIndex(-1); // Reset keyboard focus on new results
            } catch (err) {
                if (axios.isCancel(err)) {
                    // Request was cancelled, no need to handle as an error
                    return;
                }
                console.error("Failed to fetch students:", err);
                setError("Failed to load results. Please try again.");
                setStudents([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStudents();

        // Cleanup function cancels the request if the component unmounts or query changes
        return () => controller.abort();
    }, [debouncedQuery]);

    const handleSelectStudent = (student) => {
        skipNextSearch.current = true;
        setQuery(formatName(student));
        setIsOpen(false);
        setStudents([student]);
        setActiveIndex(-1);

        if (onSelect) {
            onSelect(student);
        }
    };

    const handleClear = () => {
        setQuery("");
        setStudents([]);
        setIsOpen(false);
        setError(null);
        if (onSelect) onSelect(null);
    };

    // ENHANCEMENT: Keyboard navigation handles
    const handleKeyDown = (e) => {
        if (!isOpen || students.length === 0) return;

        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((prev) => (prev < students.length - 1 ? prev + 1 : prev));
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
        <div ref={wrapperRef} className="relative w-full max-w-md">
            <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls="student-search-listbox"
                    aria-activedescendant={activeIndex >= 0 ? `student-${activeIndex}` : undefined}
                    placeholder="Search students by name or ID..."
                    className="pl-10 pr-10 focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background focus-visible:ring-1  transition-shadow duration-200 ease-in-out"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        if (e.target.value.trim() === "") {
                            setIsOpen(false);
                            if (onSelect) onSelect(null);
                        }
                    }}
                    onFocus={() => {
                        if (query.trim().length > 0) {
                            skipNextSearch.current = false;
                            setIsOpen(true);
                        }
                    }}
                    onKeyDown={handleKeyDown}
                />

                {isLoading && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}

                {query && !isLoading && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
                        aria-label="Clear search"
                    >
                        <XCircle className="h-4 w-4" />
                    </button>
                )}
            </div>

            {isOpen && (
                <div
                    id="student-search-listbox"
                    role="listbox"
                    className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md outline-none animate-in fade-in-0 zoom-in-95 overflow-hidden"
                >
                    {isLoading ? (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                            Searching records...
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center p-4 text-sm text-destructive gap-2">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    ) : students.length > 0 ? (
                        <ul className="py-1 max-h-60 overflow-auto">
                            {students.map((student, index) => {
                                const isSelected = index === activeIndex;
                                return (
                                    <li
                                        key={student.id || student.user_id_no}
                                        id={`student-${index}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => handleSelectStudent(student)}
                                        onMouseEnter={() => setActiveIndex(index)}
                                        className={`flex items-center px-4 py-2 cursor-pointer transition-colors ${isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                                            }`}
                                    >
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted mr-3 shrink-0">
                                            <User className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="truncate">
                                            <div className="text-sm font-medium truncate">{formatName(student)}</div>
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