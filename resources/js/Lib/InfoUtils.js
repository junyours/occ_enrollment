/**
 * @param {Object} user - { first_name, middle_name, last_name }
 * @param {Object} options - { format: 'FMI' | 'LFM' | 'FULL', casing: 'capitalize' | 'upper' | 'lower' }
 */
export const formatName = (user = {}, options = {}) => {
    const { first_name, middle_name, last_name } = user;
    const { format = 'FMI', casing = 'capitalize' } = options;

    // Clean and normalize inputs (handles "JOHN" or "john")
    const f = (first_name || '').trim();
    const m = (middle_name || '').trim();
    const l = (last_name || '').trim();

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