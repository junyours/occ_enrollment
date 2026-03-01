import { Link, usePage } from "@inertiajs/react";
import { formatFullNameFML } from "@/Lib/Utils";
import { ModeToggle } from "@/Components/mode-toggle";

import {
    BadgeCheck,
    ChevronsUpDown,
    LogOut,
    Palette,
} from "lucide-react";

import {
    Avatar,
    AvatarFallback,
} from "@/Components/ui/avatar";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/Components/ui/dropdown-menu";

import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/Components/ui/sidebar";

export function NavUser() {
    const { auth } = usePage().props;
    const user = auth?.user;
    const { isMobile, setOpenMobile } = useSidebar();

    if (!user) return null;

    const displayName = user.first_name
        ? formatFullNameFML(user)
        : user.user_role.replace(/_/g, " ").toUpperCase();

    const displayInitial = user.first_name
        ? user.first_name.charAt(0)
        : user.user_role.charAt(0).toUpperCase();

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <SidebarMenuButton
                            size="lg"
                            className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                        >
                            <Avatar className="h-8 w-8 rounded-lg">
                                <AvatarFallback className="rounded-lg bg-sidebar-primary">
                                    {displayInitial}
                                </AvatarFallback>
                            </Avatar>

                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">
                                    {displayName}
                                </span>
                                <span className="truncate text-xs">
                                    {user.email_address}
                                </span>
                            </div>

                            <ChevronsUpDown className="ml-auto size-4" />
                        </SidebarMenuButton>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent
                        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        align="end"
                        sideOffset={4}
                    >
                        {/* Profile Header */}
                        <DropdownMenuLabel className="p-0 font-normal">
                            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                <Avatar className="h-8 w-8 rounded-lg">
                                    <AvatarFallback className="rounded-lg">
                                        {displayInitial}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">
                                        {displayName}
                                    </span>
                                    <span className="truncate text-xs">
                                        {user.email_address}
                                    </span>
                                </div>
                            </div>
                        </DropdownMenuLabel>

                        <DropdownMenuSeparator />

                        {/* Profile */}
                        <DropdownMenuItem asChild>
                            <Link
                                href={route("profile")}
                                onClick={() => setOpenMobile(false)}
                            >
                                <BadgeCheck className="mr-2 h-4 w-4" />
                                Profile
                            </Link>
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {/* Theme Toggle */}
                        <div className="px-2 flex justify-between items-center">
                            <div className="flex items-center text-sm">
                                <Palette className="h-4 w-4 mr-2" />
                                Theme
                            </div>
                            <ModeToggle />
                        </div>

                        <DropdownMenuSeparator />

                        {/* Logout */}
                        <DropdownMenuItem asChild>
                            <Link
                                href={route("logout")}
                                method="post"
                                as="button"
                                className="w-full"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Log out
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}