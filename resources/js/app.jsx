import "../css/app.css";
import "./bootstrap";
import "froala-editor/css/froala_style.min.css";
import "froala-editor/css/froala_editor.pkgd.min.css";

import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/Components/theme-provider";
import { Toaster } from "@/Components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const appName = import.meta.env.VITE_APP_NAME || "Opol Community College";

const queryClient = new QueryClient();

createInertiaApp({
    title: (title) => `${title ? `${title} - ` : ''}Opol Community College`,
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
