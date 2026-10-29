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
                <SidebarMenuButton
                    size="lg"
                    asChild
                    className="w-full gap-2 transition-colors duration-200 group-data-[collapsible=icon]:rounded-none group-data-[collapsible=icon]:hover:bg-transparent"
                >
                    <Link href="/" aria-label="SIS - OCC home">
                        <div className="flex aspect-square size-8 shrink-0 items-center justify-center text-primary-foreground">
                            <AppLogo className="h-8 w-8" />
                        </div>

                        <div className="grid min-w-0 flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                            <span className="truncate font-bold text-sm tracking-tight">
                                SIS - OCC
                            </span>
                            <span className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                Opol Community College
                            </span>
                        </div>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
