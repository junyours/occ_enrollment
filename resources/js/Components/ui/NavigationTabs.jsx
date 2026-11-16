import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/Components/ui/tabs";

import { cn } from "@/Lib/Utils";

export default function NavigationTabs({
    value,
    onValueChange,
    items,
    className,
}) {
    return (
        <Tabs
            value={value}
            onValueChange={onValueChange}
            className={cn("w-full", className)}
        >
            {/* Below xl the content area (next to the sidebar) is too narrow
                for one row, so tabs form a 3-column grid and stay visible. */}
            <div className="w-full overflow-x-auto border-b">
                <TabsList
                    className="
                        grid
                        h-auto
                        w-full
                        grid-cols-3
                        rounded-none
                        bg-transparent
                        p-0
                        xl:flex
                        xl:min-w-max
                        xl:justify-start
                    "
                >
                    {items.map((item) => {
                        const Icon = item.icon;

                        return (
                            <TabsTrigger
                                key={item.value}
                                value={item.value}
                                disabled={item.disabled}
                                className={cn(
                                    "relative",
                                    "h-10",
                                    "min-w-0",
                                    "xl:min-w-[140px]",
                                    "xl:flex-1",
                                    "gap-2",
                                    "rounded-none",
                                    "border-0",
                                    "px-5",
                                    "text-muted-foreground",
                                    "shadow-none",
                                    "transition-colors",

                                    "hover:bg-accent/50",
                                    "hover:text-foreground",

                                    "data-[state=active]:bg-accent/50",
                                    "data-[state=active]:text-primary",
                                    "data-[state=active]:shadow-none",

                                    "after:absolute",
                                    "after:bottom-0",
                                    "after:left-0",
                                    "after:right-0",
                                    "after:h-0.5",
                                    "after:scale-x-0",
                                    "after:bg-primary",
                                    "after:transition-transform",

                                    "data-[state=active]:after:scale-x-100"
                                )}
                            >
                                {Icon && (
                                    <Icon className="size-4 shrink-0" />
                                )}

                                <span className="whitespace-nowrap text-sm font-medium">
                                    {item.label}
                                </span>
                            </TabsTrigger>
                        );
                    })}
                </TabsList>
            </div>
        </Tabs>
    );
}