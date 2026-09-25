"use client"

import * as React from "react"
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer"
import { cn } from "@/Lib/Utils"

const DrawerContext = React.createContext(null)

function useDrawer() {
    const context = React.useContext(DrawerContext)

    if (!context) {
        throw new Error("useDrawer must be used within a Drawer.")
    }

    return context
}

function Drawer({
    modal = true,
    showSwipeHandle = false,
    snapPoints,
    swipeDirection = "down",
    ...props
}) {
    const hasSnapPoints = snapPoints != null && snapPoints.length > 0

    const contextValue = React.useMemo(
        () => ({
            hasSnapPoints,
            modal,
            showSwipeHandle,
            swipeDirection,
        }),
        [hasSnapPoints, modal, showSwipeHandle, swipeDirection]
    )

    return (
        <DrawerContext.Provider value={contextValue}>
            <DrawerPrimitive.Root
                data-slot="drawer"
                modal={modal}
                snapPoints={snapPoints}
                swipeDirection={swipeDirection}
                {...props}
            />
        </DrawerContext.Provider>
    )
}

function DrawerTrigger(props) {
    return (
        <DrawerPrimitive.Trigger
            data-slot="drawer-trigger"
            {...props}
        />
    )
}

function DrawerPortal(props) {
    return (
        <DrawerPrimitive.Portal
            data-slot="drawer-portal"
            {...props}
        />
    )
}

function DrawerClose(props) {
    return (
        <DrawerPrimitive.Close
            data-slot="drawer-close"
            {...props}
        />
    )
}
function DrawerOverlay({
    className,
    ...props
}) {
    return (
        <DrawerPrimitive.Backdrop
            data-slot="drawer-overlay"
            className={cn(
                "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
                "transition-opacity duration-300",
                "data-[starting-style]:opacity-0",
                "data-[ending-style]:opacity-0",
                className
            )}
            {...props}
        />
    )
}

function DrawerSwipeHandle({
    className,
    ...props
}) {
    return (
        <div
            data-slot="drawer-swipe-handle"
            aria-hidden="true"
            className={cn(
                "relative z-10 flex shrink-0 cursor-grab transition-opacity duration-200 group-data-nested-drawer-open/drawer-popup:opacity-0 group-data-nested-drawer-swiping/drawer-popup:opacity-100 group-data-[swipe-axis=x]/drawer-popup:h-full group-data-[swipe-axis=x]/drawer-popup:w-3 group-data-[swipe-axis=x]/drawer-popup:items-center group-data-[swipe-axis=y]/drawer-popup:h-3 group-data-[swipe-axis=y]/drawer-popup:w-full group-data-[swipe-axis=y]/drawer-popup:justify-center group-data-[swipe-direction=down]/drawer-popup:items-end group-data-[swipe-direction=left]/drawer-popup:order-last group-data-[swipe-direction=left]/drawer-popup:justify-start group-data-[swipe-direction=right]/drawer-popup:justify-end group-data-[swipe-direction=up]/drawer-popup:order-last group-data-[swipe-direction=up]/drawer-popup:items-start after:block after:shrink-0 after:rounded-full after:bg-muted group-data-[swipe-axis=x]/drawer-popup:after:h-[100px] group-data-[swipe-axis=x]/drawer-popup:after:w-1.5 group-data-[swipe-axis=y]/drawer-popup:after:h-1.5 group-data-[swipe-axis=y]/drawer-popup:after:w-[100px] active:cursor-grabbing",
                className
            )}
            {...props}
        />
    )
}

function DrawerContent({
    className,
    children,
    ...props
}) {
    const {
        hasSnapPoints,
        modal,
        showSwipeHandle,
        swipeDirection,
    } = useDrawer()

    const swipeAxis =
        swipeDirection === "down" || swipeDirection === "up"
            ? "y"
            : "x"

    return (
        <DrawerPortal data-slot="drawer-portal">
            {modal === true && (
                <DrawerOverlay
                    data-snap-points={
                        hasSnapPoints ? "" : undefined
                    }
                />
            )}

            <DrawerPrimitive.Viewport
                data-slot="drawer-viewport"
                data-modal={modal}
                className="pointer-events-none fixed inset-0 z-50 select-none data-[modal=true]:pointer-events-auto"
            >
                <DrawerPrimitive.Popup
                    data-slot="drawer-popup"
                    data-swipe-axis={swipeAxis}
                    data-snap-points={
                        hasSnapPoints ? "" : undefined
                    }
                    className={cn(
                        // Base
                        "group/drawer-popup pointer-events-auto fixed z-50 flex flex-col border bg-background shadow-xl m-2 rounded-xl",

                        // Animation
                        "transition-transform duration-300 ease-out",

                        // Vertical drawer
                        "data-[swipe-axis=y]:inset-x-0",
                        "data-[swipe-axis=y]:max-h-[calc(100dvh-6rem)]",

                        // Horizontal drawer
                        "data-[swipe-axis=x]:inset-y-0",
                        "data-[swipe-axis=x]:w-[75%]",
                        "data-[swipe-axis=x]:sm:w-[33rem]",

                        // Bottom
                        "data-[swipe-direction=down]:bottom-0",
                        "data-[swipe-direction=down]:data-[starting-style]:translate-y-full",
                        "data-[swipe-direction=down]:data-[ending-style]:translate-y-full",

                        // Top
                        "data-[swipe-direction=up]:top-0",
                        "data-[swipe-direction=up]:data-[starting-style]:-translate-y-full",
                        "data-[swipe-direction=up]:data-[ending-style]:-translate-y-full",

                        // Left
                        "data-[swipe-direction=left]:left-0",
                        "data-[swipe-direction=left]:data-[starting-style]:-translate-x-full",
                        "data-[swipe-direction=left]:data-[ending-style]:-translate-x-full",

                        // Right
                        "data-[swipe-direction=right]:right-0",
                        "data-[swipe-direction=right]:data-[starting-style]:translate-x-full",
                        "data-[swipe-direction=right]:data-[ending-style]:translate-x-full",

                        // Disable animation while actively swiping
                        "data-[swiping]:transition-none",

                        className
                    )}
                    {...props}
                >
                    {showSwipeHandle && (
                        <DrawerSwipeHandle />
                    )}

                    <DrawerPrimitive.Content
                        data-slot="drawer-content"
                        className={cn(
                            "flex min-h-0 flex-1 flex-col overflow-hidden overscroll-contain rounded-[inherit] transition-opacity duration-300 ease-[cubic-bezier(0.45,1.005,0,1.005)] select-text group-data-nested-drawer-open/drawer-popup:opacity-0 group-data-nested-drawer-swiping/drawer-popup:opacity-100 group-data-swiping/drawer-popup:select-none"
                        )}
                    >
                        {children}
                    </DrawerPrimitive.Content>
                </DrawerPrimitive.Popup>
            </DrawerPrimitive.Viewport>
        </DrawerPortal>
    )
}

function DrawerHeader({
    className,
    ...props
}) {
    return (
        <div
            data-slot="drawer-header"
            className={cn(
                "flex shrink-0 flex-col gap-0.5 p-4 pb-0 group-data-[swipe-axis=y]/drawer-popup:text-center md:gap-1.5 md:text-left",
                className
            )}
            {...props}
        />
    )
}

function DrawerFooter({
    className,
    ...props
}) {
    return (
        <div
            data-slot="drawer-footer"
            className={cn(
                "mt-auto flex shrink-0 flex-col gap-2 p-4 pt-0",
                className
            )}
            {...props}
        />
    )
}

function DrawerTitle({
    className,
    ...props
}) {
    return (
        <DrawerPrimitive.Title
            data-slot="drawer-title"
            className={cn(
                "font-heading text-base font-medium text-foreground",
                className
            )}
            {...props}
        />
    )
}

function DrawerDescription({
    className,
    ...props
}) {
    return (
        <DrawerPrimitive.Description
            data-slot="drawer-description"
            className={cn(
                "text-sm text-balance text-muted-foreground",
                className
            )}
            {...props}
        />
    )
}

export {
    Drawer,
    DrawerPortal,
    DrawerOverlay,
    DrawerSwipeHandle,
    DrawerTrigger,
    DrawerClose,
    DrawerContent,
    DrawerHeader,
    DrawerFooter,
    DrawerTitle,
    DrawerDescription,
}