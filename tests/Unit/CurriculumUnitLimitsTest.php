<?php

namespace Tests\Unit;

use Illuminate\Support\Facades\DB;

/** Unit-load limits behind the curriculum page warnings. */
class CurriculumUnitLimitsTest extends CurriculumTestCase
{
    private function save(array $fields, $user = null)
    {
        return $this->actingAs($user ?? $this->programHead)
            ->from('/curriculum')
            ->post('/curriculum/unit-limits', $fields + ['curriculum_id' => 1]);
    }

    public function test_program_head_can_set_the_limits(): void
    {
        $this->save(['max_semester_units' => 24, 'max_summer_units' => 6, 'required_total_units' => 150])
            ->assertSessionHasNoErrors();

        // Load limits belong to the program; the required total to this curriculum year only.
        $course = DB::table('course')->where('id', 1)->first();
        $this->assertSame([24, 6], [(int) $course->max_semester_units, (int) $course->max_summer_units]);
        $this->assertSame(150, (int) DB::table('curriculum')->where('id', 1)->value('required_total_units'));
        $this->assertNull(DB::table('curriculum')->where('id', 2)->value('required_total_units'));
    }

    public function test_blank_values_go_back_to_the_defaults(): void
    {
        $this->save(['max_semester_units' => 24, 'max_summer_units' => 6, 'required_total_units' => 150]);
        $this->save(['max_semester_units' => null, 'max_summer_units' => null, 'required_total_units' => null])
            ->assertSessionHasNoErrors();

        $course = DB::table('course')->where('id', 1)->first();
        $this->assertNull($course->max_semester_units);
        $this->assertNull($course->max_summer_units);
        $this->assertNull(DB::table('curriculum')->where('id', 1)->value('required_total_units'));
    }

    public function test_limits_must_be_sensible_numbers(): void
    {
        $this->save(['max_semester_units' => 0, 'max_summer_units' => 99, 'required_total_units' => 'many'])
            ->assertSessionHasErrors(['max_semester_units', 'max_summer_units', 'required_total_units']);

        $this->actingAs($this->programHead)->from('/curriculum')
            ->post('/curriculum/unit-limits', ['max_semester_units' => 24])
            ->assertSessionHasErrors('curriculum_id');

        $this->assertNull(DB::table('course')->where('id', 1)->value('max_semester_units'));
    }

    public function test_other_department_cannot_change_the_limits(): void
    {
        $otherHead = $this->makeUser('program_head', 'PH-2');
        DB::table('faculty')->insert(['faculty_id' => $otherHead->id, 'department_id' => 2]);

        $this->save(['max_semester_units' => 40], $otherHead)->assertForbidden();

        $this->assertNull(DB::table('course')->where('id', 1)->value('max_semester_units'));
    }

    public function test_curriculum_data_includes_limits_and_program_totals(): void
    {
        $this->save(['max_semester_units' => 24, 'required_total_units' => 150]);

        $response = $this->actingAs($this->programHead)
            ->postJson('/curriculum/'.md5('1').'/2024-2025')
            ->assertOk();

        $response->assertJsonPath('unit_limits.max_semester_units', 24)
            ->assertJsonPath('unit_limits.max_summer_units', null)
            ->assertJsonPath('unit_limits.required_total_units', 150)
            ->assertJsonPath('unit_limits.default_semester_units', 26)
            ->assertJsonPath('unit_limits.default_summer_units', 9);

        // Every curriculum year of the program with its total units (3 units per fixture subject).
        $totals = collect($response->json('program_totals'))->keyBy('id');
        $this->assertSame('2024–2025', $totals[1]['label']);
        $this->assertSame(21, $totals[1]['units']);
        $this->assertSame(3, $totals[2]['units']);
        $this->assertFalse($totals->has(3)); // another program's curriculum
    }
}
