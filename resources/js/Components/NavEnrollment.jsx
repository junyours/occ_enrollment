import { usePage } from "@inertiajs/react";
import { LayoutDashboard, BookOpen } from "lucide-react";
import { cn, formatDateShort } from "@/Lib/Utils"; // Ensure you have a utility for class merging
import { Link } from "@inertiajs/react";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/Components/ui/sidebar";
import { DoorClosed, User, NotebookText } from "lucide-react";

export function NavEnrollment() {
    const { user, courses, enrollment_status, schoolYear } = usePage().props.auth;
    const currentUrl = usePage().url; // Get the current route
    const { setOpenMobile } = useSidebar();

    return (
        <>
            {(user.user_role == "registrar" || user.user_role == "evaluator" || user.user_role == "program_head") && (
                <>
                    {(enrollment_status == 'ongoing' || enrollment_status == 'preparing') &&
                        <SidebarGroup>
                            <SidebarGroupLabel>
                                <div>
                                    <div>
                                        Enrollment {enrollment_status}
                                    </div>
                                    <div>
                                        {schoolYear.start_year}-{schoolYear.end_year} {schoolYear.semester.semester_name} Semester
                                    </div>
                                </div>
                            </SidebarGroupLabel>
                            <SidebarMenu>
                                {courses.map((course) => {
                                    const courseUrl = route("enrollment.view", course.hashed_course_id);
                                    const isActive = currentUrl.startsWith(`/enrollment/${course.hashed_course_id}`);

                                    return (
                                        <SidebarMenuItem key={course.hashed_course_id}>
                                            <SidebarMenuButton
                                                tooltip={course.course_name_abbreviation}
                                                className={cn("h-10 text-md", isActive && "bg-sidebar-accent text-sidebar-accent-foreground")}
                                                asChild
                                            >
                                                <Link onClick={() => setOpenMobile(false)} href={courseUrl} className="w-full flex items-center">
                                                    <BookOpen />
                                                    <span>{course.course_name_abbreviation}</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    );
                                })}
                                {/* Dashboard */}
                                <SidebarMenuItem>
                                    <SidebarMenuButton
                                        tooltip="Dashboard"
                                        className={cn("h-10 text-md", currentUrl.startsWith("/dashboard") && "bg-sidebar-accent text-sidebar-accent-foreground")}
                                        asChild
                                    >
                                        <Link
                                            onClick={() => setOpenMobile(false)}
                                            href={route("dashboard")}
                                            className="w-full flex items-center">
                                            <LayoutDashboard />
                                            <span>Dashboard</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                                {user.user_role == "program_head" && (
                                    <>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                tooltip="Room Schedules"
                                                className={cn("h-10 text-md", currentUrl.startsWith("/rooms-schedules") && "bg-sidebar-accent text-sidebar-accent-foreground")}
                                                asChild
                                            >
                                                <Link
                                                    onClick={() => setOpenMobile(false)}
                                                    href={route("enrollment.room-schedules")}
                                                    className="w-full flex items-center">
                                                    <DoorClosed />
                                                    <span>Rooms</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                tooltip="Faculty Schedules"
                                                className={cn("h-10 text-md", currentUrl.startsWith("/faculties-schedules") && "bg-sidebar-accent text-sidebar-accent-foreground")}
                                                asChild
                                            >
                                                <Link
                                                    onClick={() => setOpenMobile(false)}
                                                    href={route("enrollment.faculties-schedules")}
                                                    className="w-full flex items-center">
                                                    <User />
                                                    <span>Faculties</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                        <SidebarMenuItem>
                                            <SidebarMenuButton
                                                tooltip="Subject Schedules"
                                                className={cn("h-10 text-md", currentUrl.startsWith("/subjects-schedules") && "bg-sidebar-accent text-sidebar-accent-foreground")}
                                                asChild
                                            >
                                                <Link
                                                    onClick={() => setOpenMobile(false)}
                                                    href={route("enrollment.subjects-schedules")}
                                                    className="w-full flex items-center">
                                                    <NotebookText />
                                                    <span>Subjects</span>
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    </>
                                )}
                            </SidebarMenu>
                        </SidebarGroup>
                    }
                </>
            )}
        </>
    );
}
