import { Button } from "@/Components/ui/button"
import { cn } from "@/Lib/Utils"

export default function SegmentedTabs({
    value,
    onValueChange,
    items,
    className,
}) {
    return (
        <div
            className={cn(
                "inline-flex items-center rounded-xl border bg-background p-1 shadow-sm",
                className
            )}
        >
            {items.map((item, index) => {
                const isActive = value === item.value
                const Icon = item.icon

                return (
                    <div
                        key={item.value}
                        className="flex items-center"
                    >
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={item.disabled}
                            onClick={() => onValueChange(item.value)}
                            className={cn(
                                "h-9 rounded-lg px-6",
                                "gap-2",
                                "text-sm font-medium",
                                "text-muted-foreground",
                                "shadow-none",
                                "transition-colors",

                                "hover:bg-accent/50",
                                "hover:text-foreground",

                                isActive &&
                                "bg-accent text-primary hover:bg-accent hover:text-primary"
                            )}
                        >
                            {Icon && (
                                <Icon className="size-4 shrink-0" />
                            )}

                            <span className="whitespace-nowrap">
                                {item.label}
                            </span>
                        </Button>

                        {index < items.length - 1 && (
                            <div className="mx-1 h-5 w-px bg-border" />
                        )}
                    </div>
                )
            })}
        </div>
    )
}