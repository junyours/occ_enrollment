import React, { createContext, useContext, useId, useMemo } from 'react';

const Form9FieldsContext = createContext(null);
const textValue = value => value == null ? '' : String(value);

export function Form9FieldsProvider({ values = {}, onChange, measurement = false, children }) {
    const context = useMemo(() => ({ values, onChange, measurement }), [values, onChange, measurement]);
    return <Form9FieldsContext.Provider value={context}>{children}</Form9FieldsContext.Provider>;
}

export function useForm9Field(fieldKey, defaultValue) {
    const context = useContext(Form9FieldsContext);
    const controlled = !!context && typeof fieldKey === 'string' && fieldKey.length > 0;
    const measurement = !!context?.measurement;
    const value = controlled && Object.prototype.hasOwnProperty.call(context.values || {}, fieldKey)
        ? textValue(context.values[fieldKey]) : textValue(defaultValue);
    const onChange = event => {
        if (controlled && !measurement) context.onChange?.(fieldKey, textValue(event?.target ? event.target.value : event));
    };
    return { value, onChange, controlled, measurement };
}

export function Form9Input({ fieldKey, defaultValue, measurement = false, onChange, id, name, readOnly, tabIndex, ...props }) {
    const field = useForm9Field(fieldKey, defaultValue);
    const instanceId = useId();
    const measuring = measurement || field.measurement;
    const inputProps = field.controlled
        ? { value: field.value, onChange: event => { field.onChange(event); if (!measuring) onChange?.(event); } }
        : { defaultValue, onChange };
    return (
        <input {...props} {...inputProps}
            id={measuring ? undefined : field.controlled ? `form9-${instanceId.replace(/:/g, '')}` : id}
            name={measuring ? undefined : name}
            data-form9-field-key={field.controlled ? fieldKey : undefined}
            readOnly={measuring || readOnly} tabIndex={measuring ? -1 : tabIndex} />
    );
}