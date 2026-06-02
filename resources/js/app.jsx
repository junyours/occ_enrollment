import "../css/app.css";
import "./bootstrap";

import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/Components/theme-provider";
import { Toaster } from "@/Components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "@inertiajs/react";

router.on("invalid", () => {
    window.location.reload();
});

const appName = import.meta.env.VITE_APP_NAME || "Opol Community College";

const queryClient = new QueryClient();

createInertiaApp({
    title: (title) => `${title ? `${title} | ` : ''}SIS - Opol Community College`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob("./Pages/**/*.jsx")
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ThemeProvider>
                <QueryClientProvider client={queryClient}>
                    <App {...props} />
                </QueryClientProvider>
                <Toaster position="top-right" />
            </ThemeProvider>
        );
    },
    progress: {
        color: "#559bd8",
    },
});
