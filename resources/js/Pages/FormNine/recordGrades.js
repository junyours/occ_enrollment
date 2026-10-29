/** Zero is the SIS dropped-grade marker; missing grades remain missing. */
export function isDroppedGrade(grade) {
    if (typeof grade !== 'string' && typeof grade !== 'number') return false;
    const value = String(grade).trim();
    if (value === '') return false;
    return /^(?:DRP|DROP|DROPPED)$/i.test(value)
        || (Number.isFinite(Number(value)) && Number(value) === 0);
}
