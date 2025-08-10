import {
    NavigationMenu,
    NavigationMenuItem,
    NavigationMenuLink,
    NavigationMenuList,
    navigationMenuTriggerStyle,
} from "@/Components/ui/navigation-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link, router, usePage } from "@inertiajs/react";
import { Drawer, DrawerContent } from "@/Components/ui/drawer";
import { Button } from "../../ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/Components/ui/accordion";
import { UserCircle } from "lucide-react";

const items = [
    {
        title: "Home",
        url: "/",
    },
    {
        title: "Enrollment",
        url: "/enrollment",
    },
    {
        title: "Announcement",
        url: "/announcement",
    },
];

export default function NavBar({ open, onOpenChange }) {
    const isMobile = useIsMobile();
    const currentPath = window.location.pathname;
    const { auth } = usePage().props;

    return isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <div className="p-4 space-y-4">
                    {auth && (
                        <Accordion type="single" collapsible>
                            <AccordionItem value="item-1">
                                <AccordionTrigger className="focus:no-underline">
                                    <span className="flex items-center gap-2">
                                        <UserCircle />
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
                                    </span>
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="flex flex-col gap-1">
                                        <Button
                                            onClick={() => {
                                                if (isMobile) {
                                                    router.visit("/profile");
                                                    onOpenChange(false);
                                                }
                                            }}
                                            variant="ghost"
                                        >
                                            Profile
                                        </Button>
                                        <Button
                                            onClick={() => {
                                                if (isMobile) {
                                                    router.post("/logout");
                                                    onOpenChange(false);
                                                }
                                            }}
                                            variant="outline"
                                            className="w-full text-destructive border-destructive"
                                        >
                                            Logout
                                        </Button>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    )}
                    <div className="flex flex-col gap-1">
                        {items.map((item, index) => (
                            <Link key={index} href={item.url}>
                                <Button
                                    onClick={() => {
                                        if (isMobile) {
                                            onOpenChange(false);
                                        }
                                    }}
                                    variant={
                                        currentPath === item.url
                                            ? "default"
                                            : "ghost"
                                    }
                                    className="w-full"
                                >
                                    {item.title}
                                </Button>
                            </Link>
                        ))}
                        {!auth && (
                            <Button
                                onClick={() => {
                                    if (isMobile) {
                                        router.visit("/login");
                                        onOpenChange(false);
                                    }
                                }}
                                variant="outline"
                                className="w-full text-primary border-primary"
                            >
                                Login
                            </Button>
                        )}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    ) : (
        <div className="flex items-center gap-1.5">
            {items.map((item, index) => (
                <NavigationMenu key={index}>
                    <NavigationMenuList>
                        <NavigationMenuItem key={item.title}>
                            <NavigationMenuLink
                                asChild
                                className={navigationMenuTriggerStyle({
                                    className:
                                        currentPath === item.url
                                            ? "rounded-none text-primary hover:text-primary focus:text-primary border-b-2 border-primary focus:bg-transparent"
                                            : "",
                                })}
                            >
                                <Link href={item.url}>{item.title}</Link>
                            </NavigationMenuLink>
                        </NavigationMenuItem>
                    </NavigationMenuList>
                </NavigationMenu>
            ))}
        </div>
    );
}
