import { usePage } from "@inertiajs/react";
import { cn } from "@/Lib/Utils";
import { Link } from "@inertiajs/react";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/Components/ui/sidebar";
import SchoolYearPicker from "./SchoolYearPicker";
import { MENU_CONFIG } from "@/Components/Config/menuConfig"; // Import the config

export function NavMain() {
    const { user, courses } = usePage().props.auth;
    const userRole = user.user_role;
    const currentUrl = usePage().url;
    const { setOpenMobile, open } = useSidebar();

    // Get menu sections for the user's role
    const menuConfigForRole = MENU_CONFIG[userRole];
    const menuSections = typeof menuConfigForRole === "function"
        ? menuConfigForRole(courses)
        : menuConfigForRole || [];

    const showSchoolYearPicker = (userRole === "gened_coordinator" || userRole === "nstp_director" || userRole === "cwts_evaluator" || userRole === "rotc_evaluator" || userRole === "lts_evaluator" || userRole === "academic_dean") && open;

    return (
        <SidebarGroup>
            {showSchoolYearPicker && (
                    <>
                        <SidebarMenu className="space-y-0.5 mb-4">
                            <SidebarGroupLabel className="flex flex-col p-0 text-xs uppercase text-muted-foreground h-min text-none pl-4">
                                <SchoolYearPicker layout="horizontal-select-only" />
                            </SidebarGroupLabel>
                        </SidebarMenu>
                    </>
                )}

            {/* Dynamic Navigation Sections */}
            {menuSections.map((section, index) => (
                <SidebarMenu key={index} className="mb-4 space-y-2">
                    {/* Conditionally render the label to prevent empty space */}
                    {open && (
                        <SidebarGroupLabel className="px-3 text-xs tracking-wider uppercase text-muted-foreground/80 h-min">
                            {section.label}
                        </SidebarGroupLabel>
                    )}

                    {section.items.map((item) => {
                        const itemUrl = route(item.route, item.params);
                        const itemPath = new URL(itemUrl).pathname;
                        const pathname = currentUrl.split("?")[0];
                        const isActive =
                            pathname === itemPath ||
                            pathname.startsWith(`${itemPath}/`);

                        return (
                            <SidebarMenuItem
                                key={item.name}
                                onClick={() => setOpenMobile(false)}
                            >
                                <SidebarMenuButton
                                    isActive={isActive}
                                    tooltip={item.name}
                                    className={cn(
                                        "",
                                    )}
                                    asChild
                                >
                                    <Link
                                        href={itemUrl}
                                        className="flex items-center w-full gap-3 px-3 py-2"
                                    >
                                        <item.icon
                                            size={18}
                                            className="shrink-0"
                                        />
                                        <span className="truncate">
                                            {item.name}
                                        </span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            ))}
        </SidebarGroup>
    );
}