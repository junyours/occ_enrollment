import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useQuery } from '@tanstack/react-query'
import {
    Download,
    Loader2,
    RotateCw,
    X,
} from 'lucide-react'
import FileViewer from '@file-viewer/react'
import { configuredFileViewerRenderers } from 'virtual:file-viewer-renderers'
import viewerThemeCss from './fileViewerTheme.css?inline'
import useIsMobile from './useIsMobile'

import {
    Button,
    buttonVariants,
} from '@/Components/ui/button'

import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/Components/ui/drawer'

import { useTheme } from '@/Components/theme-provider'

import {
    ErrorNotice,
    useClasswork,
} from './api'

// Formats the bundled renderers handle (see vite.config.js). Everything
// else, including HTML, SVG, email and archives, is download-only so
// uploaded files never run as markup inside the app.
const PREVIEWABLE = new Set([
    'pdf',
    'doc', 'docx', 'odt', 'rtf',
    'xls', 'xlsx', 'csv', 'ods',
    'ppt', 'pptx', 'ppsx', 'odp',
    'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp',
])

// The whole file is downloaded before rendering.
const MAX_PREVIEW_BYTES = 25 * 1024 * 1024

function extensionOf(name) {
    const value = String(name || '')

    return value.includes('.')
        ? value.split('.').pop().toLowerCase()
        : ''
}

function megabytes(bytes) {
    return `${Math.round(bytes / (1024 * 1024))} MB`
}

const STATUS_MESSAGES = {
    401: 'Your session has ended. Refresh the page and sign in again.',
    403: 'You don’t have access to this file.',
    404: 'This file is no longer available.',
}

// Error bodies arrive as Blobs because the request asks for a Blob.
async function readBlobError(error) {
    const response = error?.response

    if (!response) {
        return error
    }

    let data = null

    if (response.data instanceof Blob) {
        try {
            data = JSON.parse(await response.data.text())
        } catch {
            data = null
        }
    }

    response.data = data?.message
        ? data
        : {
            message: STATUS_MESSAGES[response.status]
                || 'The preview could not be opened. You can still download the original file.',
        }

    return error
}

let viewerThemeSheet = null

// The viewer renders inside its own shadow root, which app CSS cannot
// reach. Attach the shadcn mapping there; adding it twice is a no-op.
function adoptViewerTheme(host) {
    const root = host?.shadowRoot

    if (!root) {
        return
    }

    if ('adoptedStyleSheets' in root && 'replaceSync' in CSSStyleSheet.prototype) {
        if (!viewerThemeSheet) {
            viewerThemeSheet = new CSSStyleSheet()
            viewerThemeSheet.replaceSync(viewerThemeCss)
        }

        if (!root.adoptedStyleSheets.includes(viewerThemeSheet)) {
            root.adoptedStyleSheets = [...root.adoptedStyleSheets, viewerThemeSheet]
        }

        return
    }

    if (!root.querySelector('style[data-app-theme]')) {
        const style = document.createElement('style')
        style.dataset.appTheme = ''
        style.textContent = viewerThemeCss
        root.appendChild(style)
    }
}

function Notice({ children }) {
    return (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center text-sm text-muted-foreground">
            {children}
        </div>
    )
}

export default function FilePreview({ file, onClose }) {
    const { base, key } = useClasswork()
    const { theme } = useTheme()
    const isMobile = useIsMobile()

    const [open, setOpen] = useState(false)
    const [viewerVersion, setViewerVersion] = useState(0)
    const [progress, setProgress] = useState(0)
    const viewerFrameRef = useRef(null)

    const applyViewerTheme = useCallback(() => {
        adoptViewerTheme(viewerFrameRef.current?.firstElementChild)
    }, [])

    useEffect(() => {
        setOpen(true)
    }, [])

    const downloadUrl = `${base}/files/${file.id}`
    const size = Number(file.size) || 0
    const extension = extensionOf(file.name)
    const supported = PREVIEWABLE.has(extension)
    const tooLarge = size > MAX_PREVIEW_BYTES
    const canPreview = supported && !tooLarge

    const query = useQuery({
        queryKey: [
            ...key,
            'file-preview',
            String(file.id),
        ],

        enabled: open && canPreview,
        staleTime: 0,
        gcTime: 0,
        refetchOnWindowFocus: false,

        retry: (count, error) => (
            count < 1
            && (
                !error.response
                || error.response.status >= 500
            )
        ),

        queryFn: async ({ signal }) => {
            setProgress(0)

            try {
                const { data } = await axios.get(downloadUrl, {
                    signal,
                    responseType: 'blob',
                    timeout: 120_000,
                    // Errors come back as JSON, not an HTML error page.
                    headers: {
                        Accept: 'application/json',
                    },
                    onDownloadProgress: (event) => {
                        const total = event.total || size

                        if (total) {
                            setProgress(
                                Math.min(99, Math.round((event.loaded / total) * 100))
                            )
                        }
                    },
                })

                return new File([data], file.name, {
                    type: file.mime_type || data.type || '',
                })
            } catch (error) {
                throw await readBlobError(error)
            }
        },
    })

    const viewerOptions = useMemo(() => ({
        // 'extend' keeps the core's lite renderer (images) and adds the
        // bundled ones; 'replace' dropped it, so images could not preview.
        rendererMode: 'extend',
        builtinRenderers: 'lite',
        autoRenderers: false,
        renderers: configuredFileViewerRenderers,
        theme: theme === 'dark' ? 'dark' : 'light',
        locale: 'en-US',
        ai: false,
        // On phones the floating toolbar cannot fit search, and PDFs already
        // have their own page/zoom toolbar. Printing is off everywhere: no
        // button, and the viewer refuses a print started any other way.
        toolbar: isMobile && extension === 'pdf'
            ? false
            : {
                position: 'bottom-right',
                download: false,
                exportHtml: false,
                theme: false,
                search: !isMobile,
                print: false,
                beforePrint: () => false,
            },
    }), [theme, isMobile, extension])

    // The viewer attaches its shadow root while mounting, before this runs.
    useEffect(() => {
        applyViewerTheme()
    }, [applyViewerTheme, query.data, viewerVersion])

    return (
        <Drawer
            open={open}
            swipeDirection="down"
            showSwipeHandle={false}
            disablePointerDismissal
            onOpenChange={(next, details) => {
                if (!next) {
                    details.cancel()
                } else {
                    setOpen(next)
                }
            }}
            onOpenChangeComplete={(next) => {
                if (!next) {
                    onClose()
                }
            }}
        >
            <DrawerContent
                data-base-ui-swipe-ignore
                className="min-w-0 overflow-hidden data-[swipe-axis=y]:h-[94dvh] data-[swipe-axis=y]:max-h-[94dvh]"
            >
                <DrawerHeader className="border-b p-4 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
                    <div className="flex min-w-0 items-center justify-between gap-3">
                        <DrawerTitle
                            className="min-w-0 truncate"
                            title={file.name}
                        >
                            {file.name}
                        </DrawerTitle>

                        <div className="flex shrink-0 items-center gap-2">
                            <a
                                href={downloadUrl}
                                aria-label="Download original"
                                className={buttonVariants({
                                    variant: 'outline',
                                    size: 'sm',
                                })}
                            >
                                <Download className="size-4" />

                                <span className="hidden sm:inline">
                                    Download original
                                </span>
                            </a>

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                aria-label="Close preview"
                                onClick={() => setOpen(false)}
                            >
                                <X className="size-4" />
                            </Button>
                        </div>
                    </div>

                    {/* <DrawerDescription>
                        File preview
                    </DrawerDescription> */}
                </DrawerHeader>

                {!supported && (
                    <Notice>
                        <p className="font-medium text-foreground">
                            Preview isn’t available for this file type.
                        </p>
                        <p>Download the original to open it.</p>
                    </Notice>
                )}

                {supported && tooLarge && (
                    <Notice>
                        <p className="font-medium text-foreground">
                            This file is too large to preview ({megabytes(size)}).
                        </p>
                        <p>
                            Files up to {megabytes(MAX_PREVIEW_BYTES)} open
                            here. Download the original to view it.
                        </p>
                    </Notice>
                )}

                {canPreview && query.isPending && (
                    <div
                        role="status"
                        className="flex flex-1 items-center justify-center gap-2 p-10 text-sm text-muted-foreground"
                    >
                        <Loader2 className="size-4 animate-spin" />

                        {query.isPaused
                            ? 'Waiting for internet…'
                            : progress > 0
                                ? `Loading file… ${progress}%`
                                : 'Opening preview…'}
                    </div>
                )}

                {canPreview && query.isError && (
                    <div className="space-y-3 p-5">
                        <ErrorNotice error={query.error} />

                        <Button
                            type="button"
                            variant="outline"
                            disabled={query.isFetching}
                            onClick={() => query.refetch()}
                        >
                            Retry preview
                        </Button>
                    </div>
                )}

                {canPreview && query.data && !query.isError && (
                    <>
                        <div
                            ref={viewerFrameRef}
                            className="relative min-h-0 flex-1 bg-muted"
                        >
                            <FileViewer
                                key={viewerVersion}
                                file={query.data}
                                filename={file.name}
                                size={query.data.size}
                                options={viewerOptions}
                                onStateChange={applyViewerTheme}
                                className="absolute inset-0"
                                style={{ height: '100%', minHeight: 0 }}
                            />
                        </div>

                        {/* <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t p-3">
                            <p className="max-w-3xl text-xs text-muted-foreground">
                                Office files are drawn in your browser, so
                                complex layouts may look slightly different.
                                Download the original if something looks off.
                            </p>

                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setViewerVersion(
                                        (value) => value + 1
                                    )
                                }}
                            >
                                <RotateCw className="size-4" />
                                Reload viewer
                            </Button>
                        </div> */}
                    </>
                )}
            </DrawerContent>
        </Drawer>
    )
}
