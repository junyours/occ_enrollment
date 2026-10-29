import { useEffect, useId, useState } from "react";
import { Link, usePage } from "@inertiajs/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/Lib/Utils";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/Components/ui/sidebar";
import SchoolYearPicker from "./SchoolYearPicker";
import { MENU_CONFIG } from "@/Components/Config/menuConfig";

const SCHOOL_YEAR_ROLES = new Set([
    "gened_coordinator",
    "nstp_director",
    "cwts_evaluator",
    "rotc_evaluator",
    "lts_evaluator",
    "academic_dean",
]);

function getPath(url) {
    return new URL(url, "http://localhost").pathname.replace(/\/+$/, "") || "/";
}

function NavSection({ section, pathname, expanded, collapsible, onNavigate }) {
    const contentId = useId();
    const [sectionOpen, setSectionOpen] = useState(true);
    const items = section.items.map((item) => {
        const href = route(item.route, item.params);
        const itemPath = getPath(href);

        return {
            ...item,
            href,
            isActive: pathname === itemPath || pathname.startsWith(`${itemPath}/`),
        };
    });
    const hasActiveItem = items.some((item) => item.isActive);

    useEffect(() => {
        if (hasActiveItem) setSectionOpen(true);
    }, [hasActiveItem, pathname]);

    return (
        <div className="space-y-1">
            {expanded && section.label && (
                collapsible ? (
                    <button
                        type="button"
                        aria-expanded={sectionOpen}
                        aria-controls={contentId}
                        onClick={() => setSectionOpen((value) => !value)}
                        className="flex h-7 w-full items-center justify-between rounded-md px-3 text-left text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60 transition-colors hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                        <span className="truncate">{section.label}</span>
                        <ChevronDown
                            aria-hidden="true"
                            className={cn("size-3.5 shrink-0 transition-transform", !sectionOpen && "-rotate-90")}
                        />
                    </button>
                ) : (
                    <SidebarGroupLabel className="h-7 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                        {section.label}
                    </SidebarGroupLabel>
                )
            )}

            <div id={contentId} hidden={expanded && collapsible && !sectionOpen}>
                <SidebarMenu className="gap-1">
                    {items.map((item) => (
                        <SidebarMenuItem key={`${item.route}:${item.name}`}>
                            <SidebarMenuButton
                                isActive={item.isActive}
                                tooltip={item.name}
                                className="h-9 gap-3 px-3"
                                asChild
                            >
                                <Link
                                    href={item.href}
                                    aria-current={item.isActive ? "page" : undefined}
                                    onClick={onNavigate}
                                >
                                    <item.icon aria-hidden="true" className="size-4 shrink-0" />
                                    <span className="truncate">{item.name}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            </div>
        </div>
    );
}

export function NavMain() {
    const { props, url } = usePage();
    const { user, courses = [] } = props.auth;
    const { setOpenMobile, expanded, setPopupOpen } = useSidebar();
    const menuConfigForRole = MENU_CONFIG[user.user_role];
    const menuSections = typeof menuConfigForRole === "function"
        ? menuConfigForRole(courses)
        : menuConfigForRole || [];
    const collapsible = menuSections.filter((section) => section.label).length >= 3;
    const pathname = getPath(url);

    return (
        <SidebarGroup className="gap-4">
            {SCHOOL_YEAR_ROLES.has(user.user_role) && expanded && (
                <div className="px-3 pb-1">
                    <SchoolYearPicker
                        layout="horizontal-select-only"
                        popupClassName="z-[70]"
                        onOpenChange={setPopupOpen}
                    />
                </div>
            )}

            {menuSections.map((section, index) => (
                <NavSection
                    key={`${user.user_role}:${section.label || index}`}
                    section={section}
                    pathname={pathname}
                    expanded={expanded}
                    collapsible={collapsible && Boolean(section.label)}
                    onNavigate={() => setOpenMobile(false)}
                />
            ))}
        </SidebarGroup>
    );
}
