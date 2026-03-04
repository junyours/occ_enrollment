import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

export default function CopyButton({ text, size = "sm" }) {
    const [copied, setCopied] = useState(false);

    // Configuration for different sizes
    const sizeConfig = {
        xs: { button: "p-1 rounded-md", icon: 14 },
        sm: { button: "p-2 rounded-lg", icon: 18 },
        md: { button: "p-2.5 rounded-lg", icon: 20 },
        lg: { button: "p-3 rounded-xl", icon: 24 },
    };

    const currentSize = sizeConfig[size] || sizeConfig.sm;

    const handleCopy = async () => {
        if (copied || !text) return;

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
            type="button"
            onClick={handleCopy}
            className={`
                ${currentSize.button} 
                p-2 rounded-lg transition-all duration-200 active:scale-90 hover:bg-gray-100 dark:hover:bg-gray-800
            `}
            aria-label={copied ? "Copied!" : "Copy to clipboard"}
        >
            <div className={`transition-transform duration-300 ${copied ? 'scale-110' : 'scale-100'}`}>
                {copied ? (
                    <Check
                        size={currentSize.icon}
                        className="text-green-500 animate-in zoom-in duration-300"
                    />
                ) : (
                    <Copy
                        size={currentSize.icon}
                        className="text-gray-500"
                    />
                )}
            </div>
        </button>
    );
}