<?php

namespace Tests\Unit;

use App\Models\User;
use Illuminate\Support\Facades\DB;

/**
 * Curriculum changes are limited to the program head's own department:
 * removing a subject, adding a semester, choosing the active curriculum,
 * and creating a curriculum year.
 */
class CurriculumPermissionsTest extends CurriculumTestCase
{
    private User $otherHead;

    protected function setUp(): void
    {
        parent::setUp();

        // Program head of department 2 (BEED), which doesn't own course 1 (BSIT).
        $this->otherHead = $this->makeUser('program_head', 'PH-2');
        DB::table('faculty')->insert(['faculty_id' => $this->otherHead->id, 'department_id' => 2]);
    }

    // --- Remove a subject from a curriculum ---------------------------------

    public function test_other_department_cannot_remove_a_curriculum_subject(): void
    {
        $this->actingAs($this->otherHead)
            ->postJson('/api/delete/curr-subject/'.$this->entries['IT101'])
            ->assertForbidden();

        $this->assertTrue(DB::table('curriculum_term_subjects')->where('id', $this->entries['IT101'])->exists());
    }

    public function test_own_department_can_remove_a_curriculum_subject(): void
    {
        $this->actingAs($this->programHead)
            ->postJson('/api/delete/curr-subject/'.$this->entries['IT101'])
            ->assertOk();

        $this->assertFalse(DB::table('curriculum_term_subjects')->where('id', $this->entries['IT101'])->exists());
    }

    public function test_removing_an_unknown_subject_is_not_found(): void
    {
        $this->actingAs($this->programHead)->postJson('/api/delete/curr-subject/999999')->assertNotFound();
    }

    // --- Add a semester -----------------------------------------------------

    public function test_other_department_cannot_add_a_semester(): void
    {
        $this->actingAs($this->otherHead)
            ->post('/api/addSemester', ['curr_id' => 1, 'year_level_id' => 3, 'semester_id' => 1])
            ->assertForbidden();

        $this->assertFalse(DB::table('curriculum_term')->where(['curriculum_id' => 1, 'year_level_id' => 3])->exists());
    }

    public function test_own_department_can_add_a_semester_once(): void
    {
        $this->actingAs($this->programHead)
            ->post('/api/addSemester', ['curr_id' => 1, 'year_level_id' => 3, 'semester_id' => 1])
            ->assertSessionHasNoErrors();
        $this->assertSame(1, DB::table('curriculum_term')->where(['curriculum_id' => 1, 'year_level_id' => 3, 'semester_id' => 1])->count());

        // Same semester again is refused.
        $this->actingAs($this->programHead)
            ->from('/curriculum')
            ->post('/api/addSemester', ['curr_id' => 1, 'year_level_id' => 3, 'semester_id' => 1])
            ->assertSessionHasErrors('semester_id');
        $this->assertSame(1, DB::table('curriculum_term')->where(['curriculum_id' => 1, 'year_level_id' => 3, 'semester_id' => 1])->count());
    }

    public function test_adding_a_semester_requires_valid_input(): void
    {
        $this->actingAs($this->programHead)
            ->from('/curriculum')
            ->post('/api/addSemester', ['curr_id' => 999, 'year_level_id' => 9, 'semester_id' => 9])
            ->assertSessionHasErrors(['curr_id', 'year_level_id', 'semester_id']);
    }

    // --- Choose the active curriculum ---------------------------------------

    public function test_other_department_cannot_change_the_active_curriculum(): void
    {
        $this->actingAs($this->otherHead)
            ->postJson('/set-curriculum-term-active', ['courseId' => 1, 'yearLevel' => 1, 'curriculumId' => 1])
            ->assertForbidden();

        $this->assertSame(0, DB::table('curriculum_term')->where('active', 1)->count());
    }

    public function test_active_curriculum_must_belong_to_the_program(): void
    {
        // Curriculum 3 belongs to course 2, not course 1.
        $this->actingAs($this->programHead)
            ->postJson('/set-curriculum-term-active', ['courseId' => 1, 'yearLevel' => 1, 'curriculumId' => 3])
            ->assertStatus(422)
            ->assertJsonValidationErrors('curriculumId');
    }

    public function test_own_department_can_change_the_active_curriculum(): void
    {
        $this->actingAs($this->programHead)
            ->postJson('/set-curriculum-term-active', ['courseId' => 1, 'yearLevel' => 1, 'curriculumId' => 1])
            ->assertOk();

        $active = DB::table('curriculum_term')->where('active', 1)->pluck('id')->sort()->values()->all();
        $expected = collect([$this->termIds['Y1S1'], $this->termIds['Y1S2'], $this->termIds['Y1SUM']])->sort()->values()->all();
        $this->assertSame($expected, $active);
    }

    // --- Create a curriculum year -------------------------------------------

    public function test_other_department_cannot_create_a_curriculum_year(): void
    {
        $this->actingAs($this->otherHead)
            ->post('/curriculum/schoolyear', ['course_id' => 1, 'school_year_start' => 2026, 'school_year_end' => 2027])
            ->assertForbidden();

        $this->assertFalse(DB::table('curriculum')->where(['course_id' => 1, 'school_year_start' => 2026])->exists());
    }

    public function test_own_department_can_create_a_curriculum_year(): void
    {
        $this->actingAs($this->programHead)
            ->post('/curriculum/schoolyear', ['course_id' => 1, 'school_year_start' => 2026, 'school_year_end' => 2027])
            ->assertRedirect('/curriculum/'.md5('1').'/2026-2027');

        $this->assertTrue(DB::table('curriculum')->where(['course_id' => 1, 'school_year_start' => 2026, 'school_year_end' => 2027])->exists());
    }

    public function test_curriculum_year_must_be_valid(): void
    {
        $this->actingAs($this->programHead)
            ->from('/curriculum')
            ->post('/curriculum/schoolyear', ['course_id' => 1, 'school_year_start' => 2026, 'school_year_end' => 2030])
            ->assertSessionHasErrors('school_year');

        $this->actingAs($this->programHead)
            ->from('/curriculum')
            ->post('/curriculum/schoolyear', ['course_id' => 999, 'school_year_start' => 'abc', 'school_year_end' => 2027])
            ->assertSessionHasErrors(['course_id', 'school_year_start']);

        $this->assertFalse(DB::table('curriculum')->where('school_year_start', 2026)->exists());
    }
}
