import { usePage } from "@inertiajs/react";

import {
    BookOpen,
    User,
    Presentation,
    Building,
    Calendar1,
    User2,
    Library,
    UsersIcon,
    Construction,
    Hourglass,
    FileText,
    RefreshCcw,
    Archive,
    BarChart2,
    KeyRound,
    NotebookText,
    ClipboardList,
    ListTodo,
    FileQuestion,
    FolderPlus,
    User2Icon,
    ListChecks,
    BookOpenText,
    Inbox,
    Trash2,
    FileChartColumn,
    BookCheck,
    FileBadge,
    Handshake,
    FlaskConical,
} from "lucide-react";

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
import { PiStudent } from "react-icons/pi";
import { MdOutlineMeetingRoom } from "react-icons/md";
import SchoolYearPicker from "./SchoolYearPicker";

export function NavMain() {
    const { user, courses } = usePage().props.auth;
    const userRole = user.user_role;
    const currentUrl = usePage().url;
    const { setOpenMobile } = useSidebar();

    const menuSections = [];

    switch (userRole) {
        case "program_head":
            menuSections.push(
                {
                    label: "Academic",
                    items: [
                        { name: "School Year", route: "school-year", icon: Calendar1 },
                        { name: "Curriculum", route: "curriculum", icon: BookOpen },
                        { name: "Classes", route: "classes", icon: Presentation },
                    ],
                },
                {
                    label: "People",
                    items: [
                        { name: "Faculty List", route: "faculty-list", icon: User },
                    ],
                },
                {
                    label: "Grades",
                    items: [
                        { name: "Subjects", route: "subjects-list", icon: BookOpenText },
                        { name: "Requests", route: "requests", icon: Inbox },
                        { name: "Submitted Grades", route: "submitted-grades", icon: FileText },
                    ],
                },
                {
                    label: "Evalaution Result",
                    items: [
                        { name: "Faculty Result", route: "ph.result", icon: User },
                    ],
                },
            );
            break;

        case "registrar":
            menuSections.push(
                {
                    label: "Academic",
                    items: [
                        { name: "Classes", route: "classes", icon: Presentation },
                        { name: "School Year", route: "school-year", icon: Calendar1 },
                        { name: "Department", route: "department", icon: Building },
                    ],
                },
                {
                    label: "People",
                    items: [
                        { name: "Faculty List", route: "faculty-list", icon: User2 },
                        { name: "Student List", route: "student-list", icon: PiStudent },
                    ],
                },
                {
                    label: "Grades",
                    items: [
                        { name: "Verified Grades", route: "verified-grades", icon: FileText },
                        { name: "Change Request", route: "change-requests", icon: RefreshCcw },
                    ]
                },
                {
                    label: "Reports",
                    items: [
                        { name: "Enrollment Record", route: "enrollment-record", icon: Library },
                        { name: "Promotional Report", route: "promotional-report", icon: BarChart2 },
                        { name: "Subjects", route: "subjects-report", icon: NotebookText },
                        { name: "Faculty", route: "faculties-report", icon: User },
                    ],
                },
                {
                    label: "Others",
                    items: [
                        { name: "Rooms", route: "rooms", icon: MdOutlineMeetingRoom },
                    ],
                }
            );
            break;

        case "student":
            menuSections.push({
                label: "Academic",
                items: [
                    { name: "Classes", route: "classes", icon: Presentation },
                    { name: "Enrollment Record", route: "enrollment-record", icon: Library },
                    { name: "Faculty Evaluation", route: "student.evaluation", icon: ListTodo },
                ],
            });
            break;

        case "faculty":
            menuSections.push(
                {
                    label: "Academic",
                    items: [
                        { name: "Classes", route: "classes", icon: Presentation },
                    ],
                },
                {
                    label: "Grades",
                    items: [
                        { name: "Subjects", route: "subjects-list", icon: BookOpenText },
                        { name: "Requests", route: "requests", icon: Inbox },
                    ],
                },
                {
                    label: "Evalaution Result",
                    items: [
                        { name: "Faculty Result", route: "fac.faculty.report", icon: User },
                    ],
                }
            );
            break;

        case "evaluator":
            menuSections.push({
                label: "Academic",
                items: [
                    { name: "Classes", route: "classes", icon: Presentation },
                ],
            });
            break;

        case "super_admin":
            menuSections.push({
                label: "Administration",
                items: [
                    { name: "Users", route: "users", icon: UsersIcon },
                    { name: "Maintenance", route: "maintenance-settings", icon: Construction },
                    { name: "Reset Credentials", route: "reset-credentials", icon: KeyRound },
                ],
            });
            break;

        case "mis":
            menuSections.push(
                {
                    label: "People",
                    items: [
                        { name: "Users", route: "mis-users", icon: UsersIcon },
                        // { name: "Faculty", route: "mis-faculty-list", icon: User },
                        // { name: "Student", route: "mis-student-list", icon: PiStudent },
                    ],
                },
                {
                    label: "Others",
                    items: [
                        { name: "Recycle Bin", route: "recycle-bin", icon: Presentation },
                    ],
                }
            );
            break;

        case "president":
            menuSections.push({
                label: "President",
                items: [
                    { name: "Enrollment", route: "president.ongoing-enrollment", icon: Hourglass },
                ],
            });
            break;

        case "announcement_admin":
            menuSections.push({
                items: [
                    { name: "Announcement", route: "announcement", icon: Hourglass },
                ],
            });
            break;

        case "guidance":
            menuSections.push(
                {
                    label: "Dashboard",
                    items: [
                        { name: "Dashboard", route: "guidance.dashboard", icon: Presentation },
                    ],
                },
                {
                    label: "Evaluation Manager",
                    items: [
                        { name: "Criteria", route: "guidance.criteria", icon: ListChecks },
                        { name: "Questionnaires", route: "guidance.questionnaire", icon: FileQuestion },
                        { name: "Evaluation", route: "guidance.evaluation", icon: FolderPlus },
                    ],
                },
                {
                    label: "People",
                    items: [
                        { name: "Faculty", route: "guidance.faculty.index", icon: User2Icon },
                        { name: "Faculty Ranking", route: "guidance.faculty.ranking", icon: FileChartColumn },
                        { name: "Student", route: "guidance.student.index", icon: ClipboardList },
                    ],
                },
                {
                    label: "Archives",
                    items: [
                        { name: "Archives", route: "guidance.archive", icon: Archive },
                    ],
                },
                {
                    label: "Trash",
                    items: [
                        { name: "Trash", route: "guidance.trash", icon: Trash2 }
                    ],
                });
            break;

        case "librarian":
            menuSections.push({
                label: "Clearance",
                items: [
                    { name: "Approval Sheet", route: "approval-sheets", icon: BookCheck },
                ],
            });
            break;

        case "ojt_coordinator":
            menuSections.push({
                label: "Clearance",
                items: [
                    { name: "MOA", route: "classes", icon: Handshake },
                    { name: "OJT Cert", route: "classes", icon: FileBadge },
                ],
            });
            break;

        case "research_coordinator":
            menuSections.push({
                label: "Clearance",
                items: [
                    { name: "Approval Sheet", route: "classes", icon: FlaskConical },
                ],
            });
            break;

        case "vpaa":
            menuSections.push(
                {
                    label: "Dashboard",
                    items: [
                        {
                            name: "Dashboard",
                            route: "vdashboard",
                            icon: Presentation,
                        },
                    ],
                },
                {
                    label: "People",
                    items: [
                        { name: "Faculty", route: "vpaa.faculty.index", icon: User2Icon },
                        { name: "Faculty Ranking", route: "vpaa.faculty.ranking", icon: FileChartColumn },
                        { name: "Student", route: "vpaa.student.index", icon: ClipboardList },
                    ],
                },
                {
                    label: "Archives",
                    items: [
                        { name: "Archives", route: "vpaa.archive", icon: Archive },
                    ],
                },
            );
            break;

        case "gened_coordinator":
            menuSections.push({
                label: "Courses",
                items: courses.map(course => ({
                    name: course.course_name_abbreviation,
                    route: 'gened-coordinator.sections',
                    params: { hashedCourseID: course.hashed_course_id },
                    icon: BookOpen,
                })),
            });
            break;

        default:
            break;
    }

    return (
        <SidebarGroup>
            {userRole === "gened_coordinator" && (
                <SidebarMenu className="space-y-0.5 mb-4">
                    <SidebarGroupLabel className="p-0 text-xs uppercase text-muted-foreground h-min flex flex-col">
                        <SchoolYearPicker layout="horizontal-select-only" />
                    </SidebarGroupLabel>
                </SidebarMenu>
            )}

            {menuSections.map((section) => (
                <SidebarMenu key={section.label} className="space-y-0.5 mb-4">
                    <SidebarGroupLabel className="px-3 text-xs uppercase text-muted-foreground h-min">
                        {section.label}
                    </SidebarGroupLabel>
                    {section.items.map((item) => {
                        const itemUrl = route(item.route, item.params)
                        const itemPath = new URL(itemUrl).pathname
                        const isActive = currentUrl == itemPath || currentUrl.startsWith(`${itemPath}/`)

                        return (
                            <SidebarMenuItem
                                key={item.name}
                                onClick={() => setOpenMobile(false)}
                            >
                                <SidebarMenuButton
                                    tooltip={item.name}
                                    className={cn(
                                        "h-10 text-md",
                                        isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                                    )}
                                    asChild
                                >
                                    <Link
                                        href={itemUrl}
                                        className="flex items-center w-full gap-2"
                                    >
                                        <item.icon size={18} />
                                        <span>{item.name}</span>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        )
                    })}
                </SidebarMenu>
            ))}
        </SidebarGroup>
    );
}
