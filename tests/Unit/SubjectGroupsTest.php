<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\CurriculumComparison;
use App\Services\SubjectGroups;
use Illuminate\Support\Facades\DB;

/**
 * "Same subject" groups: subject codes a program head confirmed are the same subject.
 *
 * Added to the shared fixture: "Understanding the Self" as USELF101 (BSIT 2024-2025) and
 * GENED01 (BSIT 2018-2019), both department 1, and GenEd1 "Understanding of the Self"
 * (BEED, department 2); PE1 and PE2, both titled "PATH-FIT", in BEED.
 */
class SubjectGroupsTest extends CurriculumTestCase
{
    /** @var array<string, int> code => subjects.id */
    private array $subjectIds = [];

    private User $beedHead;

    private int $beedTerm;

    protected function setUp(): void
    {
        parent::setUp();

        $this->beedTerm = DB::table('curriculum_term')->insertGetId(['curriculum_id' => 3, 'year_level_id' => 1, 'semester_id' => 1]);
        $beedSecondTerm = DB::table('curriculum_term')->insertGetId(['curriculum_id' => 3, 'year_level_id' => 1, 'semester_id' => 2]);
        $this->subjectIds['USELF101'] = $this->addSubject('USELF101', 'Understanding the Self', $this->termIds['Y1S1']);
        $this->subjectIds['GENED01'] = $this->addSubject('GENED01', 'Understanding the Self', $this->termIds['OLD']);
        $this->subjectIds['GenEd1'] = $this->addSubject('GenEd1', 'Understanding of the Self', $this->beedTerm);
        $this->subjectIds['PE1'] = $this->addSubject('PE1', 'PATH-FIT', $this->beedTerm);
        $this->subjectIds['PE2'] = $this->addSubject('PE2', 'PATH-FIT', $beedSecondTerm);

        $this->beedHead = $this->makeUser('program_head', 'PH-2');
        DB::table('faculty')->insert(['faculty_id' => $this->beedHead->id, 'department_id' => 2]);
    }

    private function addSubject(string $code, string $title, int $termId): int
    {
        $id = DB::table('subjects')->insertGetId(['subject_code' => $code, 'descriptive_title' => $title]);
        DB::table('curriculum_term_subjects')->insert(['curriculum_term_id' => $termId, 'subject_id' => $id]);

        return $id;
    }

    /** subjects.id of the given codes (fixture codes like IT101 included). */
    private function ids(string ...$codes): array
    {
        return array_map(fn ($code) => $this->subjectIds[$code]
            ?? (int) DB::table('curriculum_term_subjects')->where('id', $this->entries[$code])->value('subject_id'), $codes);
    }

    private function overview(?User $user = null): array
    {
        return $this->actingAs($user ?? $this->programHead)->postJson('/curriculum-same-subjects')->assertOk()->json();
    }

    private function suggestionWith(array $data, int $subjectId): ?array
    {
        return collect($data['suggestions'])->first(fn ($s) => in_array($subjectId, $s['subject_ids'], true));
    }

    private function createGroup(array $codes, ?User $user = null, string $name = 'Understanding the Self')
    {
        return $this->actingAs($user ?? $this->programHead)
            ->postJson('/curriculum-same-subjects/create', ['name' => $name, 'subject_ids' => $this->ids(...$codes)]);
    }

    private function send(string $path, array $data = [], ?User $user = null)
    {
        return $this->actingAs($user ?? $this->programHead)->postJson("/curriculum-same-subjects/$path", $data);
    }

    // --- Suggestions ---------------------------------------------------------

    public function test_suggests_the_same_title_under_different_codes(): void
    {
        $data = $this->overview();

        $suggestion = $this->suggestionWith($data, $this->subjectIds['USELF101']);
        $this->assertSame('new', $suggestion['type']);
        // "Understanding of the Self" is a small difference, so it's suggested too.
        $this->assertEqualsCanonicalizing($this->ids('USELF101', 'GENED01', 'GenEd1'), $suggestion['subject_ids']);
        $this->assertSame('Understanding the Self', $suggestion['name']);

        $editable = collect($data['subjects'])->pluck('editable', 'code');
        $this->assertTrue($editable['USELF101']);
        $this->assertTrue($editable['GENED01']);
        $this->assertFalse($editable['GenEd1'], 'BEED subject, BSIT program head');

        // Different titles are never suggested: IT101 and IT102 stay apart.
        $this->assertNull($this->suggestionWith($data, $this->ids('IT101')[0]));
    }

    public function test_suggested_names_leave_out_curriculum_notes(): void
    {
        $old = $this->addSubject('GENED08', 'Ethics', $this->termIds['OLD']);
        $this->addSubject('Ethics101', 'Ethics 25-26 curr', $this->termIds['Y1S2']);

        $this->assertSame('Ethics', $this->suggestionWith($this->overview(), $old)['name']);
    }

    public function test_versions_of_one_code_are_not_suggested(): void
    {
        $version = $this->addSubject('IT101', 'IT101 title', $this->termIds['OLD']);

        $this->assertNull($this->suggestionWith($this->overview(), $version));
    }

    // --- Making groups -------------------------------------------------------

    public function test_confirming_makes_a_group_and_other_departments_codes_become_add_suggestions(): void
    {
        $data = $this->createGroup(['USELF101', 'GENED01'])->assertOk()->json();

        $this->assertCount(1, $data['groups']);
        $group = $data['groups'][0];
        $this->assertSame('Understanding the Self', $group['name']);
        $this->assertEqualsCanonicalizing($this->ids('USELF101', 'GENED01'), $group['subject_ids']);
        $this->assertSame($this->programHead->id, (int) DB::table('subject_groups')->value('created_by'));

        $add = $this->suggestionWith($data, $this->subjectIds['GenEd1']);
        $this->assertSame('add', $add['type']);
        $this->assertSame([$group['id']], $add['group_ids']);
        $this->assertSame([$this->subjectIds['GenEd1']], $add['subject_ids']);
    }

    public function test_only_your_departments_subjects_can_be_grouped(): void
    {
        $this->createGroup(['USELF101', 'GenEd1'])->assertForbidden();

        $noDepartment = $this->makeUser('program_head', 'PH-9');
        $this->createGroup(['USELF101', 'GENED01'], $noDepartment)->assertForbidden();

        $this->assertSame(0, DB::table('subject_groups')->count());
    }

    public function test_a_group_needs_two_different_codes(): void
    {
        $this->createGroup(['USELF101'])->assertUnprocessable()->assertJsonValidationErrors('subject_ids');

        $version = $this->addSubject('USELF101', 'Understanding the Self (2nd ed.)', $this->termIds['OLD']);
        $this->send('create', ['name' => 'Self', 'subject_ids' => [$this->subjectIds['USELF101'], $version]])
            ->assertUnprocessable()->assertJsonValidationErrors('subject_ids');
    }

    public function test_a_subject_can_only_be_in_one_group(): void
    {
        $this->createGroup(['USELF101', 'GENED01'])->assertOk();

        $this->createGroup(['GENED01', 'IT101'], name: 'Other')->assertUnprocessable()->assertJsonValidationErrors('subject_ids');

        // Another version with the same code and title is already in that group as well.
        $copy = $this->addSubject('GENED01', 'Understanding the self.', $this->termIds['Y1S2']);
        $this->send('create', ['name' => 'Other', 'subject_ids' => [$copy, ...$this->ids('IT101')]])
            ->assertUnprocessable()->assertJsonValidationErrors('subject_ids');
    }

    // --- Changing groups -----------------------------------------------------

    public function test_each_department_adds_and_removes_its_own_codes(): void
    {
        $group = $this->createGroup(['USELF101', 'GENED01'])->json('groups.0.id');

        $this->send("$group/add", ['subject_ids' => $this->ids('GenEd1')])->assertForbidden();
        $this->send("$group/add", ['subject_ids' => $this->ids('GenEd1')], $this->beedHead)->assertOk();
        $this->assertSame(3, DB::table('subject_group_members')->where('subject_group_id', $group)->count());

        $this->send("$group/remove", ['subject_id' => $this->subjectIds['GenEd1']])->assertForbidden();
        $this->send("$group/delete")->assertForbidden();
        $this->send("$group/remove", ['subject_id' => $this->subjectIds['GENED01']])->assertOk();
        $this->assertEqualsCanonicalizing(
            $this->ids('USELF101', 'GenEd1'),
            DB::table('subject_group_members')->where('subject_group_id', $group)->pluck('subject_id')->map(fn ($id) => (int) $id)->all()
        );

        $this->send("$group/rename", ['name' => 'Self'], $this->beedHead)->assertOk();
        $this->assertSame('Self', DB::table('subject_groups')->where('id', $group)->value('name'));
        $this->assertSame($this->beedHead->id, (int) DB::table('subject_groups')->where('id', $group)->value('updated_by'));
    }

    public function test_removing_the_last_subject_deletes_the_group(): void
    {
        $group = $this->createGroup(['USELF101', 'GENED01'])->json('groups.0.id');

        $this->send("$group/remove", ['subject_id' => $this->subjectIds['USELF101']])->assertOk()->assertJsonCount(1, 'groups');
        $this->send("$group/remove", ['subject_id' => $this->subjectIds['GENED01']])->assertOk()->assertJsonCount(0, 'groups');

        $this->assertSame(0, DB::table('subject_groups')->count());
    }

    public function test_deleting_a_group_of_your_own_subjects(): void
    {
        $group = $this->createGroup(['USELF101', 'GENED01'])->json('groups.0.id');

        $this->send("$group/delete")->assertOk()->assertJsonCount(0, 'groups');

        $this->assertSame(0, DB::table('subject_group_members')->count());
    }

    // --- "Not the same" ------------------------------------------------------

    public function test_not_the_same_hides_a_suggestion_until_a_new_subject_appears(): void
    {
        $pathFit = $this->suggestionWith($this->overview($this->beedHead), $this->subjectIds['PE1']);
        $this->assertEqualsCanonicalizing($this->ids('PE1', 'PE2'), $pathFit['subject_ids']);
        $answer = ['key' => $pathFit['key'], 'subject_ids' => $pathFit['subject_ids']];

        $this->send('dismiss', $answer)->assertForbidden(); // BSIT has no PATH-FIT subjects.
        $data = $this->send('dismiss', $answer, $this->beedHead)->assertOk()->json();
        $this->assertNull($this->suggestionWith($data, $this->subjectIds['PE1']));
        $this->assertSame($pathFit['key'], $data['dismissed'][0]['key']);

        $pe3 = $this->addSubject('PE3', 'PATH-FIT', $this->beedTerm);
        $back = $this->suggestionWith($this->overview($this->beedHead), $pe3);
        $this->assertEqualsCanonicalizing([...$this->ids('PE1', 'PE2'), $pe3], $back['subject_ids']);
    }

    public function test_a_dismissed_suggestion_can_be_restored(): void
    {
        $pathFit = $this->suggestionWith($this->overview($this->beedHead), $this->subjectIds['PE1']);
        $this->send('dismiss', ['key' => $pathFit['key'], 'subject_ids' => $pathFit['subject_ids']], $this->beedHead)->assertOk();

        $data = $this->send('restore', ['key' => $pathFit['key']], $this->beedHead)->assertOk()->json();

        $this->assertNotNull($this->suggestionWith($data, $this->subjectIds['PE1']));
        $this->assertSame([], $data['dismissed']);
    }

    // --- Using the groups ----------------------------------------------------

    public function test_same_subject_keys(): void
    {
        $this->createGroup(['USELF101', 'GENED01'])->assertOk();
        $copy = DB::table('subjects')->insertGetId(['subject_code' => 'gened01', 'descriptive_title' => 'Understanding  the self.', 'credit_units' => 2]);
        $hyphen = DB::table('subjects')->insertGetId(['subject_code' => 'IT101-', 'descriptive_title' => 'IT101 title']);
        [$uself, $gened, $genEd1, $it101] = $this->ids('USELF101', 'GENED01', 'GenEd1', 'IT101');

        $keys = app(SubjectGroups::class)->sameSubjectKeys([$uself, $gened, $genEd1, $it101, $copy, $hyphen]);

        $this->assertSame($keys[$uself], $keys[$gened], 'grouped');
        $this->assertSame($keys[$gened], $keys[$copy], 'same code and title as a grouped subject');
        $this->assertNotSame($keys[$uself], $keys[$genEd1], 'only suggested, not confirmed');
        $this->assertNotSame($keys[$it101], $keys[$hyphen], 'IT101- is a different code');
    }

    public function test_a_revised_subject_stays_in_its_group(): void
    {
        $group = $this->createGroup(['USELF101', 'GENED01'])->json('groups.0.id');
        $entry = DB::table('curriculum_term_subjects')->where('subject_id', $this->subjectIds['USELF101'])->first();

        $this->actingAs($this->programHead)->from('/curriculum')->post('/curriculum/subject/edit/subject', [
            'id' => $entry->id, 'subject_id' => $entry->subject_id, 'subject_code' => 'USELF101',
            'descriptive_title' => 'Understanding the Self', 'credit_units' => 2, 'lecture_hours' => 2, 'laboratory_hours' => 0,
        ])->assertSessionHasNoErrors();

        $revised = (int) DB::table('curriculum_term_subjects')->where('id', $entry->id)->value('subject_id');
        $this->assertNotSame($this->subjectIds['USELF101'], $revised);
        $this->assertSame($group, (int) DB::table('subject_group_members')->where('subject_id', $revised)->value('subject_group_id'));
    }

    public function test_compare_pairs_grouped_subjects_even_when_titles_differ(): void
    {
        $this->subjectIds['CS1'] = $this->addSubject('CS1', 'Computer Programming Fundamentals', $this->termIds['OLD']);
        $this->subjectIds['IT109'] = $this->addSubject('IT109', 'Introduction to Coding', $this->termIds['Y1S1']);
        $rowFor = fn () => collect((new CurriculumComparison())->compare(2, 1)['rows'])
            ->first(fn ($row) => ($row['to']['code'] ?? null) === 'IT109');

        $this->assertSame('added', $rowFor()['status']);

        $this->createGroup(['CS1', 'IT109'], name: 'Programming basics')->assertOk();
        $row = $rowFor();
        $this->assertSame('changed', $row['status']);
        $this->assertSame('CS1', $row['from']['code']);
    }
}
