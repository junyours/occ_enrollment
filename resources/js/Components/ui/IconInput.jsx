import React from "react"
import { Search } from "lucide-react"

import { Input } from "@/Components/ui/input"
import { cn } from "@/Lib/Utils"

const IconInput = React.forwardRef(
    (
        {
            icon: Icon = Search,
            className,
            iconClassName,
            containerClassName,
            ...props
        },
        ref
    ) => {
        return (
            <div className={cn("relative", containerClassName)}>
                <Icon
                    aria-hidden="true"
                    className={cn(
                        "pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground",
                        iconClassName
                    )}
                />

                <Input
                    ref={ref}
                    className={cn("pl-10", className)}
                    {...props}
                />
            </div>
        )
    }
)

IconInput.displayName = "IconInput"

export default IconInput