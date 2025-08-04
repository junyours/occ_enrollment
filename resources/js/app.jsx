import "../css/app.css";
import "./bootstrap";
import "froala-editor/css/froala_style.min.css";
import "froala-editor/css/froala_editor.pkgd.min.css";

import { createInertiaApp } from "@inertiajs/react";
import { resolvePageComponent } from "laravel-vite-plugin/inertia-helpers";
import { createRoot } from "react-dom/client";
import { ThemeProvider } from "@/Components/theme-provider";
import { Toaster } from "@/Components/ui/sonner";

const appName = import.meta.env.VITE_APP_NAME || "Opol Community College";

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob("./Pages/**/*.jsx")
        ),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(
            <ThemeProvider>
                <App {...props} />
                <Toaster position="top-right" />
            </ThemeProvider>
        );
    },
    progress: {
        color: "#559bd8",
    },
});
