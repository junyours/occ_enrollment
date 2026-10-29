import { Link, usePage } from "@inertiajs/react";
import {
    BookOpen,
    DoorClosed,
    GraduationCap,
    LayoutDashboard,
    NotebookText,
    User,
} from "lucide-react";
import { cn } from "@/Lib/Utils";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/Components/ui/sidebar";

function getPath(url) {
    return new URL(url, "http://localhost").pathname.replace(/\/+$/, "") || "/";
}

export function NavEnrollment() {
    const { props, url } = usePage();
    const { user, courses = [], enrollment_status, schoolYear } = props.auth;
    const { setOpenMobile, expanded } = useSidebar();

    if (
        !["registrar", "evaluator", "program_head"].includes(user.user_role) ||
        !["ongoing", "preparing"].includes(enrollment_status)
    ) {
        return null;
    }

    const pathname = getPath(url);
    const term = schoolYear
        ? [
            `${schoolYear.start_year}–${schoolYear.end_year}`,
            schoolYear.semester?.semester_name && `${schoolYear.semester.semester_name} Semester`,
        ].filter(Boolean).join(" · ")
        : null;
    const schedules = user.user_role === "program_head" ? [
        { name: "Rooms", tooltip: "Room Schedules", route: "enrollment.room-schedules", icon: DoorClosed },
        { name: "Faculty", tooltip: "Faculty Schedules", route: "enrollment.faculties-schedules", icon: User },
        { name: "Subjects", tooltip: "Subject Schedules", route: "enrollment.subjects-schedules", icon: NotebookText },
    ] : [];

    function renderItem(item) {
        const href = route(item.route, item.params);
        const itemPath = getPath(href);
        const isActive = pathname === itemPath || pathname.startsWith(`${itemPath}/`);

        return (
            <SidebarMenuItem key={`${item.route}:${item.params || item.name}`}>
                <SidebarMenuButton
                    tooltip={item.tooltip || item.name}
                    isActive={isActive}
                    className={cn(
                        "h-9 gap-3 px-3",
                        item.course && !expanded && "group-data-[collapsible=icon]:!p-0",
                    )}
                    asChild
                >
                    <Link
                        href={href}
                        aria-current={isActive ? "page" : undefined}
                        aria-label={item.name}
                        onClick={() => setOpenMobile(false)}
                    >
                        {item.course && !expanded ? (
                            <span
                                aria-hidden="true"
                                className="flex size-8 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar-foreground/5 text-[9px] font-bold leading-none tracking-tighter"
                            >
                                {item.name}
                            </span>
                        ) : (
                            <item.icon aria-hidden="true" className="size-4 shrink-0" />
                        )}
                        <span className="truncate">{item.name}</span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    }

    return (
        <SidebarGroup className="gap-3 border-b border-sidebar-border pb-4">
            {expanded && (
                <div className="mx-1 rounded-lg bg-sidebar-foreground/5 px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold">Enrollment</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sidebar-foreground/5 px-2 py-0.5 text-[10px] font-semibold capitalize text-sidebar-foreground/80">
                            <span
                                aria-hidden="true"
                                className={cn("size-1.5 rounded-full", enrollment_status === "ongoing" ? "bg-emerald-500" : "bg-amber-500")}
                            />
                            {enrollment_status}
                        </span>
                    </div>
                    {term && <p className="mt-1 text-[11px] leading-relaxed text-sidebar-foreground/65">{term}</p>}
                </div>
            )}

            <SidebarMenu className="gap-1">
                {renderItem({ name: "Dashboard", route: "dashboard", icon: LayoutDashboard })}
            </SidebarMenu>

            {courses.length > 0 && (
                <div className="space-y-1">
                    {expanded && (
                        <SidebarGroupLabel className="h-7 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                            Courses
                        </SidebarGroupLabel>
                    )}
                    <SidebarMenu className="gap-1">
                        {courses.map((course) => renderItem({
                            name: course.course_name_abbreviation,
                            route: "enrollment.view",
                            params: course.hashed_course_id,
                            icon: BookOpen,
                            course: true,
                        }))}
                    </SidebarMenu>
                </div>
            )}

            {schedules.length > 0 && (
                <div className="space-y-1">
                    {expanded && (
                        <SidebarGroupLabel className="h-7 px-3 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                            Schedules
                        </SidebarGroupLabel>
                    )}
                    <SidebarMenu className="gap-1">
                        {schedules.map(renderItem)}
                    </SidebarMenu>
                </div>
            )}

            <SidebarMenu className="gap-1">
                {renderItem({ name: "Student Grades", route: "enrollment.student-grades", icon: GraduationCap })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
