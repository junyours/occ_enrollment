<?php

namespace Tests\Unit;

use Illuminate\Support\Facades\DB;

/**
 * A subject code can have several versions (its title or units change between curriculum
 * years), so program heads no longer need hyphenated codes like IT104- to get a new one.
 * Within one curriculum, each code appears only once.
 */
class CurriculumSubjectVersionsTest extends CurriculumTestCase
{
    private function oldTerm(): int
    {
        return $this->termIds['OLD']; // curriculum 2 (BSIT 2018-2019), 1st year 1st semester
    }

    private function add(int $termId, array $fields)
    {
        return $this->actingAs($this->programHead)
            ->from('/curriculum')
            ->post('/curriculum/subject', ['mode' => 'new', 'curriculum_term_id' => $termId] + $fields + [
                'credit_units' => 3, 'lecture_hours' => 3, 'laboratory_hours' => 0,
            ]);
    }

    private function revise(string $code, array $fields)
    {
        $entry = DB::table('curriculum_term_subjects')->where('id', $this->entries[$code])->first();

        return $this->actingAs($this->programHead)
            ->from('/curriculum')
            ->post('/curriculum/subject/edit/subject', ['id' => $entry->id, 'subject_id' => $entry->subject_id] + $fields + [
                'credit_units' => 3, 'lecture_hours' => 3, 'laboratory_hours' => 0,
            ]);
    }

    private function subjectIdOf(string $code): int
    {
        return (int) DB::table('curriculum_term_subjects')->where('id', $this->entries[$code])->value('subject_id');
    }

    private function newestEntrySubject(int $termId): object
    {
        return DB::table('curriculum_term_subjects as e')->join('subjects as s', 's.id', '=', 'e.subject_id')
            ->where('e.curriculum_term_id', $termId)->orderByDesc('e.id')->first(['s.*']);
    }

    // --- New versions -------------------------------------------------------

    public function test_a_new_version_of_an_existing_code_needs_confirmation(): void
    {
        DB::table('subjects')->where('id', $this->subjectIdOf('IT104'))->update(['type' => 'major']);
        $before = DB::table('subjects')->count();

        $this->add($this->oldTerm(), ['subject_code' => 'IT104', 'descriptive_title' => 'Integrated Application Software'])
            ->assertSessionHasErrors('subject_code');
        $this->assertSame($before, DB::table('subjects')->count());

        $this->add($this->oldTerm(), ['subject_code' => 'IT104', 'descriptive_title' => 'Integrated Application Software', 'create_version' => true])
            ->assertSessionHasNoErrors();

        $created = $this->newestEntrySubject($this->oldTerm());
        $this->assertSame(['IT104', 'Integrated Application Software', 'major'], [$created->subject_code, $created->descriptive_title, $created->type]);
        $this->assertNotSame($this->subjectIdOf('IT104'), (int) $created->id);
        // The original version is untouched.
        $this->assertSame('IT104 title', DB::table('subjects')->where('id', $this->subjectIdOf('IT104'))->value('descriptive_title'));
        $this->assertSame(2, DB::table('subjects')->where('subject_code', 'IT104')->count());
    }

    public function test_an_identical_subject_is_reused_instead_of_copied(): void
    {
        $before = DB::table('subjects')->count();

        $this->add($this->oldTerm(), ['subject_code' => 'IT104', 'descriptive_title' => '  it104   TITLE '])
            ->assertSessionHasNoErrors();

        $this->assertSame($before, DB::table('subjects')->count());
        $this->assertSame($this->subjectIdOf('IT104'), (int) $this->newestEntrySubject($this->oldTerm())->id);
    }

    // --- One code per curriculum -----------------------------------------------

    public function test_the_same_code_cannot_appear_twice_in_one_curriculum(): void
    {
        $y2 = $this->termIds['Y2S1'];

        // Another semester of the same curriculum: blocked, saying where it already is.
        $this->add($y2, ['subject_code' => 'IT101', 'descriptive_title' => 'IT101 title'])
            ->assertSessionHasErrors(['subject_code' => 'IT101 is already in this curriculum (First Year, 1st semester).']);

        // Picking the existing subject: blocked too.
        $this->actingAs($this->programHead)->from('/curriculum')
            ->post('/curriculum/subject', ['mode' => 'existing', 'curriculum_term_id' => $y2, 'subject_id' => $this->subjectIdOf('IT101')])
            ->assertSessionHasErrors('subject_id');

        // A hyphen or case variant is the same code.
        $this->add($y2, ['subject_code' => 'it101-', 'descriptive_title' => 'Something else', 'create_version' => true])
            ->assertSessionHasErrors(['subject_code' => 'This curriculum already has IT101 (First Year, 1st semester), which is the same code as it101-.']);

        $this->assertSame(0, DB::table('curriculum_term_subjects')->where('curriculum_term_id', $y2)->where('id', '!=', $this->entries['IT201'])->count());

        // A different curriculum may use it.
        $this->add($this->oldTerm(), ['subject_code' => 'IT101', 'descriptive_title' => 'IT101 title'])->assertSessionHasNoErrors();
    }

    // --- Revisions -------------------------------------------------------------

    /** IT900 "Old Title", used in the 2018-2019 curriculum. */
    private function oldIt900(): int
    {
        $old = DB::table('subjects')->insertGetId(['subject_code' => 'IT900', 'descriptive_title' => 'Old Title']);
        DB::table('curriculum_term_subjects')->insert(['curriculum_term_id' => $this->oldTerm(), 'subject_id' => $old]);

        return $old;
    }

    public function test_revising_to_an_existing_code_with_new_details_creates_a_version(): void
    {
        $old = $this->oldIt900();

        // Used to be refused with "This code already exists".
        $this->revise('IT104', ['subject_code' => 'IT900', 'descriptive_title' => 'New Title'])->assertSessionHasNoErrors();

        $this->assertSame(2, DB::table('subjects')->where('subject_code', 'IT900')->count());
        $this->assertSame('New Title', DB::table('subjects')->where('id', $this->subjectIdOf('IT104'))->value('descriptive_title'));
        $this->assertSame('Old Title', DB::table('subjects')->where('id', $old)->value('descriptive_title'));
    }

    public function test_revising_to_an_identical_existing_version_reuses_it(): void
    {
        $old = $this->oldIt900();

        $this->revise('IT104', ['subject_code' => 'IT900', 'descriptive_title' => 'old title'])->assertSessionHasNoErrors();

        $this->assertSame(1, DB::table('subjects')->where('subject_code', 'IT900')->count());
        $this->assertSame($old, $this->subjectIdOf('IT104'));
    }

    public function test_revising_cannot_take_a_code_already_in_the_curriculum(): void
    {
        $this->revise('IT104', ['subject_code' => 'IT101', 'descriptive_title' => 'Whatever'])
            ->assertSessionHasErrors('subject_code');
        $this->revise('IT104', ['subject_code' => 'IT101--', 'descriptive_title' => 'Whatever'])
            ->assertSessionHasErrors('subject_code');

        $this->assertSame('IT104', DB::table('subjects')->where('id', $this->subjectIdOf('IT104'))->value('subject_code'));
    }

    public function test_revisions_that_keep_the_code_are_not_blocked_by_old_duplicates(): void
    {
        // Existing data can already have IT101 and IT101- in one curriculum.
        $hyphen = DB::table('subjects')->insertGetId(['subject_code' => 'IT101-', 'descriptive_title' => 'IT101 title']);
        DB::table('curriculum_term_subjects')->insert(['curriculum_term_id' => $this->termIds['Y2S1'], 'subject_id' => $hyphen]);

        $this->revise('IT101', ['subject_code' => 'IT101', 'descriptive_title' => 'IT101 title', 'credit_units' => 2])
            ->assertSessionHasNoErrors();
        $this->assertSame(2, (int) DB::table('subjects')->where('id', $this->subjectIdOf('IT101'))->value('credit_units'));
    }

    // --- Version lookup ----------------------------------------------------------

    public function test_code_lookup_lists_every_version_with_its_usage(): void
    {
        $hyphen = DB::table('subjects')->insertGetId(['subject_code' => 'IT104-', 'descriptive_title' => 'Programming 2']);
        DB::table('curriculum_term_subjects')->insert(['curriculum_term_id' => $this->oldTerm(), 'subject_id' => $hyphen]);
        DB::table('year_section_subjects')->insert([['subject_id' => $hyphen], ['subject_id' => $hyphen]]);
        DB::table('subjects')->insert(['subject_code' => 'IT1045', 'descriptive_title' => 'Not the same code']);

        $response = $this->actingAs($this->programHead)
            ->getJson('/curriculum-subjects/search?code=it104')
            ->assertOk();

        $versions = collect($response->json('subjects'))->keyBy('subject_code');
        $this->assertEqualsCanonicalizing(['IT104', 'IT104-'], $versions->keys()->all());
        $this->assertSame(['BSIT 2024–2025'], $versions['IT104']['used_in']);
        $this->assertSame(0, $versions['IT104']['classes']);
        $this->assertSame(['BSIT 2018–2019'], $versions['IT104-']['used_in']);
        $this->assertSame(2, $versions['IT104-']['classes']);
    }

    public function test_search_results_include_usage(): void
    {
        $response = $this->actingAs($this->programHead)
            ->getJson('/curriculum-subjects/search?q=OJT')
            ->assertOk();

        $this->assertSame(['BSIT 2024–2025'], $response->json('subjects.0.used_in'));
    }
}
