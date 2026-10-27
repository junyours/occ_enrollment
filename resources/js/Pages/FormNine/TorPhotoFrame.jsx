import React, { useEffect, useRef } from 'react';
import { getTorPhotoFraming } from './torPhotoFraming';

export default function TorPhotoFrame({ src, options, alt = 'Student identification', className = '', onFramingChange, disabled = false, label = 'Adjust student photo position' }) {
    const imageRef = useRef(null);
    const frameRef = useRef(null);
    const interactionRef = useRef(null);
    const dragRef = useRef(null);
    const framing = getTorPhotoFraming(options);
    const editable = !!onFramingChange && !disabled;
    const position = `${framing.x}% ${framing.y}%`;
    interactionRef.current = { framing, onFramingChange, editable };

    useEffect(() => {
        const drag = dragRef.current;
        dragRef.current = null;
        if (drag?.element.hasPointerCapture(drag.pointerId)) drag.element.releasePointerCapture(drag.pointerId);
    }, [src, disabled]);

    useEffect(() => {
        const element = frameRef.current;
        if (!element || !editable) return;
        const zoomWithWheel = event => {
            const current = interactionRef.current;
            if (!current.editable || event.deltaY === 0) return;
            event.preventDefault();
            event.stopPropagation();
            if (dragRef.current) return;
            const units = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? element.clientHeight : 1;
            const delta = Math.max(-200, Math.min(200, event.deltaY * units));
            const zoom = Math.round(Math.max(1, Math.min(3, current.framing.zoom * Math.exp(-delta * 0.0005))) * 1000) / 1000;
            if (zoom === current.framing.zoom) return;
            const next = { ...current.framing, zoom };
            interactionRef.current = { ...current, framing: next };
            current.onFramingChange(next);
        };
        element.addEventListener('wheel', zoomWithWheel, { passive: false });
        return () => element.removeEventListener('wheel', zoomWithWheel);
    }, [editable]);

    const startDrag = event => {
        if (!editable || !event.isPrimary || event.button !== 0) return;
        const image = imageRef.current;
        const frame = event.currentTarget;
        if (!image?.naturalWidth || !image.naturalHeight || !frame.clientWidth || !frame.clientHeight) return;
        const rect = frame.getBoundingClientRect();
        const cover = Math.max(frame.clientWidth / image.naturalWidth, frame.clientHeight / image.naturalHeight);
        const framing = interactionRef.current.framing;
        dragRef.current = {
            element: frame, pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, framing,
            overflowX: Math.max(0, image.naturalWidth * cover * framing.zoom - frame.clientWidth) * rect.width / frame.offsetWidth,
            overflowY: Math.max(0, image.naturalHeight * cover * framing.zoom - frame.clientHeight) * rect.height / frame.offsetHeight,
        };
        event.preventDefault();
        frame.focus({ preventScroll: true });
        frame.setPointerCapture(event.pointerId);
    };
    const moveDrag = event => {
        const drag = dragRef.current;
        if (!drag || !interactionRef.current.editable || event.pointerId !== drag.pointerId) return;
        event.preventDefault();
        interactionRef.current.onFramingChange({
            ...drag.framing,
            x: drag.overflowX > 0.01 ? Math.max(0, Math.min(100, drag.framing.x - (event.clientX - drag.clientX) * 100 / drag.overflowX)) : drag.framing.x,
            y: drag.overflowY > 0.01 ? Math.max(0, Math.min(100, drag.framing.y - (event.clientY - drag.clientY) * 100 / drag.overflowY)) : drag.framing.y,
        });
    };
    const stopDrag = event => {
        if (dragRef.current?.pointerId !== event.pointerId) return;
        dragRef.current = null;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    };
    const moveWithKeys = event => {
        if (!editable) return;
        const amount = event.shiftKey ? 10 : 2;
        const next = { ...framing };
        if (event.key === 'ArrowLeft') next.x += amount;
        else if (event.key === 'ArrowRight') next.x -= amount;
        else if (event.key === 'ArrowUp') next.y += amount;
        else if (event.key === 'ArrowDown') next.y -= amount;
        else return;
        event.preventDefault();
        onFramingChange(next);
    };

    return (
        <div className={`relative overflow-hidden ${editable ? 'cursor-grab touch-none select-none active:cursor-grabbing focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring print:cursor-default print:!outline-none print:!shadow-none' : ''} ${className}`}
            ref={frameRef} title={editable ? 'Drag to move the photo. Scroll to zoom.' : undefined}
            role={onFramingChange ? 'group' : undefined} aria-label={onFramingChange ? label : undefined}
            aria-describedby={onFramingChange ? 'tor-photo-framing-help' : undefined} aria-disabled={onFramingChange ? disabled : undefined}
            tabIndex={editable ? 0 : undefined} data-tor-photo-frame
            onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} onLostPointerCapture={() => { dragRef.current = null; }} onKeyDown={moveWithKeys}>
            <img ref={imageRef} src={src} alt={alt} draggable={false} className="block h-full w-full object-cover"
                style={{ objectPosition: position, transformOrigin: position, transform: `scale(${framing.zoom})`, pointerEvents: 'none' }} />
        </div>
    );
}