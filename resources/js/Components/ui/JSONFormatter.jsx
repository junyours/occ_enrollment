import React from 'react';
import { Card, CardContent } from './card';
import CopyButton from './CopyButton';

export default function JSONFormatter({ data }) {
    const obj = typeof data === 'string' ? JSON.parse(data) : data;

    const rainbowHighlight = (json) => {
        if (!json) return "";

        const jsonStr = JSON.stringify(json, null, 4);
        const bracketColors = ['text-[#f9d201]', 'text-[#ca69c7]', 'text-[#1799f4]'];
        let depth = 0;

        // This regex finds keys, strings, numbers, and brackets separately
        return jsonStr.replace(
            /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{} [\]])/g,
            function (match) {
                // Handle Opening Brackets
                if (match === '{' || match === '[') {
                    const colorClass = bracketColors[depth % bracketColors.length];
                    depth++;
                    return `<span class="${colorClass}">${match}</span>`;
                }

                // Handle Closing Brackets
                if (match === '}' || match === ']') {
                    depth--;
                    const colorClass = bracketColors[depth % bracketColors.length];
                    return `<span class="${colorClass}">${match}</span>`;
                }

                // Handle Keys (Light Blue)
                if (/^"/.test(match) && /:$/.test(match)) {
                    return `<span class="text-[#9cdcfe]">${match}</span>`;
                }

                // Handle String Values (Orange-Tan)
                if (/^"/.test(match)) {
                    return `<span class="text-[#ce9178]">${match}</span>`;
                }

                // Handle Booleans/Null (Blue)
                if (/true|false|null/.test(match)) {
                    return `<span class="text-[#569cd6]">${match}</span>`;
                }

                // Handle Numbers (Light Green)
                return `<span class="text-[#b5cea8]">${match}</span>`;
            }
        );
    };

    if (!obj || Object.keys(obj).length === 0) {
        return (
            <div className="p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground italic text-sm">
                No data available
            </div>
        );
    }

    return (
        <div className="group">
            <Card className="pt-2 bg-[#1e1e1e] shadow-2xl border-white/5">
                <div className="sticky top-3 right-3 z-50 flex justify-end pr-3">
                    <CopyButton
                        className=''
                        text={JSON.stringify(obj, null, 4)}
                    />
                </div>

                <CardContent className="pt-6 px-9 border-t mt-2">
                    <pre
                        className="text-[13px] font-mono leading-relaxed text-[#d4d4d4]"
                        dangerouslySetInnerHTML={{ __html: rainbowHighlight(obj) }}
                    />
                </CardContent>
            </Card>
        </div>
    );
}