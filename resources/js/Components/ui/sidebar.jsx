import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority";
import { PanelLeft } from "lucide-react"

import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/Lib/Utils"
import { Button } from "@/Components/ui/button"
import { Input } from "@/Components/ui/input"
import { Separator } from "@/Components/ui/separator"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/Components/ui/sheet"
import { Skeleton } from "@/Components/ui/skeleton"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/Components/ui/tooltip"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "15rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

const SidebarContext = React.createContext(null)

function useSidebar() {
    const context = React.useContext(SidebarContext)
    if (!context) {
        throw new Error("useSidebar must be used within a SidebarProvider.")
    }

    return context
}

const SidebarProvider = React.forwardRef((
    {
        defaultOpen = true,
        open: openProp,
        onOpenChange: setOpenProp,
        className,
        style,
        children,
        ...props
    },
    ref
) => {
    const isMobile = useIsMobile()
    const [openMobile, setOpenMobile] = React.useState(false)
    const [hoverOpen, setHoverOpen] = React.useState(false)
    const [focusOpen, setFocusOpen] = React.useState(false)
    const [popupOpen, setPopupOpen] = React.useState(false)

    // This is the internal state of the sidebar.
    // We use openProp and setOpenProp for control from outside the component.
    const [_open, _setOpen] = React.useState(defaultOpen)
    const open = openProp ?? _open
    const setOpen = React.useCallback((value) => {
        const openState = typeof value === "function" ? value(open) : value
        setHoverOpen(false)
        setFocusOpen(false)
        if (setOpenProp) {
            setOpenProp(openState)
        } else {
            _setOpen(openState)
        }

        // This sets the cookie to keep the sidebar state.
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    }, [setOpenProp, open])

    const closePreview = React.useCallback(() => {
        setOpenMobile(false)
        setHoverOpen(false)
        setFocusOpen(false)
        setPopupOpen(false)
    }, [])

    // Helper to toggle the sidebar.
    const toggleSidebar = React.useCallback(() => {
        return isMobile
            ? setOpenMobile((open) => !open)
            : setOpen((open) => !open);
    }, [isMobile, setOpen, setOpenMobile])

    // Adds a keyboard shortcut to toggle the sidebar.
    React.useEffect(() => {
        const handleKeyDown = (event) => {
            if (
                event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
                (event.metaKey || event.ctrlKey)
            ) {
                event.preventDefault()
                toggleSidebar()
            }
        }

        window.addEventListener("keydown", handleKeyDown)
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar])

    React.useEffect(() => {
        if (isMobile || open) {
            setHoverOpen(false)
            setFocusOpen(false)
        }
    }, [isMobile, open])

    // Temporary expansion never changes the desktop layout or saved preference.
    const expanded = isMobile || open || hoverOpen || focusOpen || popupOpen

    // We add a state so that we can do data-state="expanded" or "collapsed".
    // This makes it easier to style the sidebar with Tailwind classes.
    const state = open ? "expanded" : "collapsed"

    const contextValue = React.useMemo(() => ({
        state,
        open,
        expanded,
        setHoverOpen,
        setFocusOpen,
        setPopupOpen,
        closePreview,
        setOpen,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
    }), [state, open, expanded, closePreview, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar])

    return (
        (<SidebarContext.Provider value={contextValue}>
            <TooltipProvider delayDuration={0}>
                <div
                    style={
                        {
                            "--sidebar-width": SIDEBAR_WIDTH,
                            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
                            ...style
                        }
                    }
                    className={cn(
                        "group/sidebar-wrapper flex min-h-svh w-full has-[[data-variant=inset]]:bg-sidebar",
                        className
                    )}
                    ref={ref}
                    {...props}>
                    {children}
                </div>
            </TooltipProvider>
        </SidebarContext.Provider>)
    );
})
SidebarProvider.displayName = "SidebarProvider"

const Sidebar = React.forwardRef((
    {
        side = "left",
        variant = "sidebar",
        collapsible = "offcanvas",
        expandOnHover = false,
        className,
        children,
        onPointerEnter,
        onPointerLeave,
        onFocusCapture,
        onBlurCapture,
        ...props
    },
    ref
) => {
    const {
        isMobile, state, open, expanded, openMobile, setOpenMobile,
        setHoverOpen, setFocusOpen,
    } = useSidebar()
    const focusCloseTimeout = React.useRef(null)
    const keyboardNavigation = React.useRef(false)
    const canPreview = expandOnHover && collapsible === "icon" && !isMobile && !open
    const overlayExpanded = canPreview && expanded

    React.useEffect(() => {
        const onKeyDown = (event) => {
            if (!event.metaKey && !event.ctrlKey && !event.altKey) keyboardNavigation.current = true
        }
        const onPointerDown = () => {
            keyboardNavigation.current = false
            setFocusOpen(false)
        }
        window.addEventListener("keydown", onKeyDown, true)
        window.addEventListener("pointerdown", onPointerDown, true)
        return () => {
            window.clearTimeout(focusCloseTimeout.current)
            window.removeEventListener("keydown", onKeyDown, true)
            window.removeEventListener("pointerdown", onPointerDown, true)
        }
    }, [setFocusOpen])

    const handleFocus = (event) => {
        onFocusCapture?.(event)
        window.clearTimeout(focusCloseTimeout.current)
        if (canPreview && keyboardNavigation.current && !event.defaultPrevented) setFocusOpen(true)
    }

    const handleBlur = (event) => {
        onBlurCapture?.(event)
        if (event.defaultPrevented) return
        // Let a portalled menu receive focus before deciding the sidebar lost it.
        window.clearTimeout(focusCloseTimeout.current)
        focusCloseTimeout.current = window.setTimeout(() => setFocusOpen(false), 0)
    }

    if (collapsible === "none") {
        return (
            (<div
                className={cn(
                    "flex h-full w-[--sidebar-width] flex-col bg-sidebar text-sidebar-foreground",
                    className
                )}
                ref={ref}
                {...props}>
                {children}
            </div>)
        );
    }

    if (isMobile) {
        return (
            (<Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
                <SheetContent
                    data-sidebar="sidebar"
                    data-mobile="true"
                    className="w-[--sidebar-width] bg-sidebar p-0 text-sidebar-foreground"
                    style={
                        {
                            "--sidebar-ring": "var(--ring)",
                            "--sidebar-width": SIDEBAR_WIDTH_MOBILE
                        }
                    }
                    side={side}>
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <SheetDescription className="sr-only">School navigation and account settings.</SheetDescription>
                    <div className="flex h-full w-full flex-col [&_[data-sidebar=header]]:pr-12">{children}</div>
                </SheetContent>
            </Sheet>)
        );
    }

    return (
        (<div
            ref={ref}
            className="group peer hidden text-sidebar-foreground md:block"
            data-state={state}
            data-collapsible={!expanded ? collapsible : ""}
            data-variant={variant}
            data-side={side}>
            {/* This is what handles the sidebar gap on desktop */}
            <div
                data-sidebar="gap"
                className={cn(
                    "relative h-svh w-[--sidebar-width] shrink-0 bg-transparent transition-[width] duration-200 ease-linear motion-reduce:transition-none",
                    !open && collapsible === "offcanvas" && "w-0",
                    !open && collapsible === "icon" && (
                        variant === "floating" || variant === "inset"
                            ? "w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4))]"
                            : "w-[--sidebar-width-icon]"
                    )
                )} />
            <div
                data-sidebar="container"
                data-overlay={overlayExpanded}
                onPointerEnter={(event) => {
                    onPointerEnter?.(event)
                    if (canPreview && event.pointerType !== "touch" && !event.defaultPrevented) {
                        setHoverOpen(true)
                    }
                }}
                onPointerLeave={(event) => {
                    onPointerLeave?.(event)
                    if (!event.defaultPrevented) setHoverOpen(false)
                }}
                onFocusCapture={handleFocus}
                onBlurCapture={handleBlur}
                className={cn(
                    "fixed inset-y-0 z-10 hidden h-svh w-[--sidebar-width] transition-[left,right,width] duration-200 ease-linear motion-reduce:transition-none md:flex",
                    overlayExpanded && "z-[60] drop-shadow-xl",
                    side === "left"
                        ? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
                        : "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
                    // Adjust the padding for floating and inset variants.
                    variant === "floating" || variant === "inset"
                        ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)_+_theme(spacing.4)_+2px)]"
                        : "group-data-[collapsible=icon]:w-[--sidebar-width-icon] group-data-[side=left]:border-r group-data-[side=right]:border-l",
                    className
                )}
                {...props}>
                <div
                    data-sidebar="sidebar"
                    className="flex h-full w-full flex-col bg-sidebar [--sidebar-ring:var(--ring)] group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow">
                    {children}
                </div>
            </div>
        </div>)
    );
})
Sidebar.displayName = "Sidebar"

const SidebarTrigger = React.forwardRef(({ className, onClick, ...props }, ref) => {
    const { toggleSidebar } = useSidebar()

    return (
        (<Button
            ref={ref}
            data-sidebar="trigger"
            variant="ghost"
            size="icon"
            className={cn("h-7 w-7", className)}
            onClick={(event) => {
                onClick?.(event)
                toggleSidebar()
            }}
            {...props}>
            <PanelLeft />
            <span className="sr-only">Toggle Sidebar</span>
        </Button>)
    );
})
SidebarTrigger.displayName = "SidebarTrigger"

const SidebarRail = React.forwardRef(({ className, ...props }, ref) => {
    const { toggleSidebar } = useSidebar()

    return (
        (<button
            ref={ref}
            data-sidebar="rail"
            aria-label="Toggle Sidebar"
            tabIndex={-1}
            onClick={toggleSidebar}
            title="Toggle Sidebar"
            className={cn(
                "absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex",
                "[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize",
                "[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
                "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full group-data-[collapsible=offcanvas]:hover:bg-sidebar",
                "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
                "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
                className
            )}
            {...props} />)
    );
})
SidebarRail.displayName = "SidebarRail"

const SidebarInset = React.forwardRef(({ className, ...props }, ref) => {
    return (
        (<main
            ref={ref}
            className={cn(
                "relative flex min-h-svh flex-1 flex-col bg-background",
                "peer-data-[variant=inset]:min-h-[calc(100svh-theme(spacing.4))] md:peer-data-[variant=inset]:m-2 md:peer-data-[state=collapsed]:peer-data-[variant=inset]:ml-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow",
                className
            )}
            {...props} />)
    );
})
SidebarInset.displayName = "SidebarInset"

const SidebarInput = React.forwardRef(({ className, ...props }, ref) => {
    return (
        (<Input
            ref={ref}
            data-sidebar="input"
            className={cn(
                "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                className
            )}
            {...props} />)
    );
})
SidebarInput.displayName = "SidebarInput"

const SidebarHeader = React.forwardRef(({ className, ...props }, ref) => {
    return (
        (<div
            ref={ref}
            data-sidebar="header"
            className={cn("flex flex-col gap-2 p-2", className)}
            {...props} />)
    );
})
SidebarHeader.displayName = "SidebarHeader"

const SidebarFooter = React.forwardRef(({ className, ...props }, ref) => {
    return (
        (<div
            ref={ref}
            data-sidebar="footer"
            className={cn("flex flex-col gap-2 p-2", className)}
            {...props} />)
    );
})
SidebarFooter.displayName = "SidebarFooter"

const SidebarSeparator = React.forwardRef(({ className, ...props }, ref) => {
    return (
        (<Separator
            ref={ref}
            data-sidebar="separator"
            className={cn("mx-2 w-auto bg-sidebar-border", className)}
            {...props} />)
    );
})
SidebarSeparator.displayName = "SidebarSeparator"

const SidebarContent = React.forwardRef(({ className, ...props }, ref) => {
    return (
        (<div
            ref={ref}
            data-sidebar="content"
            className={cn(
                "flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-width:thin]",
                className
            )}
            {...props} />)
    );
})
SidebarContent.displayName = "SidebarContent"

const SidebarGroup = React.forwardRef(({ className, ...props }, ref) => {
    return (
        (<div
            ref={ref}
            data-sidebar="group"
            className={cn("relative flex w-full min-w-0 shrink-0 flex-col p-2", className)}
            {...props} />)
    );
})
SidebarGroup.displayName = "SidebarGroup"

const SidebarGroupLabel = React.forwardRef(({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "div"

    return (
        (<Comp
            ref={ref}
            data-sidebar="group-label"
            className={cn(
                "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
                "group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0",
                className
            )}
            {...props} />)
    );
})
SidebarGroupLabel.displayName = "SidebarGroupLabel"

const SidebarGroupAction = React.forwardRef(({ className, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
        (<Comp
            ref={ref}
            data-sidebar="group-action"
            className={cn(
                "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
                // Increases the hit area of the button on mobile.
                "after:absolute after:-inset-2 after:md:hidden",
                "group-data-[collapsible=icon]:hidden",
                className
            )}
            {...props} />)
    );
})
SidebarGroupAction.displayName = "SidebarGroupAction"

const SidebarGroupContent = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        data-sidebar="group-content"
        className={cn("w-full text-sm", className)}
        {...props} />
))
SidebarGroupContent.displayName = "SidebarGroupContent"

const SidebarMenu = React.forwardRef(({ className, ...props }, ref) => (
    <ul
        ref={ref}
        data-sidebar="menu"
        className={cn("flex w-full min-w-0 flex-col", className)}
        {...props} />
))
SidebarMenu.displayName = "SidebarMenu"

const SidebarMenuItem = React.forwardRef(({ className, ...props }, ref) => (
    <li
        ref={ref}
        data-sidebar="menu-item"
        className={cn("group/menu-item relative", className)}
        {...props} />
))
SidebarMenuItem.displayName = "SidebarMenuItem"

const sidebarMenuButtonVariants = cva(
    "peer/menu-button flex w-full items-center gap-3 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-ring focus-visible:ring-2 hover:bg-sidebar-foreground/5 data-[active=true]:hover:bg-sidebar-accent disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:!p-2 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "transition-colors duration-150 motion-reduce:transition-none",
                outline:
                    "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
            },
            size: {
                default: "h-10 text-sm",
                sm: "h-7 text-xs",
                lg: "h-12 text-sm group-data-[collapsible=icon]:!p-0",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

const SidebarMenuButton = React.forwardRef((
    {
        asChild = false,
        isActive = false,
        variant = "default",
        size = "default",
        tooltip,
        className,
        ...props
    },
    ref
) => {
    const Comp = asChild ? Slot : "button"
    const { isMobile, expanded } = useSidebar()
    
    const button = (
        <Comp
            ref={ref}
            data-sidebar="menu-button"
            data-size={size}
            data-active={isActive}
            className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
            {...props} />
    )

    if (!tooltip) {
        return button
    }

    if (typeof tooltip === "string") {
        tooltip = {
            children: tooltip,
        }
    }

    return (
        (<Tooltip>
            <TooltipTrigger asChild>{button}</TooltipTrigger>
            <TooltipContent
                side="right"
                align="center"
                hidden={expanded || isMobile}
                {...tooltip} />
        </Tooltip>)
    );
})
SidebarMenuButton.displayName = "SidebarMenuButton"

const SidebarMenuAction = React.forwardRef(({ className, asChild = false, showOnHover = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"

    return (
        (<Comp
            ref={ref}
            data-sidebar="menu-action"
            className={cn(
                "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
                // Increases the hit area of the button on mobile.
                "after:absolute after:-inset-2 after:md:hidden",
                "peer-data-[size=sm]/menu-button:top-1",
                "peer-data-[size=default]/menu-button:top-1.5",
                "peer-data-[size=lg]/menu-button:top-2.5",
                "group-data-[collapsible=icon]:hidden",
                showOnHover &&
                "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-0",
                className
            )}
            {...props} />)
    );
})
SidebarMenuAction.displayName = "SidebarMenuAction"

const SidebarMenuBadge = React.forwardRef(({ className, ...props }, ref) => (
    <div
        ref={ref}
        data-sidebar="menu-badge"
        className={cn(
            "pointer-events-none absolute right-1 flex h-5 min-w-5 select-none items-center justify-center rounded-md px-1 text-xs font-medium tabular-nums text-sidebar-foreground",
            "peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
            "peer-data-[size=sm]/menu-button:top-1",
            "peer-data-[size=default]/menu-button:top-1.5",
            "peer-data-[size=lg]/menu-button:top-2.5",
            "group-data-[collapsible=icon]:hidden",
            className
        )}
        {...props} />
))
SidebarMenuBadge.displayName = "SidebarMenuBadge"

const SidebarMenuSkeleton = React.forwardRef(({ className, showIcon = false, ...props }, ref) => {
    // Random width between 50 to 90%.
    const width = React.useMemo(() => {
        return `${Math.floor(Math.random() * 40) + 50}%`;
    }, [])

    return (
        (<div
            ref={ref}
            data-sidebar="menu-skeleton"
            className={cn("flex h-8 items-center gap-2 rounded-md px-2", className)}
            {...props}>
            {showIcon && (
                <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" />
            )}
            <Skeleton
                className="h-4 max-w-[--skeleton-width] flex-1"
                data-sidebar="menu-skeleton-text"
                style={
                    {
                        "--skeleton-width": width
                    }
                } />
        </div>)
    );
})
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton"

const SidebarMenuSub = React.forwardRef(({ className, ...props }, ref) => (
    <ul
        ref={ref}
        data-sidebar="menu-sub"
        className={cn(
            "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
            "group-data-[collapsible=icon]:hidden",
            className
        )}
        {...props} />
))
SidebarMenuSub.displayName = "SidebarMenuSub"

const SidebarMenuSubItem = React.forwardRef(({ ...props }, ref) => <li ref={ref} {...props} />)
SidebarMenuSubItem.displayName = "SidebarMenuSubItem"

const SidebarMenuSubButton = React.forwardRef(
    ({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
        const Comp = asChild ? Slot : "a"

        return (
            (<Comp
                ref={ref}
                data-sidebar="menu-sub-button"
                data-size={size}
                data-active={isActive}
                className={cn(
                    "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
                    "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
                    size === "sm" && "text-xs",
                    size === "md" && "text-sm",
                    "group-data-[collapsible=icon]:hidden",
                    className
                )}
                {...props} />)
        );
    }
)
SidebarMenuSubButton.displayName = "SidebarMenuSubButton"

export {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupAction,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarInput,
    SidebarInset,
    SidebarMenu,
    SidebarMenuAction,
    SidebarMenuBadge,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    SidebarProvider,
    SidebarRail,
    SidebarSeparator,
    SidebarTrigger,
    useSidebar,
}
