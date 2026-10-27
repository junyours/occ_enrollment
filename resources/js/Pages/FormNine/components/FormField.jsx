import { useLayoutEffect, useRef } from 'react';
import { useForm9Field } from '../form9Fields';

const FormField = ({ label, value, labelWidth = '80px', fieldKey }) => {
    const textareaRef = useRef(null);
    const field = useForm9Field(fieldKey, value);
    const resize = target => {
        if (!target) return;
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
    };
    useLayoutEffect(() => { resize(textareaRef.current); }, [field.value, value]);
    const inputProps = field.controlled
        ? { value: field.value, onChange: field.onChange }
        : { defaultValue: value };

    return (
        <div className="flex min-w-0 items-end gap-2">
            <span className="shrink-0 text-xs whitespace-nowrap self-start" style={{ width: labelWidth }}>{label}</span>
            <textarea ref={textareaRef} {...inputProps} onInput={event => resize(event.target)} rows={1}
                data-form9-field-key={field.controlled ? fieldKey : undefined}
                aria-label={field.controlled ? label : undefined}
                readOnly={field.measurement} tabIndex={field.measurement ? -1 : undefined}
                className="min-w-0 flex-grow border-b border-black text-xs px-2 outline-none bg-transparent resize-none overflow-hidden" />
        </div>
    );
};

export default FormField;