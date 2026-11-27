<?php

namespace Tests\Unit;

use App\Services\CurriculumComparison;
use Illuminate\Support\Facades\DB;

/** Comparing two curriculum years of the same program. */
class CurriculumCompareTest extends CurriculumTestCase
{
    private int $newCurriculum;

    /** @var array<string, int> term key => id, for the newer curriculum */
    private array $newTerms = [];

    protected function setUp(): void
    {
        parent::setUp();

        // Curriculum 4: BSIT 2025-2026, the "newer" year compared against curriculum 1 (2024-2025).
        $this->newCurriculum = DB::table('curriculum')->insertGetId(['course_id' => 1, 'school_year_start' => 2025, 'school_year_end' => 2026]);
        foreach (['Y1S1' => [1, 1], 'Y1S2' => [1, 2], 'Y2S1' => [2, 1]] as $key => [$year, $semester]) {
            $this->newTerms[$key] = DB::table('curriculum_term')->insertGetId(['curriculum_id' => $this->newCurriculum, 'year_level_id' => $year, 'semester_id' => $semester]);
        }
    }

    private function subjectIdOf(string $code): int
    {
        return (int) DB::table('curriculum_term_subjects')->where('id', $this->entries[$code])->value('subject_id');
    }

    /** Adds an entry to the newer curriculum, reusing a subject record or creating a new one. */
    private function addNew(string $term, int|array $subject): int
    {
        $subjectId = is_int($subject) ? $subject : DB::table('subjects')->insertGetId($subject);

        return DB::table('curriculum_term_subjects')->insertGetId(['curriculum_term_id' => $this->newTerms[$term], 'subject_id' => $subjectId]);
    }

    private function rowFor(array $result, string $code): ?array
    {
        foreach ($result['rows'] as $row) {
            if (($row['to']['code'] ?? null) === $code || ($row['to'] === null && $row['from']['code'] === $code)) {
                return $row;
            }
        }

        return null;
    }

    public function test_classifies_added_removed_changed_and_unchanged_subjects(): void
    {
        // Older year: IT201 requires IT102.
        DB::table('pre_requisite_subjects')->insert(['curriculum_term_subjects_id' => $this->entries['IT201'], 'required_term_subject_id' => $this->entries['IT102']]);

        $this->addNew('Y1S1', $this->subjectIdOf('IT101'));                                                            // unchanged
        $this->addNew('Y1S1', ['subject_code' => 'MATH-1', 'descriptive_title' => 'MATH101 title']);                 // code renumbered
        $newIt103 = $this->addNew('Y1S1', $this->subjectIdOf('IT103'));                                               // moved: 2nd sem -> 1st sem
        $newIt201 = $this->addNew('Y2S1', $this->subjectIdOf('IT201'));                                               // prerequisites changed
        DB::table('pre_requisite_subjects')->insert(['curriculum_term_subjects_id' => $newIt201, 'required_term_subject_id' => $newIt103]);
        $this->addNew('Y1S2', ['subject_code' => 'IT104', 'descriptive_title' => 'Integrated Application Software']);  // same code, new title
        $this->addNew('Y2S1', ['subject_code' => 'CAP101', 'descriptive_title' => 'Capstone Project']);              // added
        // Not carried over: IT102, OJT -> removed.

        $result = (new CurriculumComparison())->compare(1, $this->newCurriculum);

        $this->assertSame('unchanged', $this->rowFor($result, 'IT101')['status']);

        $math = $this->rowFor($result, 'MATH-1');
        $this->assertSame(['changed', ['code'], 'MATH101'], [$math['status'], $math['changes'], $math['from']['code']]);

        $it103 = $this->rowFor($result, 'IT103');
        $this->assertSame(['changed', ['moved']], [$it103['status'], $it103['changes']]);

        $it201 = $this->rowFor($result, 'IT201');
        $this->assertSame(['prerequisites'], $it201['changes']);
        $this->assertSame(['IT102'], $it201['from']['prerequisites']);
        $this->assertSame(['IT103'], $it201['to']['prerequisites']);

        $it104 = $this->rowFor($result, 'IT104');
        $this->assertSame('changed', $it104['status']);
        $this->assertContains('title', $it104['changes']);

        $this->assertSame('added', $this->rowFor($result, 'CAP101')['status']);
        foreach (['IT102', 'OJT'] as $code) {
            $this->assertSame('removed', $this->rowFor($result, $code)['status'], $code);
        }

        $this->assertSame(['added' => 1, 'removed' => 2, 'changed' => 4, 'unchanged' => 1], $result['counts']);
        $this->assertSame(7, $result['from']['subjects']);
        $this->assertSame(6, $result['to']['subjects']);
    }

    public function test_renumbered_prerequisite_is_not_a_change(): void
    {
        DB::table('pre_requisite_subjects')->insert(['curriculum_term_subjects_id' => $this->entries['IT201'], 'required_term_subject_id' => $this->entries['MATH101']]);

        $newMath = $this->addNew('Y1S1', ['subject_code' => 'MATH-1', 'descriptive_title' => 'MATH101 title']);
        $newIt201 = $this->addNew('Y2S1', $this->subjectIdOf('IT201'));
        DB::table('pre_requisite_subjects')->insert(['curriculum_term_subjects_id' => $newIt201, 'required_term_subject_id' => $newMath]);

        $row = $this->rowFor((new CurriculumComparison())->compare(1, $this->newCurriculum), 'IT201');

        $this->assertSame('unchanged', $row['status']);
    }

    public function test_tolerates_small_title_differences(): void
    {
        $this->assertSame(
            CurriculumComparison::canonicalTitle('Readings in Philippine History'),
            CurriculumComparison::canonicalTitle('Reading in Philippine History')
        );
        $this->assertSame(
            CurriculumComparison::canonicalTitle('Data Structures & Algorithm'),
            CurriculumComparison::canonicalTitle('Data Structures and Algorithms')
        );
        $this->assertSame(
            CurriculumComparison::canonicalTitle('Ethics'),
            CurriculumComparison::canonicalTitle('Ethics 25-26 curr')
        );
        $this->assertSame(
            CurriculumComparison::canonicalTitle('IT Elective 1: Advanced Database System'),
            CurriculumComparison::canonicalTitle('Advanced Database System')
        );
        $this->assertGreaterThanOrEqual(
            CurriculumComparison::SIMILAR_TITLE_THRESHOLD,
            CurriculumComparison::titleSimilarity('entrepreneurial mind', 'entrepreneural mind')
        );
        $this->assertLessThan(
            CurriculumComparison::SIMILAR_TITLE_THRESHOLD,
            CurriculumComparison::titleSimilarity('team sport', 'accounting for it')
        );
    }

    public function test_compare_endpoint_returns_the_differences(): void
    {
        $this->addNew('Y1S1', $this->subjectIdOf('IT101'));

        $this->actingAs($this->programHead)
            ->postJson('/curriculum-compare/'.md5('1'), ['from' => 1, 'to' => $this->newCurriculum])
            ->assertOk()
            ->assertJsonPath('counts.unchanged', 1)
            ->assertJsonPath('to.subjects', 1);
    }

    public function test_compare_endpoint_rejects_bad_choices(): void
    {
        $url = '/curriculum-compare/'.md5('1');

        $this->actingAs($this->programHead)->postJson($url, ['from' => 1, 'to' => 1])->assertJsonValidationErrors('to');
        // Curriculum 3 belongs to course 2.
        $this->actingAs($this->programHead)->postJson($url, ['from' => 1, 'to' => 3])->assertJsonValidationErrors('from');
    }

    public function test_other_department_cannot_compare(): void
    {
        $otherHead = $this->makeUser('program_head', 'PH-2');
        DB::table('faculty')->insert(['faculty_id' => $otherHead->id, 'department_id' => 2]);

        $this->actingAs($otherHead)
            ->postJson('/curriculum-compare/'.md5('1'), ['from' => 1, 'to' => $this->newCurriculum])
            ->assertForbidden();
        $this->actingAs($otherHead)->get('/curriculum-compare/'.md5('1'))->assertForbidden();
    }
}
