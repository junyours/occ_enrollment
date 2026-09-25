import React, { useState } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"

import { Input } from "@/Components/ui/input"
import { cn } from "@/Lib/Utils"

const NumberInput = React.forwardRef(
    (
        {
            value,
            defaultValue = 0,
            min,
            max,
            step = 1,
            onValueChange,
            className,
            inputClassName,
            containerClassName,
            disabled,
            upIcon: UpIcon = ChevronUp,
            downIcon: DownIcon = ChevronDown,
            ...props
        },
        forwardedRef
    ) => {
        const inputRef = React.useRef(null)
        const [internalValue, setInternalValue] = useState(defaultValue)

        const currentValue =
            value !== undefined ? value : internalValue

        React.useImperativeHandle(
            forwardedRef,
            () => inputRef.current
        )

        const updateValue = (nextValue) => {
            let result = Number(nextValue)

            if (Number.isNaN(result)) {
                result = 0
            }

            if (min !== undefined) {
                result = Math.max(min, result)
            }

            if (max !== undefined) {
                result = Math.min(max, result)
            }

            if (value === undefined) {
                setInternalValue(result)
            }

            onValueChange?.(result)
        }

        const increment = () => {
            updateValue(Number(currentValue || 0) + Number(step))
        }

        const decrement = () => {
            updateValue(Number(currentValue || 0) - Number(step))
        }

        const handleChange = (event) => {
            const nextValue = event.target.value

            if (value === undefined) {
                setInternalValue(nextValue)
            }

            onValueChange?.(
                nextValue === "" ? "" : Number(nextValue)
            )
        }

        return (
            <div
                className={cn(
                    "relative inline-flex w-24",
                    className
                )}
            >
                <Input
                    ref={inputRef}
                    type="number"
                    value={currentValue ?? ""}
                    min={min}
                    max={max}
                    step={step}
                    disabled={disabled}
                    onChange={handleChange}
                    className={cn(
                        "h-9 w-full rounded-sm pr-9 text-center",
                        "[appearance:textfield]",
                        "[&::-webkit-inner-spin-button]:appearance-none",
                        "[&::-webkit-outer-spin-button]:appearance-none",
                        inputClassName
                    )}
                    {...props}
                />

                <div className="absolute bottom-px right-px top-px flex w-8 flex-col border-l">
                    <button
                        type="button"
                        tabIndex={-1}
                        disabled={
                            disabled ||
                            (max !== undefined &&
                                Number(currentValue) >= max)
                        }
                        onClick={increment}
                        className={cn(
                            "flex flex-1 items-center justify-center rounded-tr-sm",
                            "text-muted-foreground transition-colors",
                            "hover:bg-muted hover:text-foreground",
                            "disabled:cursor-not-allowed disabled:opacity-40"
                        )}
                    >
                        <UpIcon className="size-3.5" />
                        <span className="sr-only">
                            Increase value
                        </span>
                    </button>

                    <button
                        type="button"
                        tabIndex={-1}
                        disabled={
                            disabled ||
                            (min !== undefined &&
                                Number(currentValue) <= min)
                        }
                        onClick={decrement}
                        className={cn(
                            "flex flex-1 items-center justify-center rounded-br-sm border-t",
                            "text-muted-foreground transition-colors",
                            "hover:bg-muted hover:text-foreground",
                            "disabled:cursor-not-allowed disabled:opacity-40"
                        )}
                    >
                        <DownIcon className="size-3.5" />
                        <span className="sr-only">
                            Decrease value
                        </span>
                    </button>
                </div>
            </div>
        )
    }
)

NumberInput.displayName = "NumberInput"

export default NumberInput