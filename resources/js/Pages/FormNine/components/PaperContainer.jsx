import React, { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import './PaperContainer.css';

const MIN_ZOOM = 0.2;
const MAX_ZOOM = 2.5;
const VIEWPORT_PADDING = 12;
const clampZoom = (value) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));

function PreviewIcon({ name }) {
    const paths = {
        minus: <path d="M5 12h14" />,
        plus: <path d="M5 12h14M12 5v14" />,
        previous: <path d="m14 6-6 6 6 6" />,
        next: <path d="m10 6 6 6-6 6" />,
        width: <><path d="M4 5v14M20 5v14M4 12h16m-12-4-4 4 4 4m8-8 4 4-4 4" /></>,
        page: <><path d="M7 3h7l4 4v14H7zM14 3v5h4" /><path d="M10 12h5M10 16h5" /></>,
        fullscreen: <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5" />,
        restore: <path d="M3 8h5V3m8 0v5h5M8 21v-5H3m18 0h-5v5" />,
        print: <><path d="M7 8V3h10v5M7 17H4V8h16v9h-3" /><path d="M7 14h10v7H7zM17 11h.01" /></>,
    };
    return <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function readScrollAnchor(viewport, pages, zoom) {
    if (!pages.length || !zoom) return null;
    const probe = (viewport.scrollTop + viewport.clientHeight * 0.25 - VIEWPORT_PADDING) / zoom;
    let index = 0;
    for (let page = 1; page < pages.length; page += 1) {
        if (pages[page].top <= probe) index = page;
    }
    return {
        index,
        last: index === pages.length - 1,
        offset: viewport.scrollTop / zoom - pages[index].top,
        left: viewport.scrollLeft / zoom,
    };
}

function sameLayout(previous, next) {
    if (previous.hasPages !== next.hasPages) return false;
    if (['width', 'height', 'viewportWidth', 'viewportHeight'].some((key) => Math.abs(previous[key] - next[key]) > 0.5)) return false;
    return previous.pages.length === next.pages.length && previous.pages.every((page, index) => (
        Math.abs(page.top - next.pages[index].top) <= 0.5 &&
        Math.abs(page.height - next.pages[index].height) <= 0.5 &&
        Math.abs(page.width - next.pages[index].width) <= 0.5
    ));
}

export default function PaperContainer({ children, documentRef, documentKey, format = 'form9', onPrint, canPrint = false, printLabel, printDisabledReason = '', toolbarExtra, hasDocument = true }) {
    const previewRef = useRef(null);
    const fullscreenButtonRef = useRef(null);
    const fullscreenModeRef = useRef('');
    const fullscreenRequestRef = useRef(0);
    const fullscreenFocusRef = useRef(null);
    const restoreFullscreenFocusRef = useRef(true);
    const mountedRef = useRef(true);
    const printReasonId = useId();
    const [fullscreenMode, setFullscreenMode] = useState('');
    const viewportRef = useRef(null);
    const contentRef = useRef(null);
    const zoomRef = useRef(1);
    const previousZoomRef = useRef(1);
    const anchorRef = useRef(null);
    const pagesRef = useRef([]);
    const measuredLayoutRef = useRef(null);
    const viewedAnchorRef = useRef(null);
    const reflowAnchorRef = useRef(null);
    const resetPendingRef = useRef(true);
    const realPagesRef = useRef(false);
    const documentAvailableRef = useRef(false);
    const printStateRef = useRef(null);
    const [zoomMode, setZoomMode] = useState('fit-page');
    const [manualZoom, setManualZoom] = useState(0.8);
    const [currentPage, setCurrentPage] = useState(1);
    const [layout, setLayout] = useState({ width: 0, height: 0, viewportWidth: 0, viewportHeight: 0, pages: [], hasPages: false });

    const documentAvailable = !!hasDocument && layout.hasPages;
    documentAvailableRef.current = documentAvailable;
    const totalPages = Math.max(1, layout.pages.length);
    const pageIndex = Math.min(currentPage - 1, totalPages - 1);
    const firstPage = layout.pages[0];
    const lastPage = layout.pages[layout.pages.length - 1];
    const outsidePageHeight = firstPage && lastPage
        ? Math.max(0, firstPage.top) + Math.max(0, layout.height - lastPage.top - lastPage.height)
        : 0;
    const visiblePageHeight = (layout.pages[pageIndex]?.height || layout.height) + outsidePageHeight;
    const availableWidth = Math.max(1, layout.viewportWidth - VIEWPORT_PADDING * 2);
    const availableHeight = Math.max(1, layout.viewportHeight - VIEWPORT_PADDING * 2);
    const widthFit = layout.width > 0 ? availableWidth / layout.width : 1;
    const pageFit = visiblePageHeight > 0 ? Math.min(widthFit, availableHeight / visiblePageHeight) : widthFit;
    const requestedZoom = zoomMode === 'manual' ? manualZoom : zoomMode === 'fit-width' ? widthFit : pageFit;
    // Fit modes may need less than the manual zoom floor on short screens.
    const zoom = !hasDocument ? 1 : zoomMode === 'manual' ? clampZoom(requestedZoom) : Math.max(0.01, Math.min(MAX_ZOOM, requestedZoom));
    const isFullscreen = !!fullscreenMode;
    fullscreenModeRef.current = fullscreenMode;
    zoomRef.current = zoom;
    pagesRef.current = documentAvailable ? layout.pages : [];
    realPagesRef.current = documentAvailable;

    useLayoutEffect(() => {
        // A different student or format starts a new document, rather than a reflow.
        viewedAnchorRef.current = null;
        reflowAnchorRef.current = null;
        anchorRef.current = null;
        measuredLayoutRef.current = null;
        resetPendingRef.current = true;
        previousZoomRef.current = zoomRef.current;
        setCurrentPage(1);
        setZoomMode('fit-page');
        viewportRef.current?.scrollTo({ top: 0, left: 0 });
    }, [format, documentKey]);

    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        const content = contentRef.current;
        if (!viewport || !content) return;
        let frame = 0;
        let disposed = false;

        const measure = () => {
            frame = 0;
            if (disposed) return;
            const printDocument = documentRef?.current || content;
            const scale = zoomRef.current || 1;
            const origin = content.getBoundingClientRect();
            const printRect = printDocument.getBoundingClientRect();
            const documentTop = Math.max(0, (printRect.top - origin.top) / scale);
            const documentLeft = Math.max(0, (printRect.left - origin.left) / scale);
            const width = Math.max(content.offsetWidth, printDocument.offsetWidth + documentLeft, printDocument.scrollWidth + documentLeft);
            let height = Math.max(content.offsetHeight, printDocument.offsetHeight + documentTop, printDocument.scrollHeight + documentTop);
            const explicitPages = Array.from(printDocument.querySelectorAll('.tor-page, .form9-page'));
            let pages;
            let hasPages = false;

            if (explicitPages.length) {
                hasPages = true;
                pages = explicitPages.map((page) => {
                    const rect = page.getBoundingClientRect();
                    return { top: Math.max(0, (rect.top - origin.top) / scale), height: rect.height / scale, width: rect.width / scale };
                });
                const last = explicitPages[explicitPages.length - 1];
                const lastPage = pages[pages.length - 1];
                const bottomGap = Number.parseFloat(getComputedStyle(last).marginBottom) || 0;
                height = Math.max(height, lastPage.top + lastPage.height + bottomGap);
            } else {
                const paper = printDocument.matches?.('[data-paper-pages]') ? printDocument : printDocument.querySelector('[data-paper-pages]');
                if (paper) {
                    // Form 9 starts with a provisional one-page measurement.
                    hasPages = canPrint;
                    const count = Math.max(1, Number.parseInt(paper.dataset.paperPages, 10) || 1);
                    const paperRect = paper.getBoundingClientRect();
                    const paperTop = Math.max(0, (paperRect.top - origin.top) / scale);
                    const specifiedHeight = Number(paper.dataset.paperHeight);
                    const pageHeight = specifiedHeight > 0 ? specifiedHeight : paperRect.height / scale / count;
                    pages = Array.from({ length: count }, (_, index) => ({ top: paperTop + pageHeight * index, height: pageHeight, width: paperRect.width / scale }));
                } else {
                    pages = [{ top: documentTop, height: printDocument.offsetHeight || height, width: printDocument.offsetWidth || width }];
                }
            }

            const next = { width, height, viewportWidth: viewport.clientWidth, viewportHeight: viewport.clientHeight, pages, hasPages };
            const previous = measuredLayoutRef.current;
            if (previous?.hasPages && hasPages && !resetPendingRef.current && !sameLayout(previous, next)) {
                // Use the last stable view before a shorter canvas can clamp scrollTop.
                reflowAnchorRef.current ||= viewedAnchorRef.current || readScrollAnchor(viewport, previous.pages, previousZoomRef.current);
            }
            if (hasPages) resetPendingRef.current = false;
            measuredLayoutRef.current = next;
            setLayout((previous) => sameLayout(previous, next) ? previous : next);
        };
        const scheduleMeasure = () => {
            if (!disposed && !frame) frame = requestAnimationFrame(measure);
        };

        measure();
        const resizeObserver = new ResizeObserver(scheduleMeasure);
        resizeObserver.observe(viewport);
        resizeObserver.observe(content);
        if (documentRef?.current && documentRef.current !== content) resizeObserver.observe(documentRef.current);
        const mutationObserver = new MutationObserver(scheduleMeasure);
        mutationObserver.observe(content, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['style', 'class', 'data-paper-pages', 'data-paper-height'] });
        content.addEventListener('load', scheduleMeasure, true);
        document.fonts?.ready.then(scheduleMeasure);
        document.fonts?.addEventListener('loadingdone', scheduleMeasure);
        return () => {
            disposed = true;
            if (frame) cancelAnimationFrame(frame);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            content.removeEventListener('load', scheduleMeasure, true);
            document.fonts?.removeEventListener('loadingdone', scheduleMeasure);
        };
    }, [children, documentRef, format, documentKey, canPrint]);

    useLayoutEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const previous = previousZoomRef.current;
        const anchor = anchorRef.current;
        const reflow = reflowAnchorRef.current;
        if (anchor?.page != null) {
            const page = layout.pages[anchor.page];
            viewport.scrollTop = anchor.page === 0 ? 0 : (page?.top || 0) * zoom;
            viewport.scrollLeft = 0;
        } else if (anchor?.point) {
            const viewportRect = viewport.getBoundingClientRect();
            const contentRect = contentRef.current.getBoundingClientRect();
            const originX = contentRect.left - viewportRect.left + viewport.scrollLeft;
            const originY = contentRect.top - viewportRect.top + viewport.scrollTop;
            viewport.scrollLeft = originX + anchor.point.x * zoom - anchor.screen.x;
            viewport.scrollTop = originY + anchor.point.y * zoom - anchor.screen.y;
        } else if (reflow && layout.hasPages) {
            const index = reflow.last ? layout.pages.length - 1 : Math.min(reflow.index, layout.pages.length - 1);
            const page = layout.pages[index];
            const offset = Math.max(-viewport.clientHeight / zoom, Math.min(reflow.offset, page.height));
            viewport.scrollTop = Math.max(0, (page.top + offset) * zoom);
            viewport.scrollLeft = reflow.left * zoom;
            setCurrentPage(index + 1);
        } else if (Math.abs(previous - zoom) > 0.0001) {
            viewport.scrollTop = viewport.scrollTop * zoom / previous;
            viewport.scrollLeft = viewport.scrollLeft * zoom / previous;
        }
        previousZoomRef.current = zoom;
        anchorRef.current = null;
        reflowAnchorRef.current = null;
        if (layout.hasPages && !resetPendingRef.current) viewedAnchorRef.current = readScrollAnchor(viewport, layout.pages, zoom);
    }, [zoom, zoomMode, layout.pages, layout.hasPages]);

    useEffect(() => {
        setCurrentPage((page) => Math.min(page, totalPages));
    }, [totalPages]);

    useEffect(() => {
        const viewport = viewportRef.current;
        if (!viewport) return;
        const updateCurrentPage = () => {
            if (!documentAvailableRef.current) { setCurrentPage(1); return; }
            const probe = viewport.scrollTop + viewport.clientHeight * 0.25 - VIEWPORT_PADDING;
            let activePage = 1;
            for (let index = 0; index < pagesRef.current.length; index += 1) {
                if (pagesRef.current[index].top * zoomRef.current <= probe) activePage = index + 1;
            }
            setCurrentPage(activePage);
            if (realPagesRef.current && !resetPendingRef.current && !reflowAnchorRef.current) {
                viewedAnchorRef.current = readScrollAnchor(viewport, pagesRef.current, zoomRef.current);
            }
        };
        const handleWheel = (event) => {
            if (!documentAvailableRef.current || !(event.ctrlKey || event.metaKey) || event.deltaY === 0) return;
            event.preventDefault();
            const nextZoom = clampZoom(Math.round((zoomRef.current + (event.deltaY < 0 ? 0.05 : -0.05)) * 10000) / 10000);
            if (Math.abs(nextZoom - zoomRef.current) < 0.0001) return;
            const rect = viewport.getBoundingClientRect();
            const contentRect = contentRef.current.getBoundingClientRect();
            const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
            anchorRef.current = {
                screen,
                point: { x: (event.clientX - contentRect.left) / zoomRef.current, y: (event.clientY - contentRect.top) / zoomRef.current },
            };
            setManualZoom(nextZoom);
            setZoomMode('manual');
        };
        viewport.addEventListener('scroll', updateCurrentPage, { passive: true });
        viewport.addEventListener('wheel', handleWheel, { passive: false });
        return () => {
            viewport.removeEventListener('scroll', updateCurrentPage);
            viewport.removeEventListener('wheel', handleWheel);
        };
    }, []);

    const changeFullscreenMode = (mode) => {
        fullscreenModeRef.current = mode;
        if (mountedRef.current) setFullscreenMode(mode);
    };
    const exitFullscreen = async ({ restoreFocus = true } = {}) => {
        restoreFullscreenFocusRef.current = restoreFocus;
        fullscreenRequestRef.current += 1;
        if (document.fullscreenElement === previewRef.current) {
            try {
                await document.exitFullscreen();
            } catch {
                return false;
            }
        }
        changeFullscreenMode('');
        return true;
    };
    const toggleFullscreen = async () => {
        if (fullscreenModeRef.current || document.fullscreenElement === previewRef.current) {
            await exitFullscreen();
            return;
        }
        if (!documentAvailableRef.current) return;
        const preview = previewRef.current;
        if (!preview) return;
        const request = ++fullscreenRequestRef.current;
        fullscreenFocusRef.current = document.activeElement;
        restoreFullscreenFocusRef.current = true;
        if (preview.requestFullscreen && document.fullscreenEnabled !== false) {
            try {
                await preview.requestFullscreen();
                if (!mountedRef.current || request !== fullscreenRequestRef.current) {
                    if (document.fullscreenElement === preview) await document.exitFullscreen().catch(() => {});
                    return;
                }
                changeFullscreenMode('native');
                return;
            } catch {
                // Embedded browsers can reject native fullscreen; keep the same document mounted.
            }
        }
        if (mountedRef.current && request === fullscreenRequestRef.current) changeFullscreenMode('fallback');
    };

    useEffect(() => {
        mountedRef.current = true;
        const preview = previewRef.current;
        const handleFullscreenChange = () => {
            if (document.fullscreenElement === preview) changeFullscreenMode('native');
            else if (fullscreenModeRef.current === 'native') changeFullscreenMode('');
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => {
            mountedRef.current = false;
            fullscreenRequestRef.current += 1;
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            if (document.fullscreenElement === preview) document.exitFullscreen().catch(() => {});
        };
    }, []);

    useEffect(() => {
        if (!fullscreenMode) return;
        const body = document.body;
        const previousOverflow = body.style.overflow;
        body.style.overflow = 'hidden';
        const frame = requestAnimationFrame(() => fullscreenButtonRef.current?.focus({ preventScroll: true }));
        return () => {
            cancelAnimationFrame(frame);
            body.style.overflow = previousOverflow;
            if (restoreFullscreenFocusRef.current && mountedRef.current) {
                const target = fullscreenFocusRef.current?.isConnected ? fullscreenFocusRef.current : fullscreenButtonRef.current;
                target?.focus({ preventScroll: true });
            }
        };
    }, [fullscreenMode]);

    useEffect(() => {
        if (fullscreenMode !== 'fallback') return;
        const preview = previewRef.current;
        const focusableElements = () => [...preview.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])')]
            .filter(element => element.getClientRects().length && !element.closest('[inert]') && getComputedStyle(element).visibility !== 'hidden');
        const handleKeyDown = event => {
            if (fullscreenModeRef.current !== 'fallback') return;
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                exitFullscreen();
            } else if (event.key === 'Tab') {
                const focusable = focusableElements();
                const first = focusable[0] || fullscreenButtonRef.current;
                const last = focusable[focusable.length - 1] || first;
                if (event.shiftKey && (document.activeElement === first || !preview.contains(document.activeElement))) {
                    event.preventDefault();
                    last?.focus();
                } else if (!event.shiftKey && (document.activeElement === last || !preview.contains(document.activeElement))) {
                    event.preventDefault();
                    first?.focus();
                }
            }
        };
        const handleFocusIn = event => {
            if (fullscreenModeRef.current === 'fallback' && !preview.contains(event.target)) fullscreenButtonRef.current?.focus({ preventScroll: true });
        };
        document.addEventListener('keydown', handleKeyDown, true);
        document.addEventListener('focusin', handleFocusIn, true);
        return () => {
            document.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('focusin', handleFocusIn, true);
        };
    }, [fullscreenMode]);

    const changeZoom = (amount) => {
        if (!documentAvailableRef.current) return;
        setManualZoom(clampZoom(Math.round((zoom + amount) * 10000) / 10000));
        setZoomMode('manual');
    };
    const fit = (mode) => {
        if (!documentAvailableRef.current) return;
        anchorRef.current = { page: pageIndex };
        setZoomMode(mode);
        const viewport = viewportRef.current;
        if (mode === zoomMode && viewport) {
            viewport.scrollTop = pageIndex === 0 ? 0 : (layout.pages[pageIndex]?.top || 0) * zoom;
            viewport.scrollLeft = 0;
            anchorRef.current = null;
        }
    };
    const goToPage = (page) => {
        if (!documentAvailableRef.current) return;
        const index = Math.min(totalPages - 1, Math.max(0, page - 1));
        const viewport = viewportRef.current;
        if (!viewport) return;
        viewport.scrollTo({ top: index === 0 ? 0 : (layout.pages[index]?.top || 0) * zoom, behavior: 'auto' });
        setCurrentPage(index + 1);
        viewedAnchorRef.current = readScrollAnchor(viewport, layout.pages, zoom);
    };
    const resolvedPrintLabel = printLabel || (format === 'tor' ? 'Print TOR' : 'Print Form 9');
    const printBlocked = !documentAvailable || !canPrint || !onPrint;
    printStateRef.current = { allowed: !printBlocked, onPrint, documentKey, format };
    const extraControls = typeof toolbarExtra === 'function' ? toolbarExtra({ exitFullscreen, isFullscreen }) : toolbarExtra;
    const handlePrint = async () => {
        const request = printStateRef.current;
        if (!request?.allowed) return;
        if (!await exitFullscreen({ restoreFocus: false })) return;
        const current = printStateRef.current;
        if (current?.allowed && current.documentKey === request.documentKey && current.format === request.format) current.onPrint?.();
    };

    return (
        <div ref={previewRef} className={'paper-preview' + (fullscreenMode === 'fallback' ? ' paper-preview-fullscreen' : '')} data-document-available={documentAvailable} data-document-empty={!hasDocument || undefined} data-zoom-mode={zoomMode} data-preview-fullscreen={fullscreenMode || 'false'} role={fullscreenMode === 'fallback' ? 'dialog' : undefined} aria-modal={fullscreenMode === 'fallback' ? true : undefined} aria-label={fullscreenMode === 'fallback' ? 'Fullscreen document preview' : undefined}>
            <div className="paper-preview-toolbar print:hidden" data-preview-toolbar role="toolbar" aria-label="Document preview controls">
                <div className="paper-preview-control-group">
                    <button type="button" className="paper-preview-button" onClick={() => fit('fit-width')} disabled={!documentAvailable} aria-label="Fit width" aria-pressed={documentAvailable && zoomMode === 'fit-width'}><PreviewIcon name="width" /><span>Fit width</span></button>
                    <button type="button" className="paper-preview-button" onClick={() => fit('fit-page')} disabled={!documentAvailable} aria-label="Fit page" aria-pressed={documentAvailable && zoomMode === 'fit-page'}><PreviewIcon name="page" /><span>Fit page</span></button>
                </div>
                <div className="paper-preview-control-group">
                    <button type="button" className="paper-preview-icon-button" onClick={() => goToPage(currentPage - 1)} disabled={!documentAvailable || currentPage <= 1} aria-label="Previous page" title="Previous page"><PreviewIcon name="previous" /></button>
                    <span className="paper-preview-page-status" role="status" aria-live="polite" aria-label={documentAvailable ? undefined : 'Page count unavailable'} data-current-page={documentAvailable ? currentPage : undefined} data-total-pages={documentAvailable ? totalPages : undefined}>{documentAvailable ? `Page ${currentPage} of ${totalPages}` : '—'}</span>
                    <button type="button" className="paper-preview-icon-button" onClick={() => goToPage(currentPage + 1)} disabled={!documentAvailable || currentPage >= totalPages} aria-label="Next page" title="Next page"><PreviewIcon name="next" /></button>
                </div>
                <div className="paper-preview-control-group">
                    <button type="button" className="paper-preview-icon-button" onClick={() => changeZoom(-0.1)} disabled={!documentAvailable || zoom <= MIN_ZOOM + 0.0001} aria-label="Zoom out" title="Zoom out"><PreviewIcon name="minus" /></button>
                    <span className="paper-preview-zoom-status" aria-label={documentAvailable ? `Zoom ${Math.round(zoom * 100)} percent` : 'Zoom unavailable'}>{documentAvailable ? Math.round(zoom * 100) + '%' : '—%'}</span>
                    <button type="button" className="paper-preview-icon-button" onClick={() => changeZoom(0.1)} disabled={!documentAvailable || zoom >= MAX_ZOOM - 0.0001} aria-label="Zoom in" title="Zoom in"><PreviewIcon name="plus" /></button>
                </div>
                <button ref={fullscreenButtonRef} type="button" className="paper-preview-button" onClick={toggleFullscreen} disabled={!documentAvailable && !isFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'} aria-pressed={isFullscreen}><PreviewIcon name={isFullscreen ? 'restore' : 'fullscreen'} /><span>{isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}</span></button>
                {extraControls && <div className="paper-preview-toolbar-extra">{extraControls}</div>}
                <button type="button" className="paper-preview-button paper-preview-print" onClick={handlePrint} disabled={printBlocked} aria-label={resolvedPrintLabel} aria-describedby={printBlocked && printDisabledReason ? printReasonId : undefined} title={printBlocked && printDisabledReason ? printDisabledReason : resolvedPrintLabel}><PreviewIcon name="print" /><span>{resolvedPrintLabel}</span></button>
                {printBlocked && printDisabledReason && <span id={printReasonId} className="paper-preview-sr-only">{printDisabledReason}</span>}
            </div>
            <div className="paper-preview-scroll" data-preview-scroll ref={viewportRef} aria-label="Document preview" tabIndex={0}>
                <div className="paper-preview-canvas" data-preview-canvas data-zoom={zoom} style={{ width: Math.max(1, Math.ceil(layout.width * zoom)), height: Math.max(1, Math.ceil(layout.height * zoom)) }}>
                    <div className="paper-preview-content" data-preview-content ref={contentRef} style={{ transform: `scale(${zoom})` }}>{children}</div>
                </div>
            </div>
        </div>
    );
}
