
import { usePage } from "@inertiajs/react";
import { BookOpen, User, Presentation, Building, Calendar1, User2, Library } from "lucide-react";
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
    const currentUrl = usePage().url;
    const { setOpenMobile } = useSidebar();

    // Define menu items based on user role
    const menuItems = [
        ...(user.user_role === "registrar"
            ? [
                { name: "Department", route: "department", icon: Building },
                { name: "School year", route: "school-year", icon: Calendar1 },
                { name: "Classes", route: "classes", icon: Presentation },
                { name: "Faculty-list", route: "faculty-list", icon: User2 },
                { name: "Student-list", route: "student-list", icon: PiStudent },
                { name: "Rooms", route: "rooms", icon: MdOutlineMeetingRoom },
            ]
            : []
        ),
        ...(user.user_role === "program_head"
            ? [
                { name: "Classes", route: "classes", icon: Presentation },
                { name: "Curriculum", route: "curriculum", icon: BookOpen },
                { name: "Faculty List", route: "faculty-list", icon: User },
            ]
            : []
        ),
        ...(user.user_role === "student"
            ? [
                { name: "Classes", route: "classes", icon: Presentation },
                { name: "Enrollment Record", route: "enrollment-record", icon: Library },
            ]
            : []
        ),
        ...(user.user_role === "faculty"
            ? [
                { name: "Classes", route: "classes", icon: Presentation },
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
                                <item.icon className="mr-2" />
                                <span>{item.name}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
