import React, { useEffect, useState, useCallback, memo, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/Lib/Utils'

const NavButton = memo(({ direction, label, icon: Icon, onClick, disabled, className }) => {
    const isBack = direction === 'back'

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled}
            aria-label={`${label} page`}
            title={label}
            className={cn(
                'group relative inline-flex h-full min-w-14 select-none items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 shadow-md transition-all duration-200',
                'hover:border-zinc-300 hover:bg-zinc-50 hover:shadow',
                'active:scale-[0.98]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2',
                'dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-700 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-300 dark:focus-visible:ring-offset-zinc-950',
                'disabled:pointer-events-none disabled:opacity-50',
                className
            )}
        >
            {isBack && (
                <Icon
                    className="h-6 w-6 transition-transform duration-200 group-hover:-translate-x-0.5 motion-reduce:transform-none"
                    aria-hidden="true"
                />
            )}
            {!isBack && (
                <Icon
                    className="h-6 w-6 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transform-none"
                    aria-hidden="true"
                />
            )}
        </button>
    )
})
NavButton.displayName = 'NavButton'

export default function HistoryButtons({ className, button = 'all' }) {
    const [canGoBack, setCanGoBack] = useState(true)
    const [canGoForward, setCanGoForward] = useState(false)
    const [currentUrl, setCurrentUrl] = useState('')
    const [nextUrl, setNextUrl] = useState('')

    useEffect(() => {
        if (typeof window === 'undefined') return

        const updateState = () => {
            if ('navigation' in window) {
                setCanGoBack(window.navigation.canGoBack)
                setCanGoForward(window.navigation.canGoForward)

                const entries = window.navigation.entries()
                const currentEntry = window.navigation.currentEntry

                if (currentEntry) {
                    setCurrentUrl(currentEntry.url)

                    if (currentEntry.index + 1 < entries.length) {
                        setNextUrl(entries[currentEntry.index + 1].url)
                    } else {
                        setNextUrl('')
                    }
                } else {
                    setCurrentUrl('')
                    setNextUrl('')
                }
            } else {
                setCanGoBack(true)
                setCanGoForward(false)
                setCurrentUrl('')
                setNextUrl('')
            }
        }

        updateState()

        window.addEventListener('popstate', updateState)
        if ('navigation' in window) {
            window.navigation.addEventListener('currententrychange', updateState)
        }

        return () => {
            window.removeEventListener('popstate', updateState)
            if ('navigation' in window) {
                window.navigation.removeEventListener('currententrychange', updateState)
            }
        }
    }, [])

    const handleBack = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.history.back()
        }
    }, [])

    const handleForward = useCallback(() => {
        if (typeof window !== 'undefined') {
            window.history.forward()
        }
    }, [])

    // Only allow forward if there is a next page AND its path starts with the exact current path
    const isForwardDisabled = useMemo(() => {
        if (!canGoForward || !nextUrl || !currentUrl) return true

        try {
            const nextObj = new URL(nextUrl, window.location.origin)
            const currentObj = new URL(currentUrl, window.location.origin)

            // e.g., /enrollment/eccbc... does NOT start with /enrollment/c81e7... -> disables button
            return !nextObj.pathname.startsWith(currentObj.pathname)
        } catch {
            return true
        }
    }, [canGoForward, nextUrl, currentUrl])


    const showBack = ['all', 'back', 'forwardStartsWith'].includes(button)
    const showForward = ['all', 'forward', 'forwardStartsWith'].includes(button)

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {showBack && (
                <NavButton
                    direction="back"
                    label="Back"
                    icon={ChevronLeft}
                    onClick={handleBack}
                    disabled={!canGoBack}
                />
            )}

            {showForward && (
                <NavButton
                    direction="forward"
                    label="Forward"
                    icon={ChevronRight}
                    onClick={handleForward}
                    disabled={isForwardDisabled}
                    className={!canGoForward && !('navigation' in window) ? 'hidden' : 'flex'}
                />
            )}
        </div>
    )
}