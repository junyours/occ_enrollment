
import { usePage } from "@inertiajs/react";
import { BookOpen, User, Presentation, Building, Calendar1, User2, Library,  UsersIcon, Construction, Hourglass } from "lucide-react";
import { cn } from "@/Lib/Utils";
import { Link } from "@inertiajs/react";
import {
    SidebarGroup,
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

    // Menu items based on user role
    const menuItems = [
        ...(userRole === "registrar"
            ? [
                { name: "School Year", route: "school-year", icon: Calendar1 },
                { name: "Faculty-list", route: "faculty-list", icon: User2 },
                { name: "Student-list", route: "student-list", icon: PiStudent },
                { name: "Classes", route: "classes", icon: Presentation },
                { name: "Rooms", route: "rooms", icon: MdOutlineMeetingRoom },
                { name: "Department", route: "department", icon: Building },
            ]
            : []
        ),
        ...(userRole === "program_head"
            ? [
                { name: "School Year", route: "school-year", icon: Calendar1 },
                { name: "Curriculum", route: "curriculum", icon: BookOpen },
                { name: "Faculty List", route: "faculty-list", icon: User },
                { name: "Classes", route: "classes", icon: Presentation },
            ]
            : []
        ),
        ...(userRole === "student"
            ? [
                { name: "Classes", route: "classes", icon: Presentation },
                { name: "Enrollment Record", route: "enrollment-record", icon: Library },
            ]
            : []
        ),
        ...(userRole === "faculty"
            ? [
                { name: "Classes", route: "classes", icon: Presentation },
            ]
            : []
        ),
        ...(userRole === "evaluator"
            ? [
                { name: "Classes", route: "classes", icon: Presentation },
            ]
            : []
        ),
        ...(userRole === "super_admin"
            ? [
                { name: "Users", route: "users", icon: UsersIcon },
                { name: "Maintenance", route: "maintenance-settings", icon: Construction },
            ]
            : []
        ),
        ...(userRole === "mis"
            ? [
                { name: "Faculty", route: "classes", icon: Presentation },
                { name: "Student", route: "classes", icon: Presentation },
                { name: "Recycle Bin", route: "classes", icon: Presentation },
            ]
            : []
        ),
        ...(userRole === "president"
            ? [
                { name: "Ongoing Enrollment", route: "ongoing-enrollment", icon: Hourglass },
            ]
            : []
        ),
        ...(["registrar", "program_head", "evaluator", "faculty"].includes(user.user_role)
            ? [
            ]
            : []
        ),
    ];

    return (
        <SidebarGroup>
            <SidebarMenu>
                {menuItems.map((item) => (
                    <SidebarMenuItem onClick={() => setOpenMobile(false)} key={item.name} >
                        <SidebarMenuButton
                            tooltip={item.name}
                            className={cn("h-10 text-md", currentUrl.startsWith(`/${item.route}`) && "bg-sidebar-accent text-sidebar-accent-foreground")}
                            asChild
                        >
                            <Link href={route(item.route)} className="w-full flex items-center">
                                <item.icon />
                                <span>{item.name}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
