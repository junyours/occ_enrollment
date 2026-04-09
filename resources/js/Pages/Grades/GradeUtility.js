export function computeFinalGrade(midterm, final) {
    if (midterm === 0 || final === 0) {
        return 'DROPPED';
    }

    if (midterm == null || final == null) {
        return '-';
    }

    const avg = (Number(midterm) + Number(final)) / 2;

    if (avg >= 3.0 && avg <= 3.09) {
        return '3.0';
    }

    if (avg >= 3.1) {
        return '5.0';
    }

    const roundedAvg = Math.round((avg + Number.EPSILON) * 10) / 10;
    return roundedAvg.toFixed(1);
}