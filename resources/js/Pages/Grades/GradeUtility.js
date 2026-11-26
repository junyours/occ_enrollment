/**
 * The final rating from the two grades: 'DROPPED' for a 0 in either, '-'
 * without both, 3.0–3.09 is '3.0', 3.1 and up is '5.0', else one decimal.
 *
 * This is a live preview for the grade sheets. The official rating comes from
 * the server (app/Services/FinalRating.php); tests/fixtures/final-ratings.json
 * and tests/js/final-rating.test.mjs keep the two identical.
 */
export function computeFinalGrade(midterm, final) {
    if (midterm === 0 || midterm == '0' || midterm == '0.0' || final === 0 || final == '0' || final == '0.0') {
        return 'DROPPED';
    }

    if (midterm == null || midterm == '' || final == null || final == '') {
        return '-';
    }

    const avg = Number(
        (((Number(midterm) + Number(final)) / 2).toFixed(2))
    );
    

    if (avg >= 3.0 && avg <= 3.09) {
        return '3.0';
    }

    if (avg >= 3.1) {
        return '5.0';
    }

    const roundedAvg = Math.round((avg + Number.EPSILON) * 10) / 10;
    return roundedAvg.toFixed(1);
}

/**
 * The rating to show on a record: an old record's grade, else the rating the
 * server saved when the final grades were deployed, else the preview above.
 */
export function officialRating(classInfo) {
    if (classInfo?.grade) {
        return classInfo.grade;
    }

    const saved = classInfo?.final_rating;
    if (saved !== null && saved !== undefined && saved !== '' && !Number.isNaN(Number(saved))) {
        return Number(saved) === 0 ? 'DROPPED' : Number(saved).toFixed(1);
    }

    return computeFinalGrade(classInfo?.midterm_grade, classInfo?.final_grade);
}
