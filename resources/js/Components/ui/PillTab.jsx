import * as React from "react"

import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"

import { cn } from "@/Lib/Utils"

const pillTabVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default:
                    "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",

                action:
                    "border-dashed border-border bg-background text-muted-foreground hover:border-primary hover:text-primary",
            },

            active: {
                true:
                    "border-primary bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary",
                false: "",
            },

            size: {
                default: "h-9 px-5",
                sm: "h-8 px-4 text-xs",
                lg: "h-10 px-6",
            },
        },

        defaultVariants: {
            variant: "default",
            active: false,
            size: "default",
        },
    }
)

const PillTab = React.forwardRef(
    (
        {
            className,
            variant,
            active = false,
            size,
            asChild = false,
            ...props
        },
        ref
    ) => {
        const Comp = asChild ? Slot : "button"

        return (
            <Comp
                ref={ref}
                className={cn(
                    pillTabVariants({
                        variant,
                        active,
                        size,
                        className,
                    })
                )}
                aria-pressed={active}
                {...props}
            />
        )
    }
)

PillTab.displayName = "PillTab"

export { PillTab, pillTabVariants }