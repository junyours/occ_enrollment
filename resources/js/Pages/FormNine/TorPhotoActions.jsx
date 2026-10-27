import React, { useEffect, useRef } from 'react';
import { Check, ImagePlus, ImageUp, LoaderCircle, RefreshCw, Trash2, TriangleAlert } from 'lucide-react';

export default function TorPhotoActions({ photoUrl, onPhotoChange, fetching = false, loadError = false, onRetry, photoSaving = false, photoRemoving = false, photoDisabled = false, error = '', message = '' }) {
    const inputRef = useRef(null);
    const actionsRef = useRef(null);
    const removalStatusRef = useRef(null);
    const addRef = useRef(null);
    const replaceRef = useRef(null);
    const removalFocusRef = useRef(null);
    const unavailable = photoDisabled || fetching || loadError;
    const chooseDisabled = unavailable || photoSaving || photoRemoving;
    const removeDisabled = unavailable || photoRemoving;
    const status = photoRemoving ? 'Removing photo…' : photoSaving ? 'Saving photo…' : '';
    const canRestoreFocus = () => !document.activeElement || document.activeElement === document.body || actionsRef.current?.contains(document.activeElement);

    useEffect(() => {
        const cancelOutside = event => {
            if (removalFocusRef.current && !actionsRef.current?.contains(event.target) && (event.type === 'pointerdown' || event.target !== document.body)) removalFocusRef.current = null;
        };
        const cancelOnBlur = () => { removalFocusRef.current = null; };
        document.addEventListener('focusin', cancelOutside, true);
        document.addEventListener('pointerdown', cancelOutside, true);
        window.addEventListener('blur', cancelOnBlur);
        return () => {
            document.removeEventListener('focusin', cancelOutside, true);
            document.removeEventListener('pointerdown', cancelOutside, true);
            window.removeEventListener('blur', cancelOnBlur);
        };
    }, []);

    useEffect(() => {
        const request = removalFocusRef.current;
        if (!request) return;
        if (!canRestoreFocus()) { removalFocusRef.current = null; return; }
        if (photoRemoving) {
            request.pending = true;
            removalStatusRef.current?.focus({ preventScroll: true });
            return;
        }
        if (request.pending) {
            const target = photoUrl ? replaceRef.current : addRef.current;
            if (target && !target.disabled) {
                removalFocusRef.current = null;
                target.focus({ preventScroll: true });
            }
        }
    }, [photoRemoving, photoUrl, fetching, loadError, chooseDisabled]);

    const removePhoto = event => {
        removalFocusRef.current = document.activeElement === event.currentTarget ? { pending: false } : null;
        onPhotoChange(null);
        if (inputRef.current) inputRef.current.value = '';
    };
    const stopPointer = event => event.stopPropagation();
    const choosePhoto = () => { if (!chooseDisabled) inputRef.current?.click(); };
    const controlClass = 'pointer-events-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-foreground transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50';

    if (!onPhotoChange) return null;
    const showTools = !!photoUrl || (!fetching && !loadError && !status && !!(error || message));

    return (
        <div ref={actionsRef} className="pointer-events-none absolute inset-0 z-10 print:hidden" role="group" aria-label="TOR photo actions" data-tor-photo-actions>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Choose TOR student photo" hidden disabled={chooseDisabled}
                onChange={event => {
                    const file = event.target.files?.[0];
                    event.target.value = '';
                    if (file && !chooseDisabled) onPhotoChange(file);
                }} />
            {!photoUrl && (fetching ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/95 px-1 text-center text-[10px] leading-tight text-muted-foreground" role="status" aria-live="polite">
                    <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
                    <span>Loading photo…</span>
                </div>
            ) : loadError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/95 px-1 text-center text-[10px] leading-tight text-muted-foreground" role="alert">
                    <TriangleAlert size={17} aria-hidden="true" />
                    <span>Photo unavailable</span>
                    <button type="button" className="pointer-events-auto inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-[10px] text-foreground hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-50" aria-label="Retry TOR photo" disabled={!onRetry || fetching} onPointerDown={stopPointer} onClick={() => onRetry?.()}>
                        <RefreshCw size={11} aria-hidden="true" />Retry
                    </button>
                </div>
            ) : status ? (
                <div ref={photoRemoving ? removalStatusRef : undefined} tabIndex={photoRemoving ? -1 : undefined} className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-muted/95 px-1 text-center text-[10px] leading-tight text-muted-foreground" role="status" aria-live="polite">
                    <LoaderCircle size={18} className="shrink-0 animate-spin" aria-hidden="true" /><span>{status}</span>
                </div>
            ) : (
                <button type="button" className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-1 bg-background px-1 text-center text-[10px] leading-tight text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
                    ref={addRef} aria-label="Add photo on TOR" title="Add student photo" disabled={chooseDisabled} onPointerDown={stopPointer} onClick={choosePhoto}>
                    <ImagePlus size={20} aria-hidden="true" /><span>Add photo</span>
                </button>
            ))}
            {showTools && (
                <div className="absolute left-full top-0 ml-1 flex w-9 max-w-9 flex-col items-center gap-1 rounded-md border border-border/50 bg-background/60 p-0.5 shadow-sm backdrop-blur-sm print:hidden" data-tor-photo-tools>
                    {photoUrl && (
                        <>
                            <button type="button" ref={replaceRef} className={controlClass} aria-label="Replace photo on TOR" title="Replace student photo" disabled={chooseDisabled} onPointerDown={stopPointer} onClick={choosePhoto}>
                                <ImageUp size={14} aria-hidden="true" />
                            </button>
                            <button type="button" className={controlClass} aria-label="Remove photo on TOR" title="Remove student photo" disabled={removeDisabled} onPointerDown={stopPointer} onClick={removePhoto}>
                                <Trash2 size={14} aria-hidden="true" />
                            </button>
                        </>
                    )}
                    {photoUrl && fetching && (
                        <span className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center text-muted-foreground" role="status" aria-live="polite" title="Loading photo…">
                            <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /><span className="sr-only">Loading photo…</span>
                        </span>
                    )}
                    {photoUrl && !fetching && loadError && (
                        <button type="button" className={controlClass} aria-label="Retry TOR photo" title="Photo unavailable. Retry loading photo." disabled={!onRetry || fetching} onPointerDown={stopPointer} onClick={() => onRetry?.()}>
                            <RefreshCw size={14} aria-hidden="true" /><span className="sr-only">Photo unavailable</span>
                        </button>
                    )}
                    {photoUrl && !fetching && !loadError && status && (
                        <span ref={photoRemoving ? removalStatusRef : undefined} tabIndex={photoRemoving ? -1 : undefined} className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center text-muted-foreground" role="status" aria-live="polite" title={status}>
                            <LoaderCircle size={14} className="animate-spin" aria-hidden="true" /><span className="sr-only">{status}</span>
                        </span>
                    )}
                    {!fetching && !loadError && !status && error && (
                        <span className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center text-destructive" role="alert" title={error} onPointerDown={stopPointer}>
                            <TriangleAlert size={14} aria-hidden="true" /><span className="sr-only">{error}</span>
                        </span>
                    )}
                    {!fetching && !loadError && !status && !error && message && (
                        <span className="pointer-events-auto inline-flex h-7 w-7 items-center justify-center text-green-700 dark:text-green-300" role="status" aria-live="polite" title={message}>
                            <Check size={14} aria-hidden="true" /><span className="sr-only">{message}</span>
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}