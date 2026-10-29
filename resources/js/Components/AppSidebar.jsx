import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
import { TeamSwitcher } from "./team-switcher"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
} from "@/Components/ui/sidebar"
import { NavEnrollment } from "./NavEnrollment"

export function AppSidebar({ ...props }) {
    return (
        <Sidebar collapsible="icon" expandOnHover {...props}>
            <SidebarHeader>
                <TeamSwitcher />
            </SidebarHeader>
            <SidebarContent role="navigation" aria-label="Main navigation">
                <NavEnrollment />
                <NavMain />
            </SidebarContent>
            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    )
}
