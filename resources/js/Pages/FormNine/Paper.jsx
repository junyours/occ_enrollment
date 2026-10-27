import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import StudentInfo from './StudentInfo';
import CollegiateRecords from './components/CollegiateRecords';
import SYGrades from './SYGrades';
import Header from './components/Header';
import { Form9FieldsProvider } from './form9Fields';
import { paginateTorRecords } from './torPagination';
import { cn } from '@/Lib/Utils';
import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Card } from '@/Components/ui/card';
import './Form9Paper.css';

function NothingFollows() {
    return <div className="border-y border-black mt-4"><p className="text-center text-sm italic">*** Nothing Follows ***</p></div>;
}

function Confirmation() {
    return (
        <div>
            <div className="grid grid-cols-[1fr_200px] border border-black text-xs bg-white">
                <div className="py-4 px-2 border-r border-black"><p className="text-center">I hereby certify that the above-named student have been verified by me and that the true copies of the official records substantiating the same are kept in the files of the school. I also certify that this student has enrolled in this institution.</p></div>
                <div className="grid grid-rows-[19px_19px_19px_19px] h-full">
                    <div className="row-span-2">Prepared by:</div>
                    <div className="font-semibold text-center self-end">BERNADETH T. NACUA, LPT</div>
                    <div className="self-end w-full border-t border-black text-center">Registrar 1</div>
                </div>
            </div>
            <div className="grid grid-cols-[1fr_200px] text-xs"><div /><div className="h-full"><div className="row-span-2">Date: {new Date().toLocaleDateString()}</div></div></div>
        </div>
    );
}

function TotalBlock({ total }) {
    return (
        <div className="flow-root" data-form9-total>
            <table className="w-full mb-4"><thead><tr>
                <th className="text-xs text-left w-32 pl-8 font-normal py-0.5" /><th className="text-xs font-normal" /><th className="text-xs font-normal w-16" /><th className="text-xs font-normal w-16" /><th className="text-xs font-normal w-16" />
            </tr></thead><tbody><tr className="border-b border-gray-400">
                <td className="text-xs pl-8 py-0.5" /><td className="text-xs" /><td className="text-xs text-center" /><td className="text-xs text-center">Total Units:</td><td className="text-xs text-center">{total}</td>
            </tr></tbody></table>
            <NothingFollows />
        </div>
    );
}

function PageFrame({ data, first = false, final = false, pageNumber, totalPages, measurement, children }) {
    const records = Array.isArray(data?.enrollmentRecord) ? data.enrollmentRecord : [];
    return (
        <section className="form9-page" data-form9-page={measurement || pageNumber} aria-label={measurement ? undefined : `Form 9 page ${pageNumber} of ${totalPages}`}>
            <Header />
            {first && <div className="form9-preface"><StudentInfo info={data.info} lastRecord={records[records.length - 1]} /><CollegiateRecords /></div>}
            <div className="form9-record-area">{children}</div>
            {final && <div className="form9-confirmation" data-form9-confirmation><Confirmation /></div>}
            {!measurement && <div className="form9-page-number">{pageNumber} / {totalPages}</div>}
        </section>
    );
}

function focusedField(root) {
    const element = document.activeElement;
    if (!root?.contains(element) || !element?.dataset.form9FieldKey) return null;
    return { key: element.dataset.form9FieldKey, page: Number(element.closest('[data-form9-page]')?.dataset.form9Page) || 1, start: element.selectionStart, end: element.selectionEnd, direction: element.selectionDirection };
}

function totalUnits(records) {
    return records.reduce((sum, record) => sum + (record.subjects || []).reduce((subtotal, subject) => {
        if (!subject || subject.grade > 3 || subject.grade == 0 || subject.grade == null) return subtotal;
        return subtotal + parseFloat(subject.credit_units || 0);
    }, 0), 0);
}

export default function Paper({ data, className, onReadyChange }) {
    const measurementRef = useRef(null);
    const visibleRef = useRef(null);
    const focusedRef = useRef(null);
    const pageInputRef = useRef(null);
    const [draftValues, setDraftValues] = useState({});
    const [layout, setLayout] = useState({ data: null, drafts: null, pages: [], error: null });
    const [manualPages, setManualPages] = useState(null);
    const [pageInput, setPageInput] = useState('1');
    const records = Array.isArray(data?.enrollmentRecord) ? data.enrollmentRecord : [];
    const visibleRecords = Array.isArray(layout.data?.enrollmentRecord) ? layout.data.enrollmentRecord : [];
    const currentLayout = layout.data === data && layout.drafts === draftValues;
    const autoPages = Math.max(1, layout.pages.length);
    const requestedPages = Math.max(autoPages, Math.min(Math.max(100, autoPages), manualPages ?? autoPages));
    const pages = useMemo(() => {
        if (!layout.pages.length || requestedPages <= layout.pages.length) return layout.pages;
        const extended = layout.pages.map(page => ({ ...page, showTotal: false }));
        while (extended.length < requestedPages) extended.push({ segments: [], showTotal: false });
        extended[extended.length - 1].showTotal = true;
        return extended;
    }, [layout.pages, requestedPages]);
    const error = currentLayout ? layout.error : null;
    const ready = currentLayout && pages.length > 0 && !error;

    const changeField = useCallback((fieldKey, value) => {
        focusedRef.current = focusedField(visibleRef.current);
        onReadyChange?.(false);
        setDraftValues(previous => previous[fieldKey] === value ? previous : { ...previous, [fieldKey]: value });
    }, [onReadyChange]);

    useLayoutEffect(() => { onReadyChange?.(!!ready); }, [ready, pages, onReadyChange]);
    useEffect(() => {
        if (document.activeElement !== pageInputRef.current) setPageInput(String(requestedPages));
    }, [requestedPages]);

    useLayoutEffect(() => {
        let cancelled = false;
        let frame;
        let assetsReady = false;
        const root = measurementRef.current;
        onReadyChange?.(false);
        if (!root) return;
        const measure = () => {
            if (cancelled || window.matchMedia('print').matches) return;
            try {
                const first = root.querySelector('[data-form9-page="first"]');
                const continuation = root.querySelector('[data-form9-page="continuation"]');
                const height = element => element.getBoundingClientRect().height;
                const outerHeight = element => {
                    const style = getComputedStyle(element);
                    return height(element) + (parseFloat(style.marginTop) || 0) + (parseFloat(style.marginBottom) || 0);
                };
                const capacity = page => {
                    const area = page.querySelector('.form9-record-area');
                    const safeBottom = page.getBoundingClientRect().bottom - parseFloat(getComputedStyle(page).paddingBottom);
                    if (area.getBoundingClientRect().top > safeBottom + 1) throw new Error('The student details or header exceed one page. Shorten the affected fields.');
                    return Math.max(0, height(area) - 4);
                };
                const groups = records.map((record, groupIndex) => {
                    const whole = root.querySelector(`[data-form9-measure-record="${groupIndex}"]`);
                    const continued = root.querySelector(`[data-form9-measure-continued="${groupIndex}"]`);
                    const rowHeights = Array.from(whole.querySelectorAll('[data-form9-subject]'), height);
                    return { headingHeight: Math.max(0, outerHeight(whole) - rowHeights.reduce((sum, value) => sum + value, 0)), continuationHeadingHeight: outerHeight(continued), rowHeights };
                });
                const planned = paginateTorRecords(groups, {
                    firstPageHeight: capacity(first), continuationPageHeight: capacity(continuation),
                    totalHeight: outerHeight(root.querySelector('[data-form9-measure-total]')),
                    finalBlockHeight: outerHeight(root.querySelector('[data-form9-measure-confirmation]')),
                    keepWholeGroups: true,
                });
                focusedRef.current = focusedField(visibleRef.current) || focusedRef.current;
                setLayout({ data, drafts: draftValues, pages: planned, error: null });
            } catch (problem) {
                setLayout({ data, drafts: draftValues, pages: [], error: String(problem.message || 'Unable to prepare the record.').replace(/^TOR pagination:/, 'Form 9 pagination:') });
            }
        };
        const schedule = () => {
            if (cancelled || window.matchMedia('print').matches) return;
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(measure);
        };
        const images = Array.from(root.querySelectorAll('img'));
        const imageLoads = images.map(image => image.complete ? Promise.resolve() : new Promise(resolve => {
            image.addEventListener('load', resolve, { once: true });
            image.addEventListener('error', resolve, { once: true });
        }));
        Promise.all([document.fonts?.ready || Promise.resolve(), ...imageLoads]).then(() => {
            if (cancelled) return;
            assetsReady = true;
            schedule();
        });
        const observer = new ResizeObserver(() => { if (assetsReady) schedule(); });
        root.querySelectorAll('.form9-page, .form9-preface, [data-form9-record], [data-form9-subject], [data-form9-measure-total], [data-form9-measure-confirmation]').forEach(element => observer.observe(element));
        return () => { cancelled = true; cancelAnimationFrame(frame); observer.disconnect(); };
    }, [data, draftValues, onReadyChange]);

    useLayoutEffect(() => {
        const wanted = focusedRef.current;
        if (!wanted) return;
        focusedRef.current = null;
        const active = document.activeElement;
        const current = focusedField(visibleRef.current);
        if ((current && current.key !== wanted.key) || (active && active !== document.body && !visibleRef.current?.contains(active))) return;
        const matches = Array.from(visibleRef.current?.querySelectorAll('[data-form9-field-key]') || []).filter(element => element.dataset.form9FieldKey === wanted.key);
        matches.sort((left, right) => Math.abs(Number(left.closest('[data-form9-page]').dataset.form9Page) - wanted.page) - Math.abs(Number(right.closest('[data-form9-page]').dataset.form9Page) - wanted.page));
        const target = matches[0];
        if (target) {
            target.focus({ preventScroll: true });
            if (Number(target.closest('[data-form9-page]').dataset.form9Page) !== wanted.page) target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            if (typeof wanted.start === 'number' && target.setSelectionRange) target.setSelectionRange(wanted.start, wanted.end, wanted.direction || 'none');
        }
    }, [layout.pages]);

    const commitPageCount = () => {
        const value = Number(pageInput);
        const next = pageInput.trim() && Number.isFinite(value) ? Math.max(autoPages, Math.min(Math.max(100, autoPages), Math.floor(value))) : autoPages;
        setManualPages(next === autoPages ? null : next);
        setPageInput(String(next));
    };
    const visibleTotal = totalUnits(visibleRecords);
    const measurement = (
        <Form9FieldsProvider values={draftValues} onChange={changeField} measurement>
            <div ref={measurementRef} className="form9-document form9-measure-host" aria-hidden="true" inert="">
                <PageFrame data={data} first measurement="first">
                    {records.map((record, groupIndex) => <div key={groupIndex} data-form9-measure-record={groupIndex} className="form9-measure-semester"><SYGrades data={record} recordIndex={groupIndex} measurement /></div>)}
                </PageFrame>
                <PageFrame data={data} measurement="continuation" />
                <div className="form9-measure-final">
                    {records.map((record, groupIndex) => <div key={groupIndex} data-form9-measure-continued={groupIndex} className="form9-measure-semester"><SYGrades data={record} recordIndex={groupIndex} subjectEnd={0} continued measurement /></div>)}
                    <div data-form9-measure-total><TotalBlock total={totalUnits(records)} /></div>
                    <div className="form9-confirmation" data-form9-measure-confirmation><Confirmation /></div>
                </div>
            </div>
        </Form9FieldsProvider>
    );

    return (
        <div className={cn('form9-document', className)} data-form9-ready={ready ? 'true' : 'false'} data-paper-pages={pages.length || 1}>
            <style media="print">{'@page { size: A4 portrait; margin: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }'}</style>
            <Card className="form9-page-controls print:hidden mb-4 p-3 rounded border flex items-center gap-4">
                <div className="text-sm flex items-center gap-2"><label htmlFor="form9-page-count" className="font-medium">Pages:</label><Input id="form9-page-count" ref={pageInputRef} type="number" min={autoPages} max={Math.max(100, autoPages)} value={pageInput}
                    title={`At least ${autoPages} ${autoPages === 1 ? 'page is' : 'pages are'} needed to show all records.`} onChange={event => { setPageInput(event.target.value); const next = Number(event.target.value); if (Number.isFinite(next) && next >= autoPages) setManualPages(Math.min(Math.max(100, autoPages), Math.floor(next))); }}
                    onBlur={commitPageCount} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} className="w-16 h-8 text-sm" /></div>
                <Button size="sm" variant="ghost" aria-label="Reset automatic page count" onClick={() => { setManualPages(null); setPageInput(String(autoPages)); }} className="text-xs">Reset</Button>
            </Card>
            {error && <div className="form9-layout-error" role="alert"><p>Cannot prepare Form 9: {error}</p>{Object.keys(draftValues).length > 0 && <Button type="button" variant="outline" size="sm" className="mt-3 print:hidden" onClick={() => { focusedRef.current = null; onReadyChange?.(false); setDraftValues({}); }}>Reset form edits</Button>}</div>}
            {!pages.length && !error && <p className="p-6 text-center text-sm" role="status">Preparing Form 9 pages...</p>}
            <Form9FieldsProvider values={draftValues} onChange={changeField}>
                <div ref={visibleRef}>
                    {pages.map((page, pageIndex) => <PageFrame key={pageIndex} data={layout.data} first={pageIndex === 0} final={page.showTotal} pageNumber={pageIndex + 1} totalPages={pages.length}>
                        {page.segments.map(segment => <SYGrades key={segment.groupIndex} data={visibleRecords[segment.groupIndex]} recordIndex={segment.groupIndex} subjectStart={segment.subjectStart} subjectEnd={segment.subjectEnd} continued={segment.continued} className="form9-semester" />)}
                        {page.showTotal && <TotalBlock total={visibleTotal} />}
                    </PageFrame>)}
                </div>
            </Form9FieldsProvider>
            {createPortal(measurement, document.body)}
        </div>
    );
}