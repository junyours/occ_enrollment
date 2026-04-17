import React, { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2, User } from "lucide-react";
import axios from "axios";
import { formatName } from "@/Lib/InfoUtils";

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

    const debouncedQuery = useDebounce(query, 300);
    const wrapperRef = useRef(null);

    // ADDED: A ref flag to track when an update came from a selection, not typing
    const skipNextSearch = useRef(false);

    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!debouncedQuery.trim()) {
            setStudents([]);
            setIsOpen(false);
            return;
        }

        // ADDED: If the query changed because we clicked a student, stop here.
        if (skipNextSearch.current) {
            skipNextSearch.current = false; // Reset the flag for the next time they type
            return;
        }

        const fetchStudents = async () => {
            setIsLoading(true);
            setIsOpen(true);

            try {
                const response = await axios.post(route('search-student'), { key: debouncedQuery });
                setStudents(response.data);
            } catch (error) {
                console.error("Failed to fetch students:", error);
                setStudents([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStudents();
    }, [debouncedQuery]);

    const handleSelectStudent = (student) => {
        // ADDED: Tell the useEffect to ignore the upcoming debounced query update
        skipNextSearch.current = true;

        setQuery(formatName(student));
        setIsOpen(false);

        if (onSelect) {
            onSelect(student);
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
                    placeholder="Search students by name or ID..."
                    className="pl-10 pr-10"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                        // Only open if there's text AND we aren't just focusing after a selection
                        if (query.trim().length > 0 && !skipNextSearch.current) {
                            setIsOpen(true);
                        }
                    }}
                />
                {isLoading && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                )}
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md outline-none animate-in fade-in-0 zoom-in-95">
                    {isLoading ? (
                        <div className="p-4 text-sm text-center text-muted-foreground">
                            Searching records...
                        </div>
                    ) : students.length > 0 ? (
                        <ul className="py-1 max-h-60 overflow-auto">
                            {students.map((student) => (
                                <li
                                    key={student.id || student.user_id_no}
                                    onClick={() => handleSelectStudent(student)}
                                    className="flex items-center px-4 py-2 cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
                                >
                                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted mr-3">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium">{formatName(student)}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            ID: {student.user_id_no}
                                        </div>
                                    </div>
                                </li>
                            ))}
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