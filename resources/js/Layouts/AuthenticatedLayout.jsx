import { Toaster } from "@/Components/ui/toaster"
import { AppSidebar } from "../Components/AppSidebar"

import {
    SidebarInset,
    SidebarTrigger,
    SidebarProvider,
} from "@/Components/ui/sidebar"

import { Separator } from "@/Components/ui/separator"
import { Head, usePage } from "@inertiajs/react"
import { Button } from "@/Components/ui/button"
import axios from "axios"
import { useState } from "react"

export default function AuthenticatedLayout({ children, title }) {
    const { impersonating } = usePage().props.auth
    const [loading, setLoading] = useState(false)

    const stopImpersonate = async () => {
        setLoading(true)

        await axios.post(route("stop-impersonate"))

        window.location.href = "/users"
    }

    return (
        <SidebarProvider>
            <AppSidebar />

            <SidebarInset>
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

                        <h1 className="min-w-0 flex-1 truncate text-sm font-medium text-foreground md:text-base">
                            {title}
                        </h1>
                    </div>

                    {/* Right */}
                    {impersonating && (
                        <Button
                            disabled={loading}
                            onClick={stopImpersonate}
                            variant="destructive"
                            size="sm"
                            className="ml-3 shrink-0"
                        >
                            {loading
                                ? "Returning..."
                                : "Stop Impersonating"}
                        </Button>
                    )}
                </header>

                <main className="flex-1 overflow-auto p-4">
                    <div className="container mx-auto max-w-7xl">
                        <Head title={title} />

                        {children}
                    </div>
                </main>

                <Toaster />
            </SidebarInset>
        </SidebarProvider>
    )
}