<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\EnrollmentCheck;
use App\Services\StudentCurricula;
use App\Services\StudentTypes;
use Illuminate\Support\Facades\DB;

/**
 * The checks while enrolling a student: prerequisites from the student's own curriculum,
 * already passed (also under another code or in old records), and the same subject twice.
 *
 * The fixture is EnrollmentTestCase.
 */
class EnrollmentCheckTest extends EnrollmentTestCase
{
    /** Issues for each class in the list, by subject code, when enrolling in 2nd year now. */
    private function check(array $classIds, string $section = 'Y2-now', ?User $student = null): array
    {
        $result = app(EnrollmentCheck::class)->check(($student ?? $this->student)->id, $this->sections[$section], $classIds);

        return collect($result['classes'])->mapWithKeys(fn ($c) => [$c['code'] => $c['issues']])->all();
    }

    private function messages(array $issues, ?string $severity = null): array
    {
        return array_values(array_map(fn ($i) => $i['message'], array_filter($issues, fn ($i) => $severity === null || $i['severity'] === $severity)));
    }

    // --- Prerequisites -------------------------------------------------------

    public function test_a_passed_prerequisite_and_enough_standing_give_no_warning(): void
    {
        $issues = $this->check([$this->makeClass('Y2-now', $this->subjectId('IT201'))]);

        $this->assertSame([], $issues['IT201']);
    }

    public function test_failed_missing_and_pending_prerequisites(): void
    {
        $this->needs('IT201', 'MATH101'); // failed
        $this->needs('IT201', 'IT104');   // never taken
        $this->needs('IT201', 'IT103');   // grade not out yet

        $issues = $this->check([$this->makeClass('Y2-now', $this->subjectId('IT201'))])['IT201'];

        $this->assertSame([
            'Needs MATH101 MATH101 title: failed (5.0) in 1st sem 2024–2025.',
            'Needs IT104 IT104 title: no grade found.',
        ], $this->messages($issues, EnrollmentCheck::WARN));
        $this->assertSame(['Needs IT103 IT103 title: grade not out yet (2nd sem 2024–2025).'], $this->messages($issues, EnrollmentCheck::NOTE));
    }

    public function test_a_prerequisite_in_the_same_list_warns(): void
    {
        $this->needs('IT201', 'IT104');

        $issues = $this->check([
            $this->makeClass('Y2-now', $this->subjectId('IT201')),
            $this->makeClass('Y1-now', $this->subjectId('IT104')),
        ]);

        $this->assertSame(['Needs IT104 IT104 title, which is in this same list: it has to be passed first.'], $this->messages($issues['IT201'], EnrollmentCheck::WARN));
    }

    public function test_year_standing(): void
    {
        DB::table('curriculum_term_subjects')->where('id', $this->entries['IT201'])->update(['required_year_level_id' => 3]);

        $issues = $this->check([$this->makeClass('Y2-now', $this->subjectId('IT201'))]);

        $this->assertSame(['Needs 3rd Year Standing; the student is in 2nd year.'], $this->messages($issues['IT201']));
    }

    // --- Already passed ------------------------------------------------------

    public function test_already_passed_also_under_another_confirmed_code(): void
    {
        $issues = $this->check([$this->makeClass('Y1-now', $this->subjectId('IT101'))]);
        $this->assertSame(['Already passed (1.5, 1st sem 2024–2025).'], $this->messages($issues['IT101'], EnrollmentCheck::WARN));

        // CS101 is a different code; once a program head groups it with IT101, the pass counts.
        $cs101 = $this->addSubject('CS101', 'Introduction to Computing');
        $class = $this->makeClass('Y1-now', $cs101);
        $this->assertSame([], $this->messages($this->check([$class])['CS101'], EnrollmentCheck::WARN));

        $group = DB::table('subject_groups')->insertGetId(['name' => 'Intro']);
        DB::table('subject_group_members')->insert([['subject_group_id' => $group, 'subject_id' => $cs101], ['subject_group_id' => $group, 'subject_id' => $this->subjectId('IT101')]]);
        $this->assertSame(['Already passed as IT101 (1.5, 1st sem 2024–2025).'], $this->messages($this->check([$class])['CS101'], EnrollmentCheck::WARN));
    }

    public function test_a_failed_subject_is_a_retake_note(): void
    {
        $issues = $this->check([$this->makeClass('Y1-now', $this->subjectId('MATH101'))]);

        $this->assertSame(['Retake: failed (5.0) in 1st sem 2024–2025.'], $this->messages($issues['MATH101']));
    }

    public function test_old_records_count_when_code_and_title_agree(): void
    {
        $other = $this->makeUser('student', '2019-1-0002');
        DB::table('student_grades')->insert([
            ['id_no' => '2019-1-0002', 'subject_code' => 'IT 102', 'subject' => 'IT102 title', 'grade' => '2.0', 'school_year' => '2019-2020', 'semester' => 'FIRST'],
            // Same code, different subject: doesn't count for IT104.
            ['id_no' => '2019-1-0002', 'subject_code' => 'IT104', 'subject' => 'Programming 2', 'grade' => '1.5', 'school_year' => '2019-2020', 'semester' => 'SECOND'],
        ]);
        // FES: the final grade was left at 0, so it's worked out from the period grades.
        DB::table('fes_student_grades')->insert(['id_no' => '2019-1-0002', 'subject_code' => 'IT-101', 'subject' => 'IT101 title', 'school_year' => '2020-2021', 'semester' => 'First', 'midterm' => 2.9, 'final' => 2.6, 'finalGrade' => 0]);
        // A transferee record without a code can't be matched.
        $record = DB::table('academic_records')->insertGetId(['student_id' => $other->id, 'record_type' => 'transferee', 'school_year' => '2018-2019', 'semester' => 'first']);
        DB::table('academic_record_subjects')->insert(['academic_record_id' => $record, 'subject_code' => '-', 'descriptive_title' => 'MATH101 title', 'grade' => '1.75']);

        $issues = $this->check([
            $this->makeClass('Y1-now', $this->subjectId('IT102')),
            $this->makeClass('Y1-now', $this->subjectId('IT101')),
            $this->makeClass('Y1-now', $this->subjectId('IT104')),
            $this->makeClass('Y1-now', $this->subjectId('MATH101')),
        ], 'Y1-now', $other);

        $this->assertSame(['Already passed (2.0, 1st sem 2019–2020).'], $this->messages($issues['IT102'], EnrollmentCheck::WARN));
        $this->assertSame(['Already passed (2.8, 1st sem 2020–2021).'], $this->messages($issues['IT101'], EnrollmentCheck::WARN));
        $this->assertSame([], $this->messages($issues['IT104'], EnrollmentCheck::WARN));
        $this->assertSame([], $this->messages($issues['MATH101'], EnrollmentCheck::WARN));
    }

    // --- The same subject twice ----------------------------------------------

    public function test_the_same_subject_twice_is_blocked(): void
    {
        $first = $this->makeClass('Y2-now', $this->subjectId('IT104'));
        $second = $this->makeClass('Y1-now', $this->subjectId('IT104'));
        $other = $this->makeClass('Y2-now', $this->subjectId('IT201'));

        $issues = $this->check([$first, $second, $other]);
        $this->assertSame(['IT104 IT104 title is already in this list (another section).'], $this->messages($issues['IT104'], EnrollmentCheck::BLOCK));
        $this->assertSame([], $this->messages($issues['IT201'], EnrollmentCheck::BLOCK));

        // Only added classes are reported, and a different code only once it's grouped.
        $check = app(EnrollmentCheck::class);
        $this->assertSame([], $check->duplicates([$first, $other], [$other]));
        $cs104 = $this->makeClass('Y1-now', $this->addSubject('CS104', 'IT104 title'));
        $this->assertSame([], $check->duplicates([$first, $cs104], [$cs104]));
        $group = DB::table('subject_groups')->insertGetId(['name' => 'IT104']);
        DB::table('subject_group_members')->insert([['subject_group_id' => $group, 'subject_id' => $this->subjectId('IT104')], ['subject_group_id' => $group, 'subject_id' => DB::table('subjects')->where('subject_code', 'CS104')->value('id')]]);
        $this->assertSame(['CS104 IT104 title is the same subject as IT104 IT104 title, which is already in this list.'], $check->duplicates([$first, $cs104], [$cs104]));
    }

    // --- The student's curriculum --------------------------------------------

    public function test_a_backlog_student_keeps_the_curriculum_of_their_first_term(): void
    {
        $backlog = $this->makeUser('student', '2018-1-0003');
        DB::table('school_years')->insert(['id' => 5, 'semester_id' => 1, 'start_year' => 2018, 'end_year' => 2019]);
        $this->sections['Y1-2018'] = DB::table('year_section')->insertGetId(['school_year_id' => 5, 'course_id' => 1, 'year_level_id' => 1]);
        $this->enroll('Y1-2018', ['OLD101' => [2.0, 2.0]], $backlog);

        $curriculum = app(StudentCurricula::class)->resolve($backlog->id, 1, 2);
        $this->assertSame([2, 'first_term'], [$curriculum['id'], $curriculum['source']]);

        // IT201 isn't in his 2018-2019 curriculum, so the class's curriculum supplies its prerequisites.
        $issues = $this->check([$this->makeClass('Y2-now', $this->subjectId('IT201'))], 'Y2-now', $backlog);
        $this->assertSame(['Not in the student\'s curriculum (BSIT 2018–2019); prerequisites are from BSIT 2024–2025.'], $this->messages($issues['IT201'], EnrollmentCheck::NOTE));
        $this->assertSame(['Needs IT102 IT102 title: no grade found.'], $this->messages($issues['IT201'], EnrollmentCheck::WARN));
    }

    public function test_a_new_student_gets_the_curriculum_their_classes_come_from(): void
    {
        $freshman = $this->makeUser('student', '2025-1-0004');

        $curriculum = app(StudentCurricula::class)->resolve($freshman->id, 1, 1, 12);

        $this->assertSame([1, 'active'], [$curriculum['id'], $curriculum['source']]);
        $this->assertSame('BSIT 2024–2025', $curriculum['label']);
    }

    public function test_staff_can_set_a_students_curriculum(): void
    {
        $set = fn (User $user, array $data = []) => $this->actingAs($user)->postJson('/enrollment/student-curriculum', $data + [
            'student_id_no' => '2024-1-0001', 'course_id' => 1, 'curriculum_id' => 2,
        ]);

        $otherHead = $this->makeUser('program_head', 'PH-2');
        DB::table('faculty')->insert(['faculty_id' => $otherHead->id, 'department_id' => 2]);
        $set($otherHead)->assertForbidden();
        $set($this->programHead, ['curriculum_id' => 3])->assertUnprocessable(); // a BEED curriculum

        $set($this->programHead)->assertOk();
        $curriculum = app(StudentCurricula::class)->resolve($this->student->id, 1, 2);
        $this->assertSame([2, 'set'], [$curriculum['id'], $curriculum['source']]);

        $set($this->makeUser('registrar', 'REG-1'), ['curriculum_id' => null])->assertOk();
        $this->assertSame('first_term', app(StudentCurricula::class)->resolve($this->student->id, 1, 2)['source']);
    }

    // --- Endpoints -----------------------------------------------------------

    public function test_the_check_endpoint_finds_the_students_section_by_school_year(): void
    {
        $now = $this->enroll('Y2-now', []);
        $class = $this->makeClass('Y2-now', $this->subjectId('IT101'));

        $response = $this->actingAs($this->programHead)->postJson('/enrollment/check-classes', [
            'student_id_no' => '2024-1-0001', 'school_year_id' => 12, 'class_ids' => [$class], 'new_class_ids' => [$class],
        ])->assertOk();

        $response->assertJsonPath('curriculum.label', 'BSIT 2024–2025')
            ->assertJsonPath('curriculum.source', 'first_term')
            ->assertJsonPath('can_change_curriculum', true)
            ->assertJsonPath('classes.0.class_id', $class)
            ->assertJsonPath('classes.0.issues.0.type', 'passed');
        $this->assertNotNull($now);
    }

    public function test_saving_staged_subjects_blocks_duplicates_and_only_removes_the_students_own(): void
    {
        $enrollment = $this->enroll('Y2-now', ['IT201' => [null, null]]);
        $other = $this->makeUser('student', '2024-1-0009');
        $othersEnrollment = $this->enroll('Y2-now', ['IT104' => [null, null]], $other);
        $othersSubject = DB::table('student_subjects')->where('enrolled_students_id', $othersEnrollment)->value('id');
        $save = fn (array $data) => $this->actingAs($this->programHead)->postJson('/enrollment/save-staged-subjects', $data + [
            'studentId' => '2024-1-0001', 'schoolYearId' => 12, 'addedSubjects' => [], 'removedSubjects' => [],
        ]);

        $save(['addedSubjects' => [['classId' => $this->makeClass('Y1-now', $this->subjectId('IT201'))]]])
            ->assertStatus(422)->assertJsonPath('message', 'IT201 IT201 title is already in this list (another section).');

        $save(['removedSubjects' => [['studentSubjectId' => $othersSubject]], 'addedSubjects' => [['classId' => $this->makeClass('Y1-now', $this->subjectId('IT104'))]]])->assertOk();
        $this->assertTrue(DB::table('student_subjects')->where('id', $othersSubject)->exists(), "another student's subject isn't removed");
        $this->assertSame(2, DB::table('student_subjects')->where('enrolled_students_id', $enrollment)->count());
    }

    public function test_enrolling_blocks_the_same_subject_twice(): void
    {
        $newcomer = $this->makeUser('student', '2025-1-0005');
        $classes = [$this->makeClass('Y1-now', $this->subjectId('IT101')), $this->makeClass('Y1-now', $this->subjectId('IT101'))];

        $this->actingAs($this->programHead)
            ->postJson("/enrollment/enroll-student/{$newcomer->id}/{$this->sections['Y1-now']}/1/2025-06-16", ['classID' => $classes])
            ->assertStatus(400)
            ->assertJsonPath('message', 'IT101 IT101 title is already in this list (another section).');

        $this->assertSame(0, DB::table('enrolled_students')->where('student_id', $newcomer->id)->count());
    }

    // --- Student type --------------------------------------------------------

    /** The suggested type when enrolling into 1st sem 2025-2026 (school year 12). */
    private function suggestType(User $student): array
    {
        return app(StudentTypes::class)->suggest($student->id, 12);
    }

    public function test_a_student_enrolled_last_semester_is_old(): void
    {
        $this->assertSame(
            ['type_id' => StudentTypes::OLD, 'name' => 'Old', 'reason' => 'Enrolled in 2nd sem 2024–2025.'],
            $this->suggestType($this->student),
        );
    }

    public function test_a_student_who_skipped_a_semester_is_a_returnee(): void
    {
        $back = $this->makeUser('student', '2024-1-0006');
        $this->enroll('Y1-first', ['IT101' => [2.0, 2.0]], $back);

        $this->assertSame(
            ['type_id' => StudentTypes::RETURNEE, 'name' => 'Returnee', 'reason' => 'Last enrolled in 1st sem 2024–2025; skipped 2nd sem 2024–2025.'],
            $this->suggestType($back),
        );
    }

    public function test_summer_doesnt_count_as_skipping(): void
    {
        // Summer 2024-2025 comes after 2nd sem 2024-2025 and before 1st sem 2025-2026.
        DB::table('school_years')->insert(['id' => 13, 'semester_id' => 3, 'start_year' => 2024, 'end_year' => 2025]);
        $this->sections['Summer'] = DB::table('year_section')->insertGetId(['school_year_id' => 13, 'course_id' => 1, 'year_level_id' => 1]);
        $summer = $this->makeUser('student', '2024-1-0007');
        $this->enroll('Y1-first', ['IT101' => [2.0, 2.0]], $summer);
        $this->enroll('Summer', ['IT104' => [2.0, 2.0]], $summer);

        // The main student didn't take the summer: still Old.
        $this->assertSame(StudentTypes::OLD, $this->suggestType($this->student)['type_id']);
        // Taking the summer right after the previous semester counts as continuing.
        $this->assertSame(
            ['type_id' => StudentTypes::OLD, 'name' => 'Old', 'reason' => 'Enrolled in Summer 2024–2025.'],
            $this->suggestType($summer),
        );
    }

    public function test_old_records_transferee_records_and_no_records(): void
    {
        $oldTimer = $this->makeUser('student', '2021-1-0008');
        DB::table('student_grades')->insert(['id_no' => '2021-1-0008', 'subject_code' => 'IT101', 'subject' => 'IT101 title', 'grade' => '2.0', 'school_year' => '2022-2023', 'semester' => 'SECOND']);
        $this->assertSame(
            ['type_id' => StudentTypes::RETURNEE, 'name' => 'Returnee', 'reason' => 'Last enrolled in 2nd sem 2022–2023; skipped 2nd sem 2024–2025.'],
            $this->suggestType($oldTimer),
        );

        $transferee = $this->makeUser('student', '2025-1-0010');
        DB::table('academic_records')->insert(['student_id' => $transferee->id, 'record_type' => 'transferee', 'school_name' => 'Xavier University']);
        $this->assertSame(
            ['type_id' => StudentTypes::TRANSFEREE, 'name' => 'Transferee', 'reason' => 'Has a transferee record from Xavier University.'],
            $this->suggestType($transferee),
        );

        $this->assertSame(
            ['type_id' => null, 'name' => null, 'reason' => 'No records at OCC yet: choose Freshman or Transferee.'],
            $this->suggestType($this->makeUser('student', '2025-1-0011')),
        );
    }

    public function test_the_student_status_endpoint(): void
    {
        DB::table('user_information')->insert(['user_id' => $this->student->id, 'first_name' => 'Ana', 'last_name' => 'Cruz']);
        $status = fn (int $studentId) => $this->actingAs($this->programHead)->postJson('/enrollment/student-status', [
            'student_id' => $studentId, 'year_section_id' => $this->sections['Y2-now'],
        ]);

        $status($this->student->id)->assertOk()
            ->assertJsonPath('student.user_id_no', '2024-1-0001')
            ->assertJsonPath('student.first_name', 'Ana')
            ->assertJsonPath('enrolled', false)
            ->assertJsonPath('suggested_type.type_id', StudentTypes::OLD);

        $this->enroll('Y2-now', []);
        $status($this->student->id)->assertOk()->assertJsonPath('enrolled', true);

        $status($this->programHead->id)->assertUnprocessable(); // not a student
    }
}
