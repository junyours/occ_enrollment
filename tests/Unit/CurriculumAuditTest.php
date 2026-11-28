<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\EnrollmentCheck;
use Illuminate\Support\Facades\DB;

/**
 * Student Grades, by curriculum: grades laid over the student's curriculum in rounds, grades
 * matched by hand (an evaluator's wait for the program head), and the enrollment check using
 * the same matches. The fixture is EnrollmentTestCase.
 */
class CurriculumAuditTest extends EnrollmentTestCase
{
    private User $evaluator;

    protected function setUp(): void
    {
        parent::setUp();

        $this->evaluator = $this->makeUser('evaluator', 'EV-1');
        DB::table('faculty')->insert(['faculty_id' => $this->evaluator->id, 'department_id' => 1]);
    }

    private function audit(?User $as = null): array
    {
        return $this->actingAs($as ?? $this->programHead)->postJson('/student-grades/curriculum', ['id_no' => '2024-1-0001'])->assertOk()->json();
    }

    private function row(array $audit, string $code): array
    {
        return collect($audit['terms'])->flatMap(fn ($term) => $term['subjects'])->firstWhere('code', $code);
    }

    private function match(User $as, string $ref, ?string $code, string $scope = 'student')
    {
        [$type, $id] = explode(':', $ref);

        return $this->actingAs($as)->postJson('/student-grades/match', [
            'id_no' => '2024-1-0001', 'course_id' => 1, 'source_type' => $type, 'source_id' => (int) $id,
            'subject_id' => $code === null ? null : $this->subjectId($code), 'scope' => $scope,
        ]);
    }

    private function oldGrade(string $code, string $title, string $grade = '2.0'): string
    {
        return 'old:'.DB::table('student_grades')->insertGetId([
            'id_no' => '2024-1-0001', 'subject_code' => $code, 'subject' => $title, 'grade' => $grade, 'school_year' => '2023-2024', 'semester' => 'SECOND',
        ]);
    }

    private function transfereeGrade(string $code, string $title, string $grade = '1.75'): string
    {
        $record = DB::table('academic_records')->insertGetId([
            'student_id' => $this->student->id, 'record_type' => 'transferee', 'school_name' => 'Xavier University', 'school_year' => '2023-2024', 'semester' => 'first',
        ]);

        return 'record:'.DB::table('academic_record_subjects')->insertGetId(['academic_record_id' => $record, 'subject_code' => $code, 'descriptive_title' => $title, 'grade' => $grade]);
    }

    private function issues(int $classId): array
    {
        $result = app(EnrollmentCheck::class)->check($this->student->id, $this->sections['Y2-now'], [$classId]);

        return array_map(fn ($issue) => "{$issue['severity']}: {$issue['message']}", $result['classes'][0]['issues']);
    }

    // --- Matching in rounds --------------------------------------------------

    public function test_grades_are_matched_in_rounds(): void
    {
        $this->oldGrade('IT 104', 'IT104 title');     // code and title
        $this->oldGrade('CS201', 'IT201 title', '1.5'); // the same title under another code
        $this->oldGrade('OJT', 'On-the-Job Training'); // the same code, another title: a "check" match

        $audit = $this->audit();
        $status = fn ($code) => [$this->row($audit, $code)['status'], $this->row($audit, $code)['how']];

        $this->assertSame(['passed', 'auto'], $status('IT101'));
        $this->assertSame(['failed', 'auto'], $status('MATH101'));
        $this->assertSame(['in_progress', 'auto'], $status('IT103'));
        $this->assertSame(['passed', 'auto'], $status('IT104'));
        $this->assertSame(['passed', 'auto'], $status('IT201'));
        $this->assertSame('CS201', $this->row($audit, 'IT201')['record']['code']);
        $this->assertSame(['passed', 'check'], $status('OJT'));
        $this->assertSame([], $audit['others']);

        $this->assertSame(['units_earned' => 15, 'units_total' => 21, 'subjects' => 7, 'passed' => 5, 'in_progress' => 1, 'failed' => 1, 'not_taken' => 0, 'check' => 1, 'pending' => 0], $audit['summary']);
    }

    public function test_a_grade_counts_for_one_subject_only(): void
    {
        // A curriculum listing the same title twice (a data mistake): one grade fills one of them.
        $twin = $this->addSubject('IT105', 'IT104 title');
        DB::table('curriculum_term_subjects')->insert(['curriculum_term_id' => $this->termIds['Y1SUM'], 'subject_id' => $twin]);
        $this->oldGrade('IT 104', 'IT104 title');

        $audit = $this->audit();

        $this->assertSame('passed', $this->row($audit, 'IT104')['status']);
        $this->assertSame(1, $this->row($audit, 'IT104')['attempts']);
        $this->assertSame('not_taken', $this->row($audit, 'IT105')['status']);
    }

    public function test_a_grade_recorded_twice_joins_its_twin(): void
    {
        // Two subjects whose grades carry the same bare title, each also recorded twice.
        $this->oldGrade('IT104', 'CWTS/ROTC/LTS');
        $this->oldGrade('OJT', 'CWTS/ROTC/LTS');
        $this->oldGrade('OJT ', 'CWTS ROTC LTS');

        $audit = $this->audit();

        $this->assertSame(1, $this->row($audit, 'IT104')['attempts']);
        $this->assertSame(2, $this->row($audit, 'OJT')['attempts'], 'the copy joins its own code, not the same-titled IT104');
        $this->assertSame([], $audit['others']);
    }

    public function test_transferee_grades_wait_for_a_person(): void
    {
        $this->transfereeGrade('MATH 101', 'MATH101 title');

        $audit = $this->audit();

        $this->assertSame('failed', $this->row($audit, 'MATH101')['status']);
        $this->assertCount(1, $audit['others']);
        $this->assertSame($this->entries['MATH101'], $audit['others'][0]['suggestions'][0], 'the likeliest subject comes first');
    }

    // --- Matching by hand ----------------------------------------------------

    public function test_an_evaluators_match_waits_for_the_program_head(): void
    {
        $ref = $this->transfereeGrade('ALG', 'College Algebra');

        $audit = $this->match($this->evaluator, $ref, 'MATH101')->assertOk()->json();
        $this->assertSame('failed', $this->row($audit, 'MATH101')['status']);
        $this->assertSame('pending', $this->row($audit, 'MATH101')['pending'][0]['match']['status']);
        $this->assertSame(1, $audit['summary']['pending']);

        $pending = $this->actingAs($this->programHead)->postJson('/student-grades/pending-matches')->assertOk()->json();
        $this->assertTrue($pending['can_approve']);
        $this->assertSame('MATH101 MATH101 title', $pending['matches'][0]['target']);
        $this->assertSame('College Algebra', $pending['matches'][0]['grade']['title']);

        $this->actingAs($this->evaluator)->postJson("/student-grades/match/{$pending['matches'][0]['id']}/approve")->assertForbidden();
        $this->actingAs($this->programHead)->postJson("/student-grades/match/{$pending['matches'][0]['id']}/approve")->assertOk();

        $row = $this->row($this->audit(), 'MATH101');
        $this->assertSame(['passed', 'manual'], [$row['status'], $row['how']]);
        $this->assertSame([], $this->actingAs($this->programHead)->postJson('/student-grades/pending-matches')->json('matches'));
    }

    public function test_only_the_programs_department_can_match_or_approve(): void
    {
        $ref = $this->transfereeGrade('ALG', 'College Algebra');
        $otherHead = $this->makeUser('program_head', 'PH-2');
        DB::table('faculty')->insert(['faculty_id' => $otherHead->id, 'department_id' => 2]);

        $this->match($otherHead, $ref, 'MATH101')->assertForbidden();
        $this->match($this->evaluator, $ref, 'MATH101')->assertOk();

        $this->assertSame([], $this->actingAs($otherHead)->postJson('/student-grades/pending-matches')->json('matches'));
        $this->assertFalse($this->actingAs($this->evaluator)->postJson('/student-grades/pending-matches')->json('can_approve'));
        $this->assertSame(['change_curriculum' => true, 'match' => true, 'approve' => false], $this->audit($this->evaluator)['permissions']);
        $this->assertSame(['change_curriculum' => true, 'match' => true, 'approve' => false], $this->audit($this->makeUser('registrar', 'REG-1'))['permissions']);
    }

    public function test_a_program_heads_match_counts_at_once_and_can_be_undone(): void
    {
        $ref = $this->transfereeGrade('ALG', 'College Algebra');

        $row = $this->row($this->match($this->programHead, $ref, 'MATH101')->assertOk()->json(), 'MATH101');
        $this->assertSame(['passed', 'manual'], [$row['status'], $row['how']]);

        $this->actingAs($this->programHead)->postJson("/student-grades/match/{$row['record']['match']['id']}/undo")->assertOk();
        $this->assertSame('failed', $this->row($this->audit(), 'MATH101')['status']);
    }

    public function test_a_rejection_needs_a_reason(): void
    {
        $ref = $this->transfereeGrade('ALG', 'College Algebra');
        $this->match($this->evaluator, $ref, 'MATH101')->assertOk();
        $id = DB::table('student_grade_matches')->value('id');

        $this->actingAs($this->programHead)->postJson("/student-grades/match/{$id}/reject")->assertUnprocessable()->assertJsonValidationErrors('reason');
        $this->actingAs($this->programHead)->postJson("/student-grades/match/{$id}/reject", ['reason' => 'Not equivalent'])->assertOk();

        $audit = $this->audit();
        $this->assertSame('failed', $this->row($audit, 'MATH101')['status']);
        $this->assertNull($audit['others'][0]['match'], 'a rejected match no longer applies');
        $this->assertSame('Not equivalent', DB::table('student_grade_matches')->value('note'));
    }

    public function test_doesnt_count_hides_a_grade(): void
    {
        $ref = $this->oldGrade('NSTP', 'Something unrelated');

        $audit = $this->match($this->programHead, $ref, null)->assertOk()->json();

        $this->assertSame([], $audit['others']);
        $this->assertSame($ref, $audit['hidden'][0]['ref']);
    }

    public function test_a_check_match_can_be_confirmed(): void
    {
        $ref = $this->oldGrade('OJT', 'On-the-Job Training');

        $row = $this->row($this->match($this->programHead, $ref, 'OJT')->assertOk()->json(), 'OJT');

        $this->assertSame(['passed', 'manual'], [$row['status'], $row['how']]);
    }

    public function test_the_same_subject_for_everyone_makes_a_same_subject_group(): void
    {
        // The student took CS999 (in the 2018-2019 curriculum), which is really IT104.
        $cs999 = $this->addSubject('CS999', 'Applied Computing');
        DB::table('curriculum_term_subjects')->insert(['curriculum_term_id' => $this->termIds['OLD'], 'subject_id' => $cs999]);
        $enrollment = DB::table('enrolled_students')->where('student_id', $this->student->id)->value('id');
        $classRef = 'class:'.DB::table('student_subjects')->insertGetId([
            'enrolled_students_id' => $enrollment, 'year_section_subjects_id' => $this->makeClass('Y1-first', $cs999), 'midterm_grade' => 1.5, 'final_grade' => 1.5,
        ]);

        $this->match($this->evaluator, $classRef, 'IT104', 'everyone')->assertForbidden();
        $this->match($this->programHead, $this->oldGrade('X1', 'Old elective'), 'IT104', 'everyone')->assertUnprocessable();

        $audit = $this->match($this->programHead, $classRef, 'IT104', 'everyone')->assertOk()->json();

        $this->assertSame(['passed', 'auto'], [$this->row($audit, 'IT104')['status'], $this->row($audit, 'IT104')['how']]);
        $this->assertSame(1, DB::table('subject_groups')->count());
        $this->assertSame(0, DB::table('student_grade_matches')->count());
    }

    // --- The enrollment check uses the same matches ----------------------------

    public function test_the_enrollment_check_uses_matches_by_hand(): void
    {
        $this->needs('IT201', 'IT104');
        $class = $this->makeClass('Y2-now', $this->subjectId('IT201'));
        $ref = $this->transfereeGrade('ITX', 'Applied Software');

        $this->assertContains('warn: Needs IT104 IT104 title: no grade found.', $this->issues($class));

        $this->match($this->evaluator, $ref, 'IT104')->assertOk();
        $this->assertContains("note: Needs IT104 IT104 title: a credit for it is waiting for the program head's approval.", $this->issues($class));

        $this->actingAs($this->programHead)->postJson('/student-grades/match/'.DB::table('student_grade_matches')->value('id').'/approve')->assertOk();
        $this->assertSame([], array_values(array_filter($this->issues($class), fn ($issue) => str_contains($issue, 'IT104'))));
    }
}
