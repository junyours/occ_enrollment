// Only whole placeholder values are absent names; names such as Noneza stay intact.
const EMPTY_NAME = /^(?:none|null|undefined|n\s*[/.]\s*a(?:\s*\.)?)$/i;

export function namePart(value) {
    const part = value == null ? '' : String(value).trim().replace(/\s+/g, ' ');
    return EMPTY_NAME.test(part) ? '' : part;
}

export function joinName(...parts) {
    return parts.map(namePart).filter(Boolean).join(' ');
}

export function nameFields(person) {
    return {
        first_name: namePart(person?.first_name),
        middle_name: namePart(person?.middle_name),
        last_name: namePart(person?.last_name),
    };
}
