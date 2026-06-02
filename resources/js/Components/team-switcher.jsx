import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem
} from "@/Components/ui/sidebar";
import AppLogo from "./AppLogo";
import { Link } from "@inertiajs/react";

export function TeamSwitcher() {
    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <Link href="/" className="w-full">
                    <SidebarMenuButton
                        size="lg"
                        className="w-full transition-all duration-200 hover:bg-sidebar-accent active:scale-[0.98] group gap-1 group-data-[collapsible=icon]:rounded-none group-data-[collapsible=icon]:hover:bg-transparent"
                    >
                        <div className="flex aspect-square size-8 items-center justify-center text-primary-foreground transition-shadow">
                            <AppLogo />
                        </div>

                        <div className="grid flex-1 text-left leading-tight ml-1">
                            <span className="truncate font-bold text-sm tracking-tight">
                                SIS - OCC
                            </span>
                            <span className="truncate text-[11px] font-medium text-muted-primary uppercase tracking-wider">
                                Opol Community College
                            </span>
                        </div>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}