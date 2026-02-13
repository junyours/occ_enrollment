import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/Lib/Utils"
import { Input } from "@/Components/ui/input"
import { Button } from "@/Components/ui/button"
import { Separator } from "@/Components/ui/separator"

const SearchBar = React.forwardRef(({ className, value: controlledValue, onChange, onSearch, ...props }, ref) => {
    // 1. Internal state to hold the value if the parent doesn't provide one
    const [internalValue, setInternalValue] = React.useState("")

    // 2. Determine which value to use (Prioritize the prop if it exists)
    const isControlled = controlledValue !== undefined
    const value = isControlled ? controlledValue : internalValue

    const handleChange = (e) => {
        const newValue = e.target.value
        if (!isControlled) {
            setInternalValue(newValue)
        }
        if (onChange) {
            onChange(e)
        }
    }

    const handleSubmit = (e) => {
        if (e) e.preventDefault()
        if (onSearch) onSearch(value)
    }

    const handleClear = () => {
        if (!isControlled) {
            setInternalValue("")
        }
        if (onChange) {
            onChange({ target: { value: "" } })
        }
    }

    return (
        <form
            onSubmit={handleSubmit}
            className={cn(
                "flex h-9 w-full items-center rounded-md bg-background shadow-sm transition-shadow border-0",
                className
            )}
        >
            <div className="flex items-center border border-r-0 h-full w-full focus-within:ring-1 focus-within:ring-ring focus-within:ring-offset-2 rounded-l-[var(--radius)] focus-visible:ring-1">
                <Input
                    type="text"
                    ref={ref}
                    value={value}
                    onChange={handleChange}
                    placeholder="Search..."
                    className="flex-1 border-none shadow-none bg-transparent border-0 h-full p-0 pl-3 ring-none focus-within:ring-0 focus-visible:ring-0"
                    {...props}
                />

                {value && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={handleClear}
                        className="h-5 w-5 rounded-full mx-1 bg-muted hover:bg-transparent text-muted-foreground hover:text-foreground border-none ring-none relative"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <Button
                type="submit"
                size="icon"
                className="h-9 w-9 focus-visible:ring-0 focus-visible:ring-offset-0 rounded-l-none"
                onMouseDown={(e) => e.preventDefault()}
            >
                <Search className="h-5 w-5 mr-0.5" />
            </Button>
        </form>
    )
})

SearchBar.displayName = "SearchBar"

export default SearchBar