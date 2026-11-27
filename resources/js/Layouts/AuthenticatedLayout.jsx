import { Toaster } from "@/Components/ui/toaster"
import { AppSidebar } from "../Components/AppSidebar"
import { SidebarInset, SidebarTrigger, SidebarProvider, } from "@/Components/ui/sidebar"
import { Separator } from "@/Components/ui/separator"
import { Head, usePage } from "@inertiajs/react"
import { Button } from "@/Components/ui/button"
import axios from "axios"
import { useState } from "react"
import AttendanceSyncProvider from "@/Pages/InstructorClasses/ClassComponents/AttendancePartials/AttendanceSyncProvider"
import NotificationBell from "@/Components/NotificationBell"

// stickyContent: lets `position: sticky` inside the page stick to the window while scrolling.
// overflow-auto on <main> makes it the sticky container (and it never scrolls itself), so
// pages that opt in get overflow-x-clip instead; their wide tables keep their own scroll.
export default function AuthenticatedLayout({ children, title, headerContent, fullWidth = false, stickyContent = false }) {
    const { impersonating } = usePage().props.auth
    const [loading, setLoading] = useState(false)
    const { auth } = usePage().props

    const stopImpersonate = async () => {
        setLoading(true)

        await axios.post(route("stop-impersonate"))

        window.location.href = "/users"
    }

    return (
        <SidebarProvider>
            <AppSidebar />

            {/* min-w-0: a long header title must truncate, not widen the page on phones */}
            <SidebarInset className="min-w-0">
                <header
                    className="
                        sticky top-0 z-50
                        flex h-14 shrink-0 items-center
                        border-b border-border
                        bg-background/95
                        px-4
                        backdrop-blur-sm
                        supports-[backdrop-filter]:bg-background/80
                    "
                >
                    {/* Left */}
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                        <SidebarTrigger className="-ml-1 shrink-0" />

                        <Separator
                            orientation="vertical"
                            className="h-4 shrink-0"
                        />

                        {headerContent ?? (
                            <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground md:text-base">
                                {title}
                            </h1>
                        )}
                    </div>

                    {/* Right */}
                    <div className="ml-2 flex shrink-0 items-center gap-2">
                        <NotificationBell />

                        {impersonating && (
                            <Button
                                disabled={loading}
                                onClick={stopImpersonate}
                                variant="destructive"
                                size="sm"
                                className="ml-1 shrink-0"
                            >
                                {loading
                                    ? "Returning..."
                                    : "Stop Impersonating"}
                            </Button>
                        )}
                    </div>
                </header>

                <main className={`flex-1 p-4 ${stickyContent ? "overflow-x-clip" : "overflow-auto"}`}>
                    <div className={fullWidth ? "mx-auto w-full" : "container mx-auto max-w-7xl"}>
                        <Head title={title} />

                        <AttendanceSyncProvider userId={auth.user.id}>
                            {children}
                        </AttendanceSyncProvider>
                    </div>
                </main>
                <Toaster />
            </SidebarInset>
        </SidebarProvider>
    )
}
