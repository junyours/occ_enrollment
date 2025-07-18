import { Link, router, usePage } from "@inertiajs/react";
import { Button } from "@/Components/ui/button";
import { CircleUser, LogOut, Menu, User } from "lucide-react";
import NavBar from "./NavBar";
import { useState } from "react";
import AppLogo from "@/Components/AppLogo";
import { Separator } from "@/Components/ui/separator";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/Components/ui/dropdown-menu";

export default function NavHeader() {
    const [open, setOpen] = useState(false);
    const { auth } = usePage().props;

    return (
        <header className="border-b sticky top-0 z-50 bg-background shadow-lg">
            <div className="container mx-auto p-4 flex items-center justify-between">
                <Link href="/">
                    <div className="flex items-center gap-2">
                        <div className="size-10">
                            <AppLogo />
                        </div>
                        <span className="font-medium text-base">
                            Opol Community College
                        </span>
                    </div>
                </Link>
                <div className="flex items-center gap-4">
                    <div className="flex gap-4 items-center max-md:hidden">
                        <NavBar
                            open={open}
                            onOpenChange={() => setOpen(false)}
                        />
                        <div className="h-5">
                            <Separator orientation="vertical" />
                        </div>
                        {auth ? (
                            <DropdownMenu>
                                <DropdownMenuTrigger>
                                    <CircleUser />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>
                                        {[
                                            "president",
                                            "mis",
                                            "super_admin",
                                        ].includes(auth.user.user_role) ? (
                                            <span className="capitalize">
                                                {auth.user.user_role}
                                            </span>
                                        ) : (
                                            `${auth.user.first_name} ${auth.user.last_name}`
                                        )}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => router.visit("/profile")}
                                    >
                                        <User />
                                        Profile
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        onClick={() => router.post("/logout")}
                                    >
                                        <LogOut />
                                        Logout
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button onClick={() => router.visit("/login")}>
                                Login
                            </Button>
                        )}
                    </div>
                    <div className="md:hidden">
                        <Button
                            onClick={() => setOpen(true)}
                            size="icon"
                            variant="outline"
                        >
                            <Menu />
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
