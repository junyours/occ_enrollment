<?php

namespace Tests\Unit;

use Illuminate\Support\Facades\DB;

/** Curriculum prerequisites: saving, validation and display data. */
class CurriculumPrerequisitesTest extends CurriculumTestCase
{
    private function save(string $code, array $prerequisiteCodes, ?int $yearStanding = null)
    {
        return $this->actingAs($this->programHead)
            ->from('/curriculum')
            ->post('/curriculum/subject/edit/prerequisites', [
                'id' => $this->entries[$code],
                'prerequisite_ids' => array_map(fn ($c) => $this->entries[$c], $prerequisiteCodes),
                'required_year_level_id' => $yearStanding,
            ]);
    }

    private function requiredCodes(string $code): array
    {
        return DB::table('pre_requisite_subjects')
            ->join('curriculum_term_subjects', 'curriculum_term_subjects.id', '=', 'pre_requisite_subjects.required_term_subject_id')
            ->join('subjects', 'subjects.id', '=', 'curriculum_term_subjects.subject_id')
            ->where('pre_requisite_subjects.curriculum_term_subjects_id', $this->entries[$code])
            ->orderBy('subjects.subject_code')
            ->pluck('subjects.subject_code')
            ->all();
    }

    public function test_saves_several_prerequisites_and_year_standing(): void
    {
        $this->save('IT201', ['IT102', 'MATH101'], 2)->assertRedirect('/curriculum')->assertSessionHasNoErrors();

        $this->assertSame(['IT102', 'MATH101'], $this->requiredCodes('IT201'));
        $this->assertSame(2, (int) DB::table('curriculum_term_subjects')->where('id', $this->entries['IT201'])->value('required_year_level_id'));
    }

    public function test_saving_again_replaces_the_previous_list(): void
    {
        $this->save('IT201', ['IT102', 'MATH101'], 2);
        $this->save('IT201', ['IT103'])->assertSessionHasNoErrors();

        $this->assertSame(['IT103'], $this->requiredCodes('IT201'));
        $this->assertNull(DB::table('curriculum_term_subjects')->where('id', $this->entries['IT201'])->value('required_year_level_id'));

        $this->save('IT201', [])->assertSessionHasNoErrors();
        $this->assertSame([], $this->requiredCodes('IT201'));
    }

    public function test_summer_counts_after_second_semester(): void
    {
        // IT104 (1st year Summer) may require IT102 (1st year 2nd sem)...
        $this->save('IT104', ['IT102'])->assertSessionHasNoErrors();
        // ...but IT102 may not require IT104.
        $this->save('IT102', ['IT104'])->assertSessionHasErrors('prerequisite_ids');
    }

    public function test_rejects_same_or_later_semester_and_other_curricula(): void
    {
        $this->save('IT102', ['IT103'])->assertSessionHasErrors('prerequisite_ids'); // same semester
        $this->save('IT102', ['IT102'])->assertSessionHasErrors('prerequisite_ids'); // itself
        $this->save('IT101', ['IT201'])->assertSessionHasErrors('prerequisite_ids'); // later
        $this->save('IT201', ['OLD101'])->assertSessionHasErrors('prerequisite_ids'); // other curriculum

        $this->assertSame([], $this->requiredCodes('IT102'));
        $this->assertSame([], $this->requiredCodes('IT201'));
    }

    public function test_year_standing_cannot_exceed_the_subjects_year(): void
    {
        $this->save('IT201', [], 3)->assertSessionHasErrors('required_year_level_id');
        $this->save('OJT', [], 4)->assertSessionHasNoErrors();
    }

    public function test_other_departments_and_roles_cannot_change_prerequisites(): void
    {
        $otherHead = $this->makeUser('program_head', 'PH-2');
        DB::table('faculty')->insert(['faculty_id' => $otherHead->id, 'department_id' => 2]);

        $this->actingAs($otherHead)
            ->post('/curriculum/subject/edit/prerequisites', ['id' => $this->entries['IT201'], 'prerequisite_ids' => [$this->entries['IT102']]])
            ->assertForbidden();

        $this->actingAs($this->makeUser('student', 'S-1'))
            ->post('/curriculum/subject/edit/prerequisites', ['id' => $this->entries['IT201'], 'prerequisite_ids' => [$this->entries['IT102']]])
            ->assertForbidden();

        $this->assertSame([], $this->requiredCodes('IT201'));
    }

    public function test_curriculum_data_includes_prerequisite_subjects(): void
    {
        $this->save('IT201', ['IT102'], 2);

        $response = $this->actingAs($this->programHead)
            ->postJson('/curriculum/'.md5('1').'/2024-2025')
            ->assertOk();

        $entry = collect($response->json('curriculum.0.curriculum_term'))
            ->flatMap(fn ($term) => $term['curriculum_term_subject'])
            ->firstWhere('id', $this->entries['IT201']);

        $this->assertSame(2, (int) $entry['required_year_level_id']);
        $this->assertSame('IT102', $entry['pre_requisite_subjects'][0]['required_entry']['subject']['subject_code']);
    }

    public function test_removing_a_subject_removes_it_from_other_prerequisites(): void
    {
        $this->save('IT201', ['IT102', 'MATH101']);

        $this->actingAs($this->programHead)->post('/api/delete/curr-subject/'.$this->entries['IT102'])->assertOk();

        $this->assertSame(['MATH101'], $this->requiredCodes('IT201'));
    }
}
