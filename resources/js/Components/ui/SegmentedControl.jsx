import { Button } from "@/Components/ui/button"
import { cn } from "@/Lib/Utils"

export default function SegmentedControl({
    value,
    onValueChange,
    items,
    className,
}) {
    return (
        <div
            className={cn(
                "flex items-center gap-4",
                className
            )}
        >
            <div className="inline-flex overflow-hidden rounded-xl border bg-muted/40">
                {items.map((item) => {
                    const isActive = value === item.value

                    return (
                        <Button
                            key={item.value}
                            type="button"
                            variant="ghost"
                            disabled={item.disabled}
                            onClick={() => onValueChange(item.value)}
                            className={cn(
                                "h-11 min-w-[140px] rounded-lg px-6",
                                "text-sm font-medium",
                                "text-muted-foreground",
                                "shadow-none",
                                "transition-all",

                                "hover:bg-accent/50 hover:text-foreground",

                                isActive &&
                                "bg-primary/80 text-primary-foreground shadow-sm hover:bg-primary hover:text-primary-foreground"
                            )}
                        >
                            {item.label}
                        </Button>
                    )
                })}
            </div>
        </div>
    )
}