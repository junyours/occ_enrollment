<?php

namespace Tests\Unit;

use Illuminate\Support\Facades\DB;

/** Creating a curriculum year as a copy of an existing one. */
class CurriculumCopyTest extends CurriculumTestCase
{
    private function create(array $extra = [])
    {
        return $this->actingAs($this->programHead)
            ->from('/curriculum')
            ->post('/curriculum/schoolyear', ['course_id' => 1, 'school_year_start' => 2026, 'school_year_end' => 2027] + $extra);
    }

    private function newCurriculumId(): ?int
    {
        $id = DB::table('curriculum')->where(['course_id' => 1, 'school_year_start' => 2026])->value('id');

        return $id === null ? null : (int) $id;
    }

    /** subject code => [entry id, year level, semester] for one curriculum */
    private function entriesOf(int $curriculumId): array
    {
        return DB::table('curriculum_term_subjects as e')
            ->join('curriculum_term as t', 't.id', '=', 'e.curriculum_term_id')
            ->join('subjects as s', 's.id', '=', 'e.subject_id')
            ->where('t.curriculum_id', $curriculumId)
            ->get(['s.subject_code', 'e.id', 't.year_level_id', 't.semester_id', 'e.required_year_level_id'])
            ->keyBy('subject_code')
            ->all();
    }

    public function test_copies_semesters_subjects_year_standing_and_prerequisites(): void
    {
        // Source: IT201 requires IT102 and MATH101 with 2nd year standing; its semesters are active.
        DB::table('pre_requisite_subjects')->insert([
            ['curriculum_term_subjects_id' => $this->entries['IT201'], 'required_term_subject_id' => $this->entries['IT102']],
            ['curriculum_term_subjects_id' => $this->entries['IT201'], 'required_term_subject_id' => $this->entries['MATH101']],
        ]);
        DB::table('curriculum_term_subjects')->where('id', $this->entries['IT201'])->update(['required_year_level_id' => 2]);
        DB::table('curriculum_term')->where('curriculum_id', 1)->update(['active' => 1]);

        $this->create(['copy_from_curriculum_id' => 1])
            ->assertSessionHasNoErrors()
            ->assertRedirect('/curriculum/'.md5('1').'/2026-2027');

        $newId = $this->newCurriculumId();
        $this->assertNotNull($newId);

        // Same semesters, none active.
        $sourceTerms = DB::table('curriculum_term')->where('curriculum_id', 1)->orderBy('year_level_id')->orderBy('semester_id')->get(['year_level_id', 'semester_id'])->map(fn ($t) => "{$t->year_level_id}-{$t->semester_id}")->all();
        $copiedTerms = DB::table('curriculum_term')->where('curriculum_id', $newId)->orderBy('year_level_id')->orderBy('semester_id')->get(['year_level_id', 'semester_id'])->map(fn ($t) => "{$t->year_level_id}-{$t->semester_id}")->all();
        $this->assertSame($sourceTerms, $copiedTerms);
        $this->assertSame(0, DB::table('curriculum_term')->where('curriculum_id', $newId)->where('active', 1)->count());

        // Same subjects in the same semesters, pointing at the same subject records.
        $source = $this->entriesOf(1);
        $copy = $this->entriesOf($newId);
        $this->assertEqualsCanonicalizing(array_keys($source), array_keys($copy));
        foreach ($source as $code => $entry) {
            $this->assertSame([$entry->year_level_id, $entry->semester_id], [$copy[$code]->year_level_id, $copy[$code]->semester_id], $code);
            $this->assertNotSame($entry->id, $copy[$code]->id, $code);
        }
        $this->assertSame(2, (int) $copy['IT201']->required_year_level_id);

        // Prerequisites point at the COPIED entries, not the source ones.
        $required = DB::table('pre_requisite_subjects')
            ->where('curriculum_term_subjects_id', $copy['IT201']->id)
            ->pluck('required_term_subject_id')->map(fn ($id) => (int) $id)->sort()->values()->all();
        $expected = collect([$copy['IT102']->id, $copy['MATH101']->id])->map(fn ($id) => (int) $id)->sort()->values()->all();
        $this->assertSame($expected, $required);

        // The source curriculum is untouched.
        $this->assertSame(2, DB::table('pre_requisite_subjects')->where('curriculum_term_subjects_id', $this->entries['IT201'])->count());
        $this->assertSame(5, DB::table('curriculum_term')->where('curriculum_id', 1)->where('active', 1)->count());
    }

    public function test_without_a_source_the_curriculum_starts_empty(): void
    {
        $this->create()->assertSessionHasNoErrors();

        $newId = $this->newCurriculumId();
        $this->assertNotNull($newId);
        $this->assertSame(0, DB::table('curriculum_term')->where('curriculum_id', $newId)->count());
    }

    public function test_cannot_copy_another_programs_curriculum(): void
    {
        // Curriculum 3 belongs to course 2.
        $this->create(['copy_from_curriculum_id' => 3])->assertSessionHasErrors('copy_from_curriculum_id');

        $this->assertNull($this->newCurriculumId());
    }

    public function test_other_department_cannot_create_a_copy(): void
    {
        $otherHead = $this->makeUser('program_head', 'PH-2');
        DB::table('faculty')->insert(['faculty_id' => $otherHead->id, 'department_id' => 2]);

        $this->actingAs($otherHead)
            ->post('/curriculum/schoolyear', ['course_id' => 1, 'school_year_start' => 2026, 'school_year_end' => 2027, 'copy_from_curriculum_id' => 1])
            ->assertForbidden();

        $this->assertNull($this->newCurriculumId());
    }
}
