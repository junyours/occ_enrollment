import React from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Minimize2, WifiOff } from 'lucide-react'

import { Button } from '@/Components/ui/button'

import { typingIn } from './attendanceUtils'

// The student list on its own, filling the screen: the toolbar and keyboard
// shortcuts above it, the rates note and marked count below. Esc or the
// button leaves it.
export default function RosterFullScreen({
    open,
    onExit,
    title,
    description,
    offline,
    onOpenAutoFocus,
    onCloseAutoFocus,
    children,
}) {
    return (
        <DialogPrimitive.Root open={open} onOpenChange={(next) => { if (!next) onExit() }}>
            <DialogPrimitive.Portal>
                <DialogPrimitive.Content
                    // attendance-panel: the rows lay out by this view's width.
                    className="attendance-panel fixed inset-0 z-50 flex flex-col gap-3 overflow-y-auto bg-background p-3 text-foreground focus:outline-none sm:p-4"
                    onOpenAutoFocus={onOpenAutoFocus}
                    onCloseAutoFocus={onCloseAutoFocus}
                    // Esc in the remarks box closes the box, not full screen.
                    onEscapeKeyDown={(event) => { if (typingIn(event.target)) event.preventDefault() }}
                    // It covers the whole screen, so a click outside it is on
                    // something like a toast, which mustn't close it.
                    onInteractOutside={(event) => event.preventDefault()}
                >
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                        <div className="min-w-0">
                            <DialogPrimitive.Title className="font-semibold">{title}</DialogPrimitive.Title>
                            <DialogPrimitive.Description className="text-xs text-muted-foreground">
                                {description}
                            </DialogPrimitive.Description>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {offline && (
                                <span className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                                    <WifiOff aria-hidden="true" className="size-3.5" />
                                    Offline · keep this tab open
                                </span>
                            )}
                            <Button type="button" variant="outline" onClick={onExit}>
                                <Minimize2 aria-hidden="true" className="size-4" />
                                Exit full screen
                            </Button>
                        </div>
                    </div>

                    {children}
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    )
}
