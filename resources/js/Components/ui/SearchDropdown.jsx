import * as React from "react"
import { Search, Loader2, ChevronDown } from "lucide-react"
import { cn } from "@/Lib/Utils"
import { Input } from "./input"

/**
 * SearchDropdown - Root component that handles dropdown positioning and click-outside behavior
 */
const SearchDropdown = React.forwardRef(({
    className,
    children,
    isOpen,
    onOpenChange,
    data = [],
    searchTerm = '',
    valueKey = 'value',
    labelKey = 'label',
    ...props
}, ref) => {
    const [dropdownPosition, setDropdownPosition] = React.useState('bottom')
    const [filteredData, setFilteredData] = React.useState([])
    const containerRef = React.useRef(null)
    const inputRef = React.useRef(null)
    const dropdownRef = React.useRef(null)

    // Filter data based on search term
    React.useEffect(() => {
        // If dropdown is open and no search term, show all data
        if (!searchTerm && isOpen) {
            setFilteredData(data)
            return
        }

        // If dropdown is closed and no search term, show nothing
        if (!searchTerm) {
            setFilteredData([])
            return
        }

        // Filter based on search term
        const filtered = data.filter(item =>
            item[valueKey]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item[labelKey]?.toLowerCase().includes(searchTerm.toLowerCase())
        )

        setFilteredData(filtered)
    }, [searchTerm, data, valueKey, labelKey, isOpen])

    // Calculate dropdown position
    React.useEffect(() => {
        if (isOpen && inputRef.current) {
            const inputRect = inputRef.current.getBoundingClientRect()
            const spaceBelow = window.innerHeight - inputRect.bottom
            const spaceAbove = inputRect.top

            if (spaceBelow < 300 && spaceAbove > spaceBelow) {
                setDropdownPosition('top')
            } else {
                setDropdownPosition('bottom')
            }
        }
    }, [isOpen])

    // Close dropdown when clicking outside
    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                containerRef.current &&
                !containerRef.current.contains(event.target)
            ) {
                onOpenChange(false)
            }
        }

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside)
            return () => document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen, onOpenChange])

    return (
        <SearchDropdownContext.Provider value={{
            filteredData,
            inputRef,
            dropdownRef,
            dropdownPosition,
            isOpen,
            searchTerm,
            valueKey,
            labelKey
        }}>
            <div
                ref={containerRef}
                className={cn("relative w-full", className)}
                {...props}
            >
                {children}
            </div>
        </SearchDropdownContext.Provider>
    )
})
SearchDropdown.displayName = "SearchDropdown"

/**
 * Context for sharing state between components
 */
const SearchDropdownContext = React.createContext({})

const useSearchDropdown = () => {
    const context = React.useContext(SearchDropdownContext)
    if (!context) {
        throw new Error("SearchDropdown components must be used within SearchDropdown")
    }
    return context
}

/**
 * SearchDropdownTrigger - Wrapper for the input element
 */
const SearchDropdownTrigger = React.forwardRef(({
    className,
    children,
    ...props
}, ref) => {
    const { inputRef } = useSearchDropdown()

    return (
        <div ref={inputRef} className={cn("relative", className)} {...props}>
            {children}
        </div>
    )
})
SearchDropdownTrigger.displayName = "SearchDropdownTrigger"

/**
 * SearchDropdownInput - The input field with search icon
 */
const SearchDropdownInput = React.forwardRef(({
    className,
    ...props
}, ref) => {
    return (
        <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
                ref={ref}
                className={cn(
                    "flex h-10 w-full rounded-md border border-input px-3 py-2 pl-10 pr-10 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    className
                )}
                {...props}
            />
        </div>
    )
})
SearchDropdownInput.displayName = "SearchDropdownInput"

/**
 * SearchDropdownLoading - Loading indicator positioned in the input
 */
const SearchDropdownLoading = React.forwardRef(({
    className,
    ...props
}, ref) => {
    return (
        <Loader2
            ref={ref}
            className={cn(
                "absolute right-10 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground",
                className
            )}
            size={16}
            {...props}
        />
    )
})
SearchDropdownLoading.displayName = "SearchDropdownLoading"

/**
 * SearchDropdownIcon - Chevron icon positioned in the input
 */
const SearchDropdownIcon = React.forwardRef(({
    className,
    ...props
}, ref) => {
    const { isOpen } = useSearchDropdown()

    return (
        <ChevronDown
            ref={ref}
            className={cn(
                "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-transform",
                isOpen && "rotate-180",
                className
            )}
            size={18}
            {...props}
        />
    )
})
SearchDropdownIcon.displayName = "SearchDropdownIcon"

/**
 * SearchDropdownContent - The dropdown container
 */
const SearchDropdownContent = React.forwardRef(({
    className,
    children,
    ...props
}, ref) => {
    const { dropdownRef, dropdownPosition, isOpen } = useSearchDropdown()

    if (!isOpen) return null

    return (
        <div
            ref={dropdownRef}
            className={cn(
                "absolute left-0 right-0 bg-popover border rounded-md shadow-lg max-h-80 overflow-y-auto z-50",
                dropdownPosition === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
})
SearchDropdownContent.displayName = "SearchDropdownContent"

/**
 * SearchDropdownList - Container for dropdown items
 */
const SearchDropdownList = React.forwardRef(({
    className,
    children,
    ...props
}, ref) => {
    return (
        <div ref={ref} className={cn("p-4", className)} {...props}>
            {children}
        </div>
    )
})
SearchDropdownList.displayName = "SearchDropdownList"

/**
 * SearchDropdownEmpty - Empty state component
 */
const SearchDropdownEmpty = React.forwardRef(({
    className,
    children,
    ...props
}, ref) => {
    const { searchTerm } = useSearchDropdown()

    return (
        <div
            ref={ref}
            className={cn("p-4 text-center text-muted-foreground text-sm", className)}
            {...props}
        >
            {children || `No results found for "${searchTerm}"`}
        </div>
    )
})
SearchDropdownEmpty.displayName = "SearchDropdownEmpty"

/**
 * SearchDropdownLoadingState - Loading state for the dropdown
 */
const SearchDropdownLoadingState = React.forwardRef(({
    className,
    children,
    ...props
}, ref) => {
    return (
        <div
            ref={ref}
            className={cn("p-4 text-center text-muted-foreground", className)}
            {...props}
        >
            {children || (
                <>
                    <Loader2 className="animate-spin inline-block mr-2" size={20} />
                    Loading...
                </>
            )}
        </div>
    )
})
SearchDropdownLoadingState.displayName = "SearchDropdownLoadingState"

/**
 * SearchDropdownItem - Individual dropdown item
 */
const SearchDropdownItem = React.forwardRef(({
    className,
    isSelected,
    isLast,
    children,
    ...props
}, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                "p-3 hover:bg-accent cursor-pointer transition-colors",
                !isLast && "border-b",
                isSelected && "bg-accent",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
})
SearchDropdownItem.displayName = "SearchDropdownItem"

export {
    SearchDropdown,
    SearchDropdownTrigger,
    SearchDropdownInput,
    SearchDropdownLoading,
    SearchDropdownIcon,
    SearchDropdownContent,
    SearchDropdownList,
    SearchDropdownEmpty,
    SearchDropdownLoadingState,
    SearchDropdownItem,
    SearchDropdownContext,
    useSearchDropdown,
}