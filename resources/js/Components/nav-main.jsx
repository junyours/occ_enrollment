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

export function NavMain() {
    const { user } = usePage().props.auth;
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
                        { name: "Submitted Grades", route: "submitted-grades", icon: FileText },
                    ],
                }
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
                });
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
                    // { name: "Enrollment", route: "enrollment", icon: Hourglass },
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
            menuSections.push({
                items: [
                    { name: "Dashboard", route: "guidance.dashboard", icon: Presentation },
                    { name: "Criteria", route: "guidance.criteria", icon: ListChecks },
                    { name: "Questionnaires", route: "guidance.questionnaire", icon: FileQuestion },
                    { name: "Evaluation", route: "guidance.evaluation", icon: FolderPlus },
                    { name: "Faculty", route: "guidance.faculty.index", icon: User2Icon },
                    { name: "Student", route: "guidance.student.index", icon: ClipboardList },
                    { name: "Archives", route: "guidance.dashboard", icon: Archive }
                ],
            });
            break;

        default:
            break;
    }

    return (
        <SidebarGroup>
            {menuSections.map((section) => (
                <SidebarMenu key={section.label} className="space-y-0.5 mb-4">
                    <SidebarGroupLabel className="text-xs uppercase text-muted-foreground px-3 h-min">
                        {section.label}
                    </SidebarGroupLabel>
                    {section.items.map((item) => (
                        <SidebarMenuItem onClick={() => setOpenMobile(false)} key={item.name}>
                            <SidebarMenuButton
                                tooltip={item.name}
                                className={cn(
                                    "h-10 text-md",
                                    currentUrl.startsWith(`/${item.route}`) &&
                                    "bg-sidebar-accent text-sidebar-accent-foreground"
                                )}
                                asChild
                            >
                                <Link
                                    href={route(item.route)}
                                    className="w-full flex items-center gap-2"
                                >
                                    <item.icon size={18} />
                                    <span>{item.name}</span>
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    ))}
                </SidebarMenu>
            ))}
        </SidebarGroup>
    );
}
