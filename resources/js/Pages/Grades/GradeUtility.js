export function computeFinalGrade(midterm, final) {
    // Dropped if either is explicitly zero
    if (midterm === 0 || final === 0) {
        return 'DROPPED';
    }

    // Missing grades
    if (midterm == null || final == null) {
        return '-';
    }

    const avg = (Number(midterm) + Number(final)) / 2;
    const finalRating = avg >= 3.05 ? 5.0 : avg;

    return (Math.round(finalRating * 10) / 10).toFixed(1);
}
