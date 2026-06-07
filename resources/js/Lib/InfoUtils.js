/**
 * @param {Object|null} user - { first_name, middle_name, last_name }
 * @param {Object} options - { format: 'FMI' | 'LFM' | 'FULL', casing: 'capitalize' | 'upper' | 'lower', defaultValue: string }
 */
export const formatName = (user, options = {}) => {
    // 1. Guard against null! Fallback to an empty object if user is null/undefined
    const safeUser = user || {};
    const { first_name, middle_name, last_name } = safeUser;

    const {
        format = 'FMI',
        casing = 'capitalize',
        defaultValue = 'Unknown'
    } = options;

    // Clean and normalize inputs
    const f = (first_name || '').trim();
    const m = (middle_name || '').trim();
    const l = (last_name || '').trim();

    // Return the default value if both first and last name are missing
    if (!f && !l) {
        return defaultValue;
    }

    const mi = m ? `${m.charAt(0).toUpperCase()}.` : '';

    // Select Formatting
    let fullName = '';
    switch (format) {
        case 'FULL':
            fullName = [f, m, l].filter(Boolean).join(' ');
            break;
        case 'LFM':
            const firstPart = [f, mi].filter(Boolean).join(' ');
            fullName = l ? `${l}${firstPart ? ', ' + firstPart : ''}` : firstPart;
            break;
        default: // FMI
            fullName = [f, mi, l].filter(Boolean).join(' ');
    }

    // Final Casing Transformation
    if (casing === 'upper') return fullName.toUpperCase();
    if (casing === 'lower') return fullName.toLowerCase();

    return fullName
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
};