<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A student's final rating in a subject, from the midterm and final grades:
 * 0.0 in either means dropped; an average of 3.0–3.09 is 3.0; 3.1 and up is
 * 5.0 (failed); anything else is the average to one decimal.
 *
 * This is the only copy of the rule on the server. The grade sheets show a
 * live preview with the same rule (resources/js/Pages/Grades/GradeUtility.js);
 * tests/fixtures/final-ratings.json and the tests on both sides keep the two
 * identical.
 *
 * Once a class's final grades are deployed, the rating is saved in
 * student_subjects.final_rating, and records (TOR, exports, the student's own
 * record) show that saved value, so a released rating never changes after the
 * fact. Before that, or for rows saved before the column existed, it's worked
 * out from the two grades.
 */
class FinalRating
{
    private static ?bool $stored = null;

    /** The rating as "1.5", "3.0", "5.0", "0.0" (dropped), or null without both grades. */
    public static function compute($midterm, $final): ?string
    {
        $blank = fn($grade) => $grade === null || $grade === '';

        // A zero in either period is a drop, even with the other one blank.
        $zero = fn($grade) => ! $blank($grade) && is_numeric($grade) && (float) $grade === 0.0;
        if ($zero($midterm) || $zero($final)) {
            return '0.0';
        }

        if ($blank($midterm) || $blank($final)) {
            return null;
        }

        // Rounded to two decimals first, so 2.9 and 3.3 (3.0999999… in
        // floating point) count as 3.1, as they should.
        $average = round(((float) $midterm + (float) $final) / 2, 2);

        if ($average >= 3.0 && $average <= 3.09) {
            $average = 3.0;
        } elseif ($average > 3.09) {
            $average = 5.0;
        }

        return number_format($average, 1, '.', '');
    }

    /** "PASSED", "FAILED", "DROPPED", or null for no rating. */
    public static function remark(?string $rating): ?string
    {
        if ($rating === null || $rating === '') {
            return null;
        }

        if ((float) $rating === 0.0) {
            return 'DROPPED';
        }

        return (float) $rating >= 3.1 ? 'FAILED' : 'PASSED';
    }

    /**
     * A student subject's rating: the one saved when its final grades were
     * deployed, or else worked out from its grades. $row has midterm_grade,
     * final_grade and, when selected, final_rating.
     */
    public static function of(object $row): ?string
    {
        $saved = $row->final_rating ?? null;

        if ($saved !== null && $saved !== '') {
            return number_format((float) $saved, 1, '.', '');
        }

        return self::compute($row->midterm_grade ?? null, $row->final_grade ?? null);
    }

    /** Whether the final_rating column exists yet (the migration may not have run). */
    public static function isStored(): bool
    {
        return self::$stored ??= Schema::hasColumn('student_subjects', 'final_rating');
    }

    /** For a select list: the saved rating, or NULL until the column exists. */
    public static function column(string $as = 'final_rating')
    {
        return self::isStored()
            ? "student_subjects.final_rating as {$as}"
            : DB::raw("NULL as {$as}");
    }

    /**
     * Brings the saved rating up to date for these student subjects: saved
     * where the class's final grades are deployed, cleared everywhere else.
     * Call it after anything that changes grades or a deployment.
     */
    public static function sync(iterable $studentSubjectIds): void
    {
        if (! self::isStored()) {
            return;
        }

        $ids = collect($studentSubjectIds)->filter()->map(fn($id) => (int) $id)->unique()->values();

        foreach ($ids->chunk(500) as $chunk) {
            $rows = DB::table('student_subjects as ss')
                ->leftJoin('grade_submissions as gs', 'gs.year_section_subjects_id', '=', 'ss.year_section_subjects_id')
                ->whereIn('ss.id', $chunk->all())
                ->get(['ss.id', 'ss.midterm_grade', 'ss.final_grade', 'ss.final_rating', 'gs.final_status']);

            foreach ($rows as $row) {
                $rating = $row->final_status === 'deployed'
                    ? self::compute($row->midterm_grade, $row->final_grade)
                    : null;
                $current = $row->final_rating === null ? null : number_format((float) $row->final_rating, 1, '.', '');

                if ($current !== $rating) {
                    DB::table('student_subjects')->where('id', $row->id)->update(['final_rating' => $rating]);
                }
            }
        }
    }

    /** sync() for every student in a class. */
    public static function syncClass(int $classId): void
    {
        if (! self::isStored()) {
            return;
        }

        self::sync(DB::table('student_subjects')->where('year_section_subjects_id', $classId)->pluck('id'));
    }
}
