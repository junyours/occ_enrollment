import { cn } from "@/Lib/Utils";
import OCC_LOGO from "../../images/OCC_LOGO.png";

export default function AppLogo({ size = "md", className = "" }) {
    // Extended sizes using Tailwind classes
    const sizeClasses = {
        sm: "w-16 h-16",             // 64px
        md: "w-24 h-24",             // 96px
        lg: "w-32 h-32",             // 128px
        xl: "w-48 h-48",             // 192px
        "2xl": "w-64 h-64",          // 256px
        "3xl": "w-80 h-80",          // 320px
        "4xl": "w-96 h-96",          // 384px
        "5xl": "w-[28rem] h-[28rem]", // 448px (Custom arbitrary value)
        "6xl": "w-[32rem] h-[32rem]", // 512px (Custom arbitrary value)
        full: "w-full h-auto"
    };

    // Fallback to "md" if an invalid size is passed
    const appliedSize = sizeClasses[size] || sizeClasses.md;

    return (
        <img
            src={OCC_LOGO}
            className={cn('object-contain', appliedSize, className)}
            draggable="false"
            alt="occ-logo"
        />
    );
}
