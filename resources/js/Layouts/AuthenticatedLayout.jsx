import { Toaster } from "@/Components/ui/toaster"
import { AppSidebar } from "../Components/AppSidebar"

import {
    SidebarInset,
    SidebarTrigger,
    SidebarProvider,
} from "@/Components/ui/sidebar"

import { usePage } from "@inertiajs/react"
import { Button } from "@/Components/ui/button";
import axios from "axios";
import { useState } from "react";

export default function AuthenticatedLayout({ children }) {

    const { impersonating } = usePage().props.auth;
    const [loading, setLoading] = useState(false)

    const stopImpersonate = async () => {
        setLoading(true);
        await axios.post(route('stop-impersonate'))
        window.location.href = '/users';
    }

    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className={`sticky top-0 py-2 px-4 flex justify-between shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 ${impersonating ? 'w-full' : 'w-max'}`}>
                    <div className="flex items-center gap-2">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                    {impersonating && (
                        <Button
                            disabled={loading}
                            onClick={stopImpersonate}
                            type="submit"
                            variant="destructive"
                            size="sm"
                            className='w-32'
                        >
                            {loading ? 'Returning...' : 'Stop Impersonating'}
                        </Button>
                    )}
                </header>
                <div className="flex-grow p-4 overflow-auto">
                    <div className="container mx-auto max-w-6xl">
                        {children}
                    </div>
                </div>
                <Toaster />
            </SidebarInset>
        </SidebarProvider>
    );
}
