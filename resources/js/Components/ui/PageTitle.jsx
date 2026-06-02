import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "@/Lib/Utils";
import { Card } from "./card"; // Ensure the correct import path for your Card component

const pageTitleVariants = cva(
    "font-bold tracking-tight p-2", // Added padding for better spacing inside the card
    {
        variants: {
            size: {
                sm: "text-lg",
                md: "text-xl",
                lg: "text-2xl",
                xl: "text-3xl",
                xxl: "text-4xl",
            },
            align: {
                left: "text-left",
                center: "text-center",
                right: "text-right",
            },
        },
        defaultVariants: {
            size: "xl",
            align: "left",
        },
    }
);

const PageTitle = React.forwardRef(({ className, size, align, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "h1";
    return (
        <Card className={cn("", className)}>
            <Comp className={cn(pageTitleVariants({ size, align }))} ref={ref} {...props} />
        </Card>
    );
});

PageTitle.displayName = "PageTitle";

export { PageTitle, pageTitleVariants };
