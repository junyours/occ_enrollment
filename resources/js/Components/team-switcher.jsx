import { SidebarMenu, SidebarMenuButton } from "@/Components/ui/sidebar";
import AppLogo from "./AppLogo";
import { Link } from "@inertiajs/react";

export function TeamSwitcher() {
    return (
        <SidebarMenu>
            <Link href="/">
                <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                    <div className="flex aspect-square size-8 items-center justify-center">
                        <AppLogo />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-semibold">OCC</span>
                        <span className="truncate text-xs">
                            Opol Community College
                        </span>
                    </div>
                </SidebarMenuButton>
            </Link>
        </SidebarMenu>
    );
}
