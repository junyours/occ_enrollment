import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from "@/Components/ui/sidebar";
import AppLogo from "./AppLogo";
import { Link } from "@inertiajs/react";
import { ChevronsUpDown } from "lucide-react"; // Added for a more "switcher" feel

export function TeamSwitcher() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <Link href="/" className="w-full">
                    <SidebarMenuButton
                        size="lg"
                        className="w-full transition-all duration-200 hover:bg-sidebar-accent active:scale-[0.98] group"
                    >
                        {/* Enhanced Logo Container */}
                        <div className="flex aspect-square size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm group-hover:shadow-md transition-shadow">
                            <AppLogo className="size-6" />
                        </div>

                        {/* Text Hierarchy */}
                        <div className="grid flex-1 text-left leading-tight ml-1">
                            <span className="truncate font-bold text-sm tracking-tight">
                                SIS - OCC
                            </span>
                            <span className="truncate text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                Opol Community College
                            </span>
                        </div>

                        {/* Interactive Hint */}
                        <ChevronsUpDown className="ml-auto size-4 text-muted-foreground/50 group-hover:text-muted-foreground" />
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}