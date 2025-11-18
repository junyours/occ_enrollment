import { Link } from '@inertiajs/react';
import { usePage } from "@inertiajs/react";
import { formatFullNameFML } from '@/Lib/Utils';
import { ModeToggle } from '@/Components/mode-toggle';

import {
    BadgeCheck,
    Bell,
    ChevronsUpDown,
    CreditCard,
    LogOut,
    Palette,
    Sparkles,
} from "lucide-react";

import {
    Avatar,
    AvatarFallback,
    AvatarImage,
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
    const { user } = usePage().props.auth;
    const { isMobile } = useSidebar();
    // return <></>

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
                                    {user.user_role.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="grid flex-1 text-left text-sm leading-tight">
                                <span className="truncate font-semibold">
                                    {user.user_role.replace(/_/g, ' ').toUpperCase()}
                                </span>
                                <span className="truncate text-xs">{user.email_address}</span>
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
                        <Link className='cursor-pointer' href={route('profile')}>
                            <DropdownMenuLabel className="p-0 font-normal cursor-pointer">
                                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarFallback className="rounded-lg">
                                            {user.user_role.charAt(0).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">
                                            {user.user_role.replace(/_/g, ' ').toUpperCase()}
                                        </span>
                                        <span className="truncate text-xs">
                                            {user.email_address}
                                        </span>
                                    </div>
                                </div>
                            </DropdownMenuLabel>
                        </Link>
                        <DropdownMenuSeparator />
                        <div className='px-2 flex justify-between items-center'>
                            <div className='flex items-center'>
                                <Palette className="h-4 w-4 mr-2" />
                                Theme
                            </div>
                            <ModeToggle />
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem>
                                <BadgeCheck />
                                -
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <CreditCard />
                                -
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                <Bell />
                                -
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <Link
                            className='w-full cursor-pointer'
                            href={route('logout')}
                            method="post"
                            as="button"
                        >
                            <DropdownMenuItem className='w-full cursor-pointer'>
                                <LogOut />
                                Log out
                            </DropdownMenuItem>
                        </Link>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
