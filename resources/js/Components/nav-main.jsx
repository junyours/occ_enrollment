import { usePage } from "@inertiajs/react";
import { CalendarRange, BookOpen, User, Presentation } from "lucide-react";
import { cn } from "@/Lib/Utils";
import { Link } from "@inertiajs/react";
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/Components/ui/sidebar";

export function NavMain() {
    const { user } = usePage().props.auth;
    const currentUrl = usePage().url;
    const { setOpenMobile } = useSidebar();

    // Define menu items based on user role
    const menuItems = [
        ...(user.user_role === "registrar" || user.user_role === "program_head"
            ? [{ name: "School Year", route: "dashboard", icon: CalendarRange }]
            : []
        ),
        ...(user.user_role === "program_head"
            ? [
                { name: "Curriculum", route: "curriculum", icon: BookOpen },
                { name: "Faculty List", route: "faculty-list", icon: User },
            ]
            : []
        ),
        ...(["registrar", "program_head", "evaluator", "faculty"].includes(user.user_role)
            ? [{ name: "Classes", route: "classes", icon: Presentation }]
            : []
        ),
    ];

    return (
        <SidebarGroup>
            <SidebarMenu>
                {menuItems.map((item, index) => (
                    <SidebarMenuItem onClick={() => setOpenMobile(false)}  key={index}>
                        <SidebarMenuButton
                            tooltip={item.name}
                            className={cn("h-10 text-md", currentUrl.startsWith(`/${item.route}`) && "bg-sidebar-accent text-sidebar-accent-foreground")}
                            asChild
                        >
                            <Link href={route(item.route)} className="w-full flex items-center" >
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
