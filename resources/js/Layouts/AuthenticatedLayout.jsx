import { Toaster } from "@/Components/ui/toaster"
import { AppSidebar } from "../Components/AppSidebar"

import {
    SidebarInset,
    SidebarTrigger,
    SidebarProvider,
} from "@/Components/ui/sidebar"

export default function AuthenticatedLayout({ children }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="sticky top-0 py-2 px-4 flex shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 w-max">
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                </header>
                <div className="flex-grow p-4 overflow-auto">
                    {children}
                </div>
                <Toaster />
            </SidebarInset>
        </SidebarProvider>
    );
}
