import * as React from "react";

const Textarea = React.forwardRef(({ className = '', ...props }, ref) => {
    return (
        <textarea
            ref={ref}
            className={`border border-input bg-background text-sm px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring ${className}`}
            {...props}
        />
    );
});
Textarea.displayName = "Textarea";

export { Textarea };
