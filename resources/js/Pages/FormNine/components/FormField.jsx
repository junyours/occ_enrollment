import { useEffect, useRef } from "react";

const FormField = ({ label, value, labelWidth = '80px' }) => {
    const textareaRef = useRef(null);

    // This function adjusts the height whenever the user types
    const handleInput = (e) => {
        const target = e.target;
        // Reset height to 'auto' first so it shrinks when text is deleted
        target.style.height = 'auto';
        // Expand to fit the current content
        target.style.height = `${target.scrollHeight}px`;
    };

    // This ensures the height is correct on the initial render 
    // if 'value' already contains multiple lines of text
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [value]);

    return (
        <div className='flex items-end gap-2'>
            <span className={`text-xs whitespace-nowrap self-start`} style={{ width: labelWidth }}>
                {label}
            </span>
            {/* {(!!value && !value.toUpperCase().includes('N/A')) ? (
                <div className='flex-grow border-b border-black text-xs px-2'>
                    {value}
                </div>
            ) : ( */}
            <textarea
                ref={textareaRef}
                defaultValue={value}
                onInput={handleInput}
                rows={1} // Forces it to start as a single line
                className="flex-grow border-b border-black text-xs px-2 outline-none bg-transparent resize-none overflow-hidden"
            />
            {/* )} */}
        </div>
    )
};

export default FormField