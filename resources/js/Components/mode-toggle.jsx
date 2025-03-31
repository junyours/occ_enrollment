"use client";

import * as React from "react";
import { Check, Palette } from "lucide-react"; // ✅ Icons for selected theme
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/components/theme-provider";

export function ModeToggle() {
    const { theme, setTheme } = useTheme();

    const themes = [
        { name: "Default", value: "light" },
        { name: "Dark", value: "dark" },
        { name: "Blue", value: "blue" },
        { name: "Yellow", value: "yellow" },
        { name: "Maroon", value: "maroon" },
    ];

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    {/* <Palette className="h-4 w-4 mr-2" /> */}
                    {themes.find((t) => t.value === theme)?.name || "Theme"}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40">
                <DropdownMenuLabel>Choose Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {themes.map((t) => (
                    <DropdownMenuItem key={t.value} onClick={() => setTheme(t.value)}>
                        {t.name}
                        {theme === t.value && <Check className="h-4 w-4 ml-auto" />}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
