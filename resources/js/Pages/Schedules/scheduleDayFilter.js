export const DAY_OPTIONS = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
].map((label) => ({ value: label.toLowerCase(), label }));

function dayIndex(value) {
    const token = value.trim().toLowerCase();
    return DAY_OPTIONS.findIndex(({ value: day }) => token === day || token === day.slice(0, 3));
}

export function getScheduleDays(dayFormat) {
    if (typeof dayFormat !== 'string') return [];

    const indexes = new Set();
    for (const part of dayFormat.replace(/[–—]/g, '-').split(',')) {
        const range = part.split('-');
        if (range.length === 1) {
            const index = dayIndex(range[0]);
            if (index !== -1) indexes.add(index);
        } else if (range.length === 2) {
            const start = dayIndex(range[0]);
            const end = dayIndex(range[1]);
            if (start !== -1 && end >= start) {
                for (let index = start; index <= end; index++) indexes.add(index);
            }
        }
    }

    return DAY_OPTIONS.filter((_, index) => indexes.has(index)).map(({ label }) => label);
}

export function filterSchedulesByDays(schedules = [], selectedDays = []) {
    if (!Array.isArray(schedules)) return [];
    if (selectedDays.length === 0) return schedules;

    const selected = new Set(selectedDays.map((day) => day.toLowerCase()));
    const matchingDays = (day) => getScheduleDays(day).filter((value) => selected.has(value.toLowerCase()));

    return schedules.flatMap((schedule) => {
        const mainDays = matchingDays(schedule.day);
        const secondary = schedule.secondary_schedule;
        const secondaryDays = secondary ? matchingDays(secondary.day) : [];

        if (mainDays.length > 0) {
            return [{
                ...schedule,
                day: mainDays.join(', '),
                secondary_schedule: secondaryDays.length > 0
                    ? { ...secondary, day: secondaryDays.join(', ') }
                    : null,
            }];
        }

        if (secondaryDays.length > 0) {
            // Keep one class record and display the matching secondary meeting in the main row.
            return [{
                ...schedule,
                day: secondaryDays.join(', '),
                start_time: secondary.start_time,
                end_time: secondary.end_time,
                room_id: secondary.room_id,
                room_name: secondary.room_name,
                faculty_id: secondary.faculty_id ?? schedule.faculty_id,
                secondary_schedule: null,
            }];
        }

        return [];
    });
}
