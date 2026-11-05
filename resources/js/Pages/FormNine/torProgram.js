/** Resolve the displayed degree without changing the source academic records. */
export function getTorProgramDetails(data, options = {}) {
    const records = Array.isArray(data?.enrollmentRecord) ? data.enrollmentRecord : [];
    const recorded = String(records[records.length - 1]?.program ?? '');
    const sourceMajor = recorded.match(/\s+MAJOR\s+IN\s+(.+)$/i);
    const sourceProgram = recorded.replace(/\s+MAJOR\s+IN\s+.+$/i, '').trim();
    const program = typeof options.program === 'string' ? options.program : sourceProgram;
    const major = typeof options.majorOverride === 'string'
        ? options.majorOverride : options.major || sourceMajor?.[1] || '';
    const degree = program.trim() ? [program.trim(), major.trim() && `MAJOR IN ${major.trim()}`].filter(Boolean).join(' ') : '';
    return { program, major, degree };
}
