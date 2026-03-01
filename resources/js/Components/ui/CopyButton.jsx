import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        if (copied) return;

        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <button
            onClick={handleCopy}
            className="p-2 rounded-lg transition-all duration-200 active:scale-90 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Copy to clipboard"
        >
            <div className={`transition-transform duration-300 ${copied ? 'scale-110' : 'scale-100'}`}>
                {copied ? (
                    <Check key="check" className="w-5 h-5 text-green-500 animate-in zoom-in duration-300" />
                ) : (
                    <Copy key="copy" className="w-5 h-5 text-gray-500" />
                )}
            </div>
        </button>
    );
}