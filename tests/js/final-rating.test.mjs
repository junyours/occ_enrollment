// The grade sheets' preview rule must give the same answers as the server's
// (app/Services/FinalRating.php). Both are checked against one fixture.
// Run: npm run test:js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { computeFinalGrade, officialRating } from '../../resources/js/Pages/Grades/GradeUtility.js';

const { cases } = JSON.parse(readFileSync(new URL('../fixtures/final-ratings.json', import.meta.url), 'utf8'));

// The preview shows 'DROPPED' for the server's "0.0" and '-' for no rating.
const shown = (rating) => (rating === null ? '-' : rating === '0.0' ? 'DROPPED' : rating);

test('the preview matches the server for every grade pair', () => {
    assert.ok(cases.length > 1700);
    for (const [midterm, final, expected] of cases) {
        assert.equal(computeFinalGrade(midterm, final), shown(expected), `midterm ${midterm}, final ${final}`);
    }
});

test('grades given as numbers get the same answers', () => {
    for (const [midterm, final, expected] of cases) {
        if (midterm === null || final === null || midterm === '' || final === '') continue;
        assert.equal(computeFinalGrade(Number(midterm), Number(final)), shown(expected), `midterm ${midterm}, final ${final}`);
    }
});

test('records show the saved rating first', () => {
    assert.equal(officialRating({ final_rating: '2.0', midterm_grade: '1.0', final_grade: '1.0' }), '2.0');
    assert.equal(officialRating({ final_rating: 0, midterm_grade: '0.0', final_grade: '2.0' }), 'DROPPED');
    assert.equal(officialRating({ final_rating: null, midterm_grade: '2.9', final_grade: '3.3' }), '5.0');
    assert.equal(officialRating({ grade: 'INC', final_rating: '1.0' }), 'INC');
    assert.equal(officialRating({ midterm_grade: null, final_grade: null }), '-');
});
