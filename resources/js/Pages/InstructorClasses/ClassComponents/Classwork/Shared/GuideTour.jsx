import React, { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, CircleHelp, X } from 'lucide-react'

import { Button } from '@/Components/ui/button'
import { cn } from '@/Lib/Utils'

// A step-by-step guide that dims the screen, spotlights one control at a
// time and explains it in a card, like a game's first-run tutorial.

const GAP = 12        // between the spotlight and the card
const EDGE = 16       // the card keeps this far from the edges
const PAD = 6         // around the spotlit element
const CARD_WIDTH = 340

const reducedMotion = () => typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const findTarget = (selector) => (selector ? document.querySelector(selector) : null)

// The area `element` can be seen in: its nearest scrolling ancestor, or the
// window.
function visibleArea(element) {
    for (let node = element.parentElement; node; node = node.parentElement) {
        const overflow = window.getComputedStyle(node).overflowY
        if ((overflow === 'auto' || overflow === 'scroll') && node.scrollHeight > node.clientHeight) {
            const box = node.getBoundingClientRect()
            return { top: Math.max(box.top, 0), bottom: Math.min(box.bottom, window.innerHeight) }
        }
    }

    return { top: 0, bottom: window.innerHeight }
}

// Scrolls only when the control isn't fully in view; a tall one is lined
// up by its top so its heading shows.
function bringIntoView(element) {
    const box = element.getBoundingClientRect()
    const area = visibleArea(element)

    if (box.top >= area.top && box.bottom <= area.bottom) return

    element.scrollIntoView({
        block: box.height > (area.bottom - area.top) * 0.7 ? 'start' : 'center',
        inline: 'nearest',
        behavior: reducedMotion() ? 'auto' : 'smooth',
    })
}

// Where the card goes: beside the spotlight when it fits, along the top or
// bottom edge on phones, centred when nothing is spotlit.
function placeCard(hole, layer, height, preferred) {
    const width = Math.min(CARD_WIDTH, layer.width - EDGE * 2)

    if (!hole) {
        return { left: (layer.width - width) / 2, top: Math.max(EDGE, (layer.height - height) / 2), width }
    }

    if (layer.width < 640) {
        const roomBelow = layer.height - hole.bottom
        return {
            left: EDGE,
            top: roomBelow >= hole.top ? layer.height - height - EDGE : EDGE,
            width: layer.width - EDGE * 2,
        }
    }

    const clampX = (x) => Math.min(Math.max(x, EDGE), layer.width - width - EDGE)
    const clampY = (y) => Math.min(Math.max(y, EDGE), layer.height - height - EDGE)
    const centredX = clampX(hole.left + hole.width / 2 - width / 2)
    const centredY = clampY(hole.top + hole.height / 2 - height / 2)

    const sides = {
        bottom: { left: centredX, top: hole.bottom + GAP, fits: hole.bottom + GAP + height <= layer.height - EDGE },
        top: { left: centredX, top: hole.top - GAP - height, fits: hole.top - GAP - height >= EDGE },
        right: { left: hole.right + GAP, top: centredY, fits: hole.right + GAP + width <= layer.width - EDGE },
        left: { left: hole.left - GAP - width, top: centredY, fits: hole.left - GAP - width >= EDGE },
    }

    const side = [preferred, 'bottom', 'top', 'right', 'left'].find((name) => sides[name]?.fits)

    return side
        ? { left: sides[side].left, top: sides[side].top, width }
        : { left: centredX, top: layer.height - height - EDGE, width }
}

/**
 * steps: [{ target?: CSS selector, title, body, placement?, next? }]
 * onClose(reason): 'done' after the last step, 'skip' otherwise.
 * container: render inside this element (for example a drawer, whose focus
 * trap would block a guide drawn over the page); the page by default.
 */
export default function GuideTour({ steps, open, onClose, container = null }) {
    const [index, setIndex] = useState(0)
    const [geometry, setGeometry] = useState(null)
    const [cardHeight, setCardHeight] = useState(200)

    const layerRef = useRef(null)
    const cardRef = useRef(null)
    const primaryRef = useRef(null)
    const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')

    const step = open ? steps[index] : null
    const last = index === steps.length - 1
    const placed = Boolean(geometry)

    // Bring each step's control into view.
    useEffect(() => {
        const element = findTarget(step?.target)
        if (element) bringIntoView(element)
    }, [step])

    // Follow the control as the page scrolls, resizes or animates.
    useLayoutEffect(() => {
        if (!step) return undefined

        let previous = ''

        const measure = () => {
            const layer = layerRef.current?.getBoundingClientRect()
            if (!layer) return

            const box = findTarget(step.target)?.getBoundingClientRect()
            const hole = box && box.width > 0 && box.height > 0
                ? {
                    top: box.top - layer.top - PAD,
                    left: box.left - layer.left - PAD,
                    width: box.width + PAD * 2,
                    height: box.height + PAD * 2,
                }
                : null

            if (hole) {
                hole.right = hole.left + hole.width
                hole.bottom = hole.top + hole.height
            }

            const next = { layer: { width: layer.width, height: layer.height }, hole }
            const signature = JSON.stringify(next)

            if (signature !== previous) {
                previous = signature
                setGeometry(next)
            }
        }

        measure()

        // Scroll events don't bubble; capturing on window sees every one.
        window.addEventListener('scroll', measure, true)
        window.addEventListener('resize', measure)
        const timer = window.setInterval(measure, 150)

        return () => {
            window.removeEventListener('scroll', measure, true)
            window.removeEventListener('resize', measure)
            window.clearInterval(timer)
        }
    }, [step])

    useLayoutEffect(() => {
        const height = cardRef.current?.offsetHeight
        if (height && height !== cardHeight) setCardHeight(height)
    })

    // Keyboard users land on the main button of every step, once the card
    // is placed (a hidden button can't take focus).
    useEffect(() => {
        if (step && placed) primaryRef.current?.focus({ preventScroll: true })
    }, [step, placed])

    const next = useCallback(() => {
        if (last) onClose('done')
        else setIndex((current) => current + 1)
    }, [last, onClose])

    const back = useCallback(() => setIndex((current) => Math.max(0, current - 1)), [])

    function onKeyDown(event) {
        if (event.key === 'Escape') {
            event.preventDefault()
            event.stopPropagation()
            onClose('skip')
        } else if (event.key === 'ArrowRight') {
            event.preventDefault()
            next()
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault()
            back()
        } else if (event.key === 'Tab') {
            // Keep focus inside the card while the guide is open.
            const focusable = [...cardRef.current.querySelectorAll('button:not([disabled])')]
            const first = focusable[0]
            const lastButton = focusable[focusable.length - 1]

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                lastButton.focus()
            } else if (!event.shiftKey && document.activeElement === lastButton) {
                event.preventDefault()
                first.focus()
            }
        }
    }

    if (!step) return null

    const hole = geometry?.hole ?? null
    const place = geometry ? placeCard(hole, geometry.layer, cardHeight, step.placement) : null

    return createPortal(
        <div
            ref={layerRef}
            className={cn(
                'pointer-events-auto inset-0 z-[70] overflow-hidden',
                container ? 'absolute rounded-[inherit]' : 'fixed'
            )}
        >
            {/* The dimmed screen with a hole over the spotlit control. It
                takes every click, so only the guide's buttons respond. */}
            <svg className="absolute inset-0 size-full" aria-hidden="true">
                <defs>
                    <mask id={`${id}-mask`}>
                        <rect width="100%" height="100%" fill="white" />
                        {hole && (
                            <rect x={hole.left} y={hole.top} width={hole.width} height={hole.height} rx="12" fill="black" />
                        )}
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="black" fillOpacity="0.55" mask={`url(#${id}-mask)`} />
            </svg>

            {hole && (
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded-xl ring-2 ring-primary shadow-[0_0_0_6px_hsl(var(--primary)/0.25)] motion-safe:transition-all motion-safe:duration-200"
                    style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
                />
            )}

            <div
                ref={cardRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${id}-title`}
                aria-describedby={`${id}-body`}
                onKeyDown={onKeyDown}
                className="absolute rounded-xl border border-border bg-popover p-4 text-popover-foreground shadow-2xl motion-safe:transition-[top,left] motion-safe:duration-200"
                style={place ? { top: place.top, left: place.left, width: place.width } : { visibility: 'hidden' }}
            >
                <div className="flex items-start justify-between gap-3">
                    <p className="pt-1 text-xs font-semibold uppercase tracking-wide text-primary">
                        {steps.length > 1 ? `Step ${index + 1} of ${steps.length}` : 'Guide'}
                    </p>
                    <Button type="button" variant="ghost" size="icon" onClick={() => onClose('skip')}
                        aria-label="Close guide" className="-mr-2 -mt-1 size-8 text-muted-foreground">
                        <X className="size-4" aria-hidden="true" />
                    </Button>
                </div>

                <h2 id={`${id}-title`} className="mt-1 text-base font-semibold leading-snug text-foreground">
                    {step.title}
                </h2>
                <div id={`${id}-body`} className="mt-1.5 space-y-2 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5" aria-hidden="true">
                        {steps.length > 1 && steps.map((entry, position) => (
                            <span
                                key={entry.title}
                                className={cn(
                                    'h-1.5 rounded-full motion-safe:transition-all',
                                    position === index ? 'w-4 bg-primary' : 'w-1.5 bg-muted-foreground/30'
                                )}
                            />
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        {index > 0 ? (
                            <Button type="button" variant="ghost" size="sm" onClick={back}>Back</Button>
                        ) : !last && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => onClose('skip')}>Skip</Button>
                        )}
                        <Button ref={primaryRef} type="button" size="sm" onClick={next}>
                            {step.next ?? (last ? 'Got it' : 'Next')}
                            {!last && <ArrowRight className="size-4" aria-hidden="true" />}
                        </Button>
                    </div>
                </div>

                <p className="sr-only" aria-live="polite">
                    {`Step ${index + 1} of ${steps.length}: ${step.title}`}
                </p>
            </div>
        </div>,
        container ?? document.body
    )
}

// The button that replays a guide; every guide uses the same one.
export function GuideButton({ className, ...props }) {
    return (
        <Button type="button" variant="ghost" className={cn('shrink-0 gap-2 text-muted-foreground hover:text-foreground', className)} {...props}>
            <CircleHelp className="size-4" aria-hidden="true" />
            Guide
        </Button>
    )
}

// Guides show once per person and browser; the Guide button replays them.
const seenThisSession = new Set()

function storageKey(guide, userId) {
    return `classwork-guide:v1:${userId}:${guide}`
}

function hasSeen(guide, userId) {
    const key = storageKey(guide, userId)
    if (seenThisSession.has(key)) return true

    try {
        return window.localStorage.getItem(key) === 'done'
    } catch {
        return false
    }
}

function markSeen(guide, userId) {
    const key = storageKey(guide, userId)
    seenThisSession.add(key)

    try {
        window.localStorage.setItem(key, 'done')
    } catch {
        // Blocked storage: the guide still won't repeat in this session.
    }
}

/**
 * Runs one guide: on its own the first time `ready` turns true, and again
 * whenever `start()` is called. Steps whose control isn't on screen are
 * left out. Render `tour` somewhere in the component.
 */
export function useGuide({ guide, userId, steps, ready, container = null }) {
    const [active, setActive] = useState(null)
    const [run, setRun] = useState(0)
    const stepsRef = useRef(steps)
    const returnFocus = useRef(null)
    stepsRef.current = steps

    const start = useCallback(() => {
        const available = stepsRef.current().filter((step) => !step.target || findTarget(step.target))
        if (available.length === 0) return

        returnFocus.current = document.activeElement
        setRun((current) => current + 1)
        setActive(available)
    }, [])

    const close = useCallback(() => {
        markSeen(guide, userId)
        setActive(null)

        // Back to where the person was, such as the Guide button.
        const previous = returnFocus.current
        window.setTimeout(() => previous?.isConnected && previous.focus?.({ preventScroll: true }), 0)
    }, [guide, userId])

    useEffect(() => {
        if (!ready || hasSeen(guide, userId)) return undefined

        // Let the screen settle (data, drawers sliding in) before starting.
        const timer = window.setTimeout(start, 450)
        return () => window.clearTimeout(timer)
    }, [ready, guide, userId, start])

    return {
        start,
        running: Boolean(active),
        // A fresh key per run, so every run starts at step one.
        tour: <GuideTour key={run} steps={active ?? []} open={Boolean(active)} onClose={close} container={container} />,
    }
}
