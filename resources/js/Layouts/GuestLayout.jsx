import { Link, usePage } from "@inertiajs/react"
import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
} from "@/components/ui/navigation-menu"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { User } from "lucide-react"
import OCC_LOGO from '../../images/OCC_LOGO.png'

export default function GuestLayout({ children }) {
    const { auth } = usePage().props

    return (
        <div className="h-svh w-screen flex flex-col">
            {/* Header */}
            <header className="w-full border-b mb-4">
                <div className="max-w-screen-lg mx-auto px-6 py-4 flex items-center justify-between">

                    {/* Logo / Title */}
                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg text-sidebar-primary-foreground mr-2">
                        <img src={OCC_LOGO} alt="illustration" className="illustration" />
                    </div>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate text-xl">Opol Community College</span>
                    </div>

                    {/* Navigation + Auth Controls */}
                    <div className="flex items-center gap-6">
                        <NavigationMenu>
                            <NavigationMenuList className="space-x-4">
                                <NavigationMenuItem>
                                    <NavigationMenuLink asChild>
                                        <Link
                                            href="/"
                                            className="text-sm font-medium transition-colors hover:text-primary"
                                        >
                                            Home
                                        </Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink asChild>
                                        <Link
                                            href="/ongoing-enrollment"
                                            className="text-sm font-medium transition-colors hover:text-primary"
                                        >
                                            Ongoing Enrollment
                                        </Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                                <NavigationMenuItem>
                                    <NavigationMenuLink asChild>
                                        <Link
                                            href="/announcement"
                                            className="text-sm font-medium transition-colors hover:text-primary"
                                        >
                                            Announcement
                                        </Link>
                                    </NavigationMenuLink>
                                </NavigationMenuItem>
                            </NavigationMenuList>
                        </NavigationMenu>

                        {/* Authenticated vs Guest */}
                        {auth?.user ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                                        <User className="w-4 h-4" />
                                        {auth.user.name}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem asChild>
                                        <Link href="/profile">View Profile</Link>
                                    </DropdownMenuItem>
                                    {/* Optional: Add logout */}
                                    <DropdownMenuItem asChild>
                                        <Link href="/logout" method="post" as="button">Logout</Link>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button asChild variant="outline" size="sm">
                                <Link href="/login">Login</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex items-center justify-center px-5">
                {children}
            </main>
        </div>
    )
}
