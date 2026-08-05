import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/Components/ui/input";
import { Search, Loader2, User, XCircle, AlertCircle, RotateCcw } from "lucide-react"; 
import axios from "axios";
import { formatName } from "@/Lib/InfoUtils";
import { cn } from "@/Lib/Utils";
import { MdHistory } from "react-icons/md";

// ============================================================================
// Helpers
// ============================================================================

function getStudentKey(student) {
    // Prefer a stable numeric/string id, fall back to user_id_no.
    // Returns null (not undefined) when neither exists, so identity checks
    // never accidentally match two different "keyless" students.
    if (student == null) return null;
    if (student.id !== undefined && student.id !== null) return `id:${student.id}`;
    if (student.user_id_no !== undefined && student.user_id_no !== null) return `uid:${student.user_id_no}`;
    return null;
}

function studentMatches(student, query) {
    const q = query.toLowerCase();
    const name = formatName(student).toLowerCase();
    const id = (student.user_id_no || "").toLowerCase();
    return name.includes(q) || id.includes(q);
}

/**
 * Single source of truth for "what shows in the dropdown / what's
 * navigable by keyboard". Used by both the render layer and the
 * keyboard handler so they can never drift out of sync.
 */
function useCombinedResults({ history, apiStudents, query }) {
    return useMemo(() => {
        const trimmedQuery = query.trim();
        const historyKeys = new Set(history.map(getStudentKey).filter(Boolean));

        const matchingHistory = trimmedQuery
            ? history.filter((s) => studentMatches(s, trimmedQuery))
            : history;

        const uniqueApiStudents = apiStudents.filter((s) => {
            const key = getStudentKey(s);
            return key === null || !historyKeys.has(key);
        });

        return {
            matchingHistory,
            uniqueApiStudents,
            all: [...matchingHistory, ...uniqueApiStudents],
        };
    }, [history, apiStudents, query]);
}

// ============================================================================
// Hooks
// ============================================================================

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

function useClickOutside(ref, callback) {
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                callback();
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [ref, callback]);
}

function useSearchHistory() {
    const STORAGE_KEY = "student-search-history";
    const EXPIRATION_DAYS = 2;

    const getHistory = useCallback(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (!stored) return [];

            const data = JSON.parse(stored);
            const now = Date.now();

            // Filter out expired entries
            const valid = data.filter(
                (item) => item.timestamp && now - item.timestamp < EXPIRATION_DAYS * 24 * 60 * 60 * 1000
            );

            if (valid.length !== data.length) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
            }

            return valid;
        } catch (error) {
            console.error("Error reading search history:", error);
            return [];
        }
    }, []);

    const addToHistory = useCallback((student) => {
        try {
            const history = getHistory();
            const key = getStudentKey(student);

            // Drop any existing entry for this student so re-selecting
            // promotes it to the top with a fresh timestamp, instead of
            // silently no-op'ing.
            const withoutExisting = key
                ? history.filter((item) => getStudentKey(item) !== key)
                : history;

            const newEntry = {
                ...student,
                timestamp: Date.now(),
            };
            const updated = [newEntry, ...withoutExisting].slice(0, 10); // Keep last 10
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error("Error adding to search history:", error);
        }
    }, [getHistory]);

    const removeFromHistory = useCallback((studentId) => {
        try {
            const history = getHistory();
            const updated = history.filter((item) => item.id !== studentId && item.user_id_no !== studentId);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        } catch (error) {
            console.error("Error removing from history:", error);
        }
    }, [getHistory]);

    const clearHistory = useCallback(() => {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error("Error clearing history:", error);
        }
    }, []);

    return { getHistory, addToHistory, removeFromHistory, clearHistory };
}

// ============================================================================
// Sub-Components
// ============================================================================

const SearchIcon = () => (
    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <Search className="h-4 w-4 text-muted-foreground" />
    </div>
);

const LoadingIndicator = () => (
    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    </div>
);

const ClearButton = ({ onClick }) => (
    <button
        type="button"
        onClick={onClick}
        className="absolute inset-y-0 right-0 flex items-center pr-3 hover:text-foreground"
        aria-label="Clear search"
    >
        <XCircle className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
    </button>
);

const StudentOption = React.memo(({ student, index, isSelected, onSelect, onMouseEnter }) => {
    const ref = React.useRef(null);

    React.useEffect(() => {
        if (isSelected && ref.current) {
            ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }, [isSelected]);

    return (
        <li
            ref={ref}
            id={`student-${index}`}
            role="option"
            aria-selected={isSelected}
            onClick={() => onSelect(student)}
            onMouseEnter={() => onMouseEnter(index)}
            className={cn(
                "flex items-center px-4 py-2 cursor-pointer transition-colors",
                isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
            )}
        >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted mr-3 shrink-0">
                <Search className="h-4 w-4 text-muted-foreground" />
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
});

StudentOption.displayName = "StudentOption";

const HistoryItem = React.memo(({ student, index, isSelected, onSelect, onRemove, onMouseEnter }) => {
    const ref = React.useRef(null);

    React.useEffect(() => {
        if (isSelected && ref.current) {
            ref.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
    }, [isSelected]);

    return (
        <li
            ref={ref}
            id={`student-${index}`}
            role="option"
            aria-selected={isSelected}
            onMouseEnter={() => onMouseEnter(index)}
            className={cn(
                "flex items-center justify-between px-4 py-2 transition-colors group",
                isSelected && "bg-accent text-accent-foreground"
            )}
        >
            <button
                type="button"
                onClick={() => onSelect(student)}
                className="flex-1 flex items-center gap-3 text-left truncate"
            >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted shrink-0">
                    <MdHistory className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="truncate">
                    <div className="text-sm font-medium truncate">
                        {formatName(student)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                        ID: {student.user_id_no}
                    </div>
                </div>
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onRemove(student.id || student.user_id_no);
                }}
                className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                aria-label="Remove from history"
            >
                <XCircle className="h-4 w-4" />
            </button>
        </li>
    );
});

HistoryItem.displayName = "HistoryItem";

// ============================================================================
// Dropdown Content
// ============================================================================

const DropdownContent = ({ isOpen, isLoading, error, results, activeIndex, onSelect, onRemoveHistory, onMouseEnter }) => {
    if (!isOpen) return null;

    const { matchingHistory, uniqueApiStudents, all } = results;
    const totalResults = all.length;

    // Don't show dropdown if nothing to display
    if (!isLoading && !error && totalResults === 0) return null;

    return (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md overflow-hidden">
            {isLoading && (
                <div className="p-4 text-sm text-center text-muted-foreground">
                    Searching records...
                </div>
            )}

            {error && (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Failed to load results.
                </div>
            )}

            {!isLoading && !error && totalResults > 0 && (
                <ul className="py-1 max-h-60 overflow-auto" id="student-search-listbox" role="listbox">
                    {/* History results first */}
                    {matchingHistory.map((student, idx) => (
                        <HistoryItem
                            key={getStudentKey(student) ?? `history-${idx}`}
                            student={student}
                            index={idx}
                            isSelected={activeIndex === idx}
                            onSelect={onSelect}
                            onRemove={onRemoveHistory}
                            onMouseEnter={onMouseEnter}
                        />
                    ))}

                    {/* API results second */}
                    {uniqueApiStudents.map((student, index) => {
                        const apiActiveIndex = index + matchingHistory.length;
                        return (
                            <StudentOption
                                key={getStudentKey(student) ?? `api-${index}`}
                                student={student}
                                index={apiActiveIndex}
                                isSelected={activeIndex === apiActiveIndex}
                                onSelect={onSelect}
                                onMouseEnter={onMouseEnter}
                            />
                        );
                    })}
                </ul>
            )}

        </div>
    );
};

// ============================================================================
// Main Component
// ============================================================================

export default function StudentSearch({ onSelect, className, ...props }) {
    const [query, setQuery] = useState("");
    const [displayValue, setDisplayValue] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [history, setHistory] = useState([]);
    const wrapperRef = useRef(null);

    const debouncedQuery = useDebounce(query, 300);
    const { getHistory, addToHistory, removeFromHistory } = useSearchHistory();

    // Load history on mount and when opening dropdown
    useEffect(() => {
        if (isOpen && !query.trim()) {
            setHistory(getHistory());
        }
    }, [isOpen, query, getHistory]);

    // Handle click outside
    useClickOutside(
        wrapperRef,
        useCallback(() => setIsOpen(false), [])
    );

    // Fetch students
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
        staleTime: 1000 * 60 * 5, // 5 mins
    });

    // Single derived source of truth for what's shown/navigable.
    // Shared by rendering and keyboard handling so they can't diverge.
    const results = useCombinedResults({ history, apiStudents: students, query: debouncedQuery });

    // Handle student selection
    const handleSelectStudent = useCallback((student) => {
        setQuery(formatName(student));
        setDisplayValue("");
        setIsOpen(false);
        setActiveIndex(-1);
        addToHistory(student);
        onSelect?.(student);
    }, [onSelect, addToHistory]);

    // Handle clear
    const handleClear = useCallback(() => {
        setQuery("");
        setDisplayValue("");
        setIsOpen(false);
        setActiveIndex(-1);
        onSelect?.(null);
    }, [onSelect]);

    // Handle keyboard navigation
    const handleKeyDown = useCallback((e) => {
        if (!isOpen) return;

        const allResults = results.all;
        if (allResults.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setActiveIndex((prev) => {
                    const newIndex = prev < allResults.length - 1 ? prev + 1 : prev;
                    if (newIndex >= 0 && allResults[newIndex]) {
                        setDisplayValue(formatName(allResults[newIndex]));
                    }
                    return newIndex;
                });
                break;

            case "ArrowUp":
                e.preventDefault();
                setActiveIndex((prev) => {
                    const newIndex = prev > 0 ? prev - 1 : -1;
                    if (newIndex >= 0 && allResults[newIndex]) {
                        setDisplayValue(formatName(allResults[newIndex]));
                    } else {
                        setDisplayValue(query);
                    }
                    return newIndex;
                });
                break;

            case "Enter":
                if (activeIndex >= 0 && allResults[activeIndex]) {
                    e.preventDefault();
                    handleSelectStudent(allResults[activeIndex]);
                }
                break;

            case "Escape":
                e.preventDefault();
                setIsOpen(false);
                setDisplayValue("");
                break;

            default:
                break;
        }
    }, [isOpen, results, activeIndex, query, handleSelectStudent]);

    // Handle input change
    const handleInputChange = useCallback((e) => {
        const value = e.target.value;
        setQuery(value);
        setDisplayValue("");
        setActiveIndex(-1); // Reset active index on input change

        if (value.trim()) {
            setIsOpen(true);
        } else {
            setIsOpen(false);
            onSelect?.(null);
        }
    }, [onSelect]);

    // Handle input focus
    const handleInputFocus = useCallback(() => {
        if (query.trim()) {
            setIsOpen(true);
        } else {
            setHistory(getHistory());
            setIsOpen(true);
        }
    }, [query, getHistory]);

    // Handle remove from history
    const handleRemoveFromHistory = useCallback((studentId) => {
        removeFromHistory(studentId);
        setHistory((prev) =>
            prev.filter((item) => item.id !== studentId && item.user_id_no !== studentId)
        );
    }, [removeFromHistory]);

    // Memoize rightIcon to avoid re-renders
    const rightIcon = useMemo(() => {
        if (query) return <ClearButton onClick={handleClear} />;
        return null;
    }, [query, handleClear]);

    return (
        <div ref={wrapperRef} className={cn("relative w-full", className)} {...props}>
            <div className="relative">
                <SearchIcon />

                <Input
                    type="text"
                    role="combobox"
                    aria-expanded={isOpen}
                    aria-controls="student-search-listbox"
                    aria-activedescendant={
                        activeIndex >= 0 ? `student-${activeIndex}` : undefined
                    }
                    placeholder="Search students by name or ID..."
                    className={cn("pl-10 pr-10", className)}
                    value={displayValue || query}
                    onChange={handleInputChange}
                    onFocus={handleInputFocus}
                    onKeyDown={handleKeyDown}
                />

                {isLoading && !rightIcon && <LoadingIndicator />}
                {rightIcon}
            </div>

            <DropdownContent
                isOpen={isOpen}
                isLoading={isLoading}
                error={error}
                results={results}
                activeIndex={activeIndex}
                onSelect={handleSelectStudent}
                onRemoveHistory={handleRemoveFromHistory}
                onMouseEnter={setActiveIndex}
            />
        </div>
    );
}
