<?php

namespace Tests\Unit;

use App\Services\FinalRating;
use PHPUnit\Framework\TestCase;

/**
 * The server's final-rating rule. tests/fixtures/final-ratings.json is shared
 * with tests/js/final-rating.test.mjs, which checks the grade sheets' preview
 * (resources/js/Pages/Grades/GradeUtility.js) against the same answers.
 */
class FinalRatingTest extends TestCase
{
    public function test_every_grade_pair_matches_the_shared_fixture(): void
    {
        $fixture = json_decode(file_get_contents(__DIR__ . '/../fixtures/final-ratings.json'), true, flags: JSON_THROW_ON_ERROR);

        self::assertGreaterThan(1700, count($fixture['cases']));

        foreach ($fixture['cases'] as [$midterm, $final, $expected]) {
            self::assertSame($expected, FinalRating::compute($midterm, $final), "midterm {$midterm}, final {$final}");
        }
    }

    public function test_the_boundaries(): void
    {
        self::assertSame('3.0', FinalRating::compute('3.0', '3.1'));   // 3.05
        self::assertSame('5.0', FinalRating::compute('2.9', '3.3'));   // 3.0999… in floating point
        self::assertSame('5.0', FinalRating::compute(3.1, 3.1));
        self::assertSame('2.9', FinalRating::compute('2.8', '2.9'));   // 2.85 rounds up
        self::assertSame('1.0', FinalRating::compute(1, 1));
        self::assertSame('0.0', FinalRating::compute('0.0', '1.5'));
        self::assertSame('0.0', FinalRating::compute(0, null));        // a drop with one period blank
        self::assertNull(FinalRating::compute(null, '2.0'));
        self::assertNull(FinalRating::compute('', ''));
    }

    public function test_remarks(): void
    {
        self::assertSame('PASSED', FinalRating::remark('3.0'));
        self::assertSame('FAILED', FinalRating::remark('5.0'));
        self::assertSame('DROPPED', FinalRating::remark('0.0'));
        self::assertNull(FinalRating::remark(null));
    }

    public function test_a_saved_rating_wins_over_the_grades(): void
    {
        // Saved at deploy, then a grade changed without a re-release.
        self::assertSame('2.0', FinalRating::of((object) ['final_rating' => '2.00', 'midterm_grade' => '1.0', 'final_grade' => '1.0']));
        self::assertSame('1.0', FinalRating::of((object) ['final_rating' => null, 'midterm_grade' => '1.0', 'final_grade' => '1.0']));
        self::assertSame('1.5', FinalRating::of((object) ['midterm_grade' => '1.5', 'final_grade' => '1.5']));
        self::assertNull(FinalRating::of((object) ['final_rating' => '', 'midterm_grade' => null, 'final_grade' => '1.0']));
    }
}
