import React from 'react';
import { getTorLastPageBlocks } from './torNoteTemplates';

const NOTE_STYLES = {
    nstp: 'text-center font-semibold',
    completion: 'text-center font-semibold',
    ched: 'text-left font-bold',
    other: 'text-left text-[10px]',
};

export function TorLastPageNotes({ data, options }) {
    const blocks = getTorLastPageBlocks(data, options);
    if (!blocks.length) return null;
    return (
        <section
            className="tor-last-page-notes m-0 flex shrink-0 flex-col divide-y divide-solid divide-black border-t border-solid border-black font-[Arial,Helvetica,sans-serif] text-[11px] leading-[1.35] text-black [overflow-wrap:anywhere]"
            aria-label="Last-page transcript notes"
        >
            {blocks.map(({ kind, text }) => (
                <div key={kind} className={`tor-${kind}-note m-0 min-w-0 whitespace-pre-wrap px-[2mm] py-[3mm] ${NOTE_STYLES[kind] || 'text-left'}`}>
                    {text}
                </div>
            ))}
        </section>
    );
}