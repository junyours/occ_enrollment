import React, { forwardRef, useId } from "react"
import { Input } from "@/Components/ui/input"
import { Label } from "@/Components/ui/label"
import { cn } from "@/Lib/Utils"

export const CFloatingInput = forwardRef(
    ({ label, error, className, id, required, ...props }, ref) => {
        const generatedId = useId()
        const inputId = id || generatedId

        return (
            <div>
                <div className="relative w-full h-12">
                    <Input
                        id={inputId}
                        ref={ref}
                        placeholder=""
                        className={cn(
                            "peer h-12",
                            error && "border-destructive focus-visible:ring-destructive",
                            className
                        )}
                        {...props}
                    />

                    <Label
                        htmlFor={inputId}
                        className={cn(
                            "absolute left-3 top-1.5 z-10 origin-[0] -translate-y-4 scale-90 transform bg-background px-1 text-sm transition-all duration-200",
                            "text-muted-foreground",
                            // The default "resting" state when input is empty
                            "peer-placeholder-shown:top-3.5 peer-placeholder-shown:translate-y-0 peer-placeholder-shown:scale-100",
                            // The "active" states
                            "peer-focus:top-1.5 peer-focus:-translate-y-4 peer-focus:scale-90",
                            "peer-focus:text-primary",
                            "hover:cursor-text",

                            // If there is an error, force the label up and turn it red
                            error && "top-1.5 -translate-y-4 scale-90 text-destructive peer-focus:text-destructive"
                        )}
                    >
                        {label}
                    </Label>
                </div>
                {error && (
                    <p className="mt-1 text-sm text-destructive">{error}</p>
                )}
            </div>
        )
    }
)

CFloatingInput.displayName = "CFloatingInput"
