<?php

namespace App\Services;

use App\Models\SubjectGroup;
use App\Models\SubjectGroupMember;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * "Same subject" groups (Curriculum > Same subjects).
 *
 * Two subjects are the same subject when they are in the same confirmed group, or have
 * the exact same code and title (case, spacing and punctuation ignored). Anything else is
 * a different subject, including codes that differ only by hyphens: BSIT reused IT104 /
 * IT104- / IT104-- for different subjects across curricula.
 *
 * Suggestions put ungrouped subjects with the same title together (as Compare matches
 * them, plus small typos). They are only suggestions: a program head confirms them.
 * A program head can only group, add or remove subjects used in their own department's
 * curricula; a group can hold several departments' codes (each adds its own).
 */
class SubjectGroups
{
    /** Titles at least this similar (percent, same numbers) are suggested together: typos. */
    public const TYPO_SIMILARITY = 90.0;

    // ---- Who counts as the same subject (for prerequisite checks, audits, Compare) ----

    /** "IT104-|programming 2": the exact same code and title. */
    public static function codeTitleKey(string $code, string $title): string
    {
        return CurriculumComparison::normalizeCode($code).'|'.CurriculumComparison::normalizeTitle($title);
    }

    /**
     * Confirmed groups for lookups: subject id => group id, and code+title => group id
     * (a version with the exact same code and title belongs to the same group).
     *
     * @return array{by_subject: array<int, int>, by_code_title: array<string, int>}
     */
    public function index(): array
    {
        $index = ['by_subject' => [], 'by_code_title' => []];
        if (!DB::getSchemaBuilder()->hasTable('subject_group_members')) {
            return $index; // Not migrated yet: nothing is grouped.
        }

        $rows = DB::table('subject_group_members as m')
            ->join('subjects as s', 's.id', '=', 'm.subject_id')
            ->orderBy('m.id')
            ->get(['m.subject_id', 'm.subject_group_id', 's.subject_code', 's.descriptive_title']);
        foreach ($rows as $row) {
            $index['by_subject'][(int) $row->subject_id] = (int) $row->subject_group_id;
            $index['by_code_title'][self::codeTitleKey((string) $row->subject_code, (string) $row->descriptive_title)] ??= (int) $row->subject_group_id;
        }

        return $index;
    }

    /** The subject's group: its own, or that of a version with the exact same code and title. */
    public static function groupIn(array $index, int $subjectId, string $code, string $title): ?int
    {
        return $index['by_subject'][$subjectId] ?? $index['by_code_title'][self::codeTitleKey($code, $title)] ?? null;
    }

    /**
     * Subjects with equal keys are the same subject.
     *
     * @param  list<int>  $subjectIds
     * @return array<int, string> subject id => key
     */
    public function sameSubjectKeys(array $subjectIds): array
    {
        $ids = array_values(array_unique(array_map('intval', $subjectIds)));
        if ($ids === []) {
            return [];
        }

        $index = $this->index();
        $keys = [];
        foreach (DB::table('subjects')->whereIn('id', $ids)->get(['id', 'subject_code', 'descriptive_title']) as $subject) {
            $code = (string) $subject->subject_code;
            $title = (string) $subject->descriptive_title;
            $group = self::groupIn($index, (int) $subject->id, $code, $title);
            $keys[(int) $subject->id] = $group === null ? 'subject:'.self::codeTitleKey($code, $title) : 'group:'.$group;
        }

        return $keys;
    }

    // ---- The Same subjects page ----

    /** Everything the page shows, for a program head of $departmentId. */
    public function overview(?int $departmentId): array
    {
        $usage = $this->usage();
        $members = DB::table('subject_group_members')->orderBy('id')->get(['subject_group_id', 'subject_id']);
        $ids = array_values(array_unique([...array_keys($usage), ...$members->pluck('subject_id')->map(fn ($id) => (int) $id)->all()]));

        $subjects = [];
        $rows = $ids === [] ? collect() : DB::table('subjects')->whereIn('id', $ids)
            ->orderBy('subject_code')->orderBy('id')
            ->get(['id', 'subject_code', 'descriptive_title', 'credit_units']);
        foreach ($rows as $row) {
            $id = (int) $row->id;
            $uses = $usage[$id] ?? [];
            $subjects[$id] = [
                'id' => $id,
                'code' => trim((string) $row->subject_code),
                'title' => trim((string) $row->descriptive_title),
                'units' => (int) $row->credit_units,
                'used_in' => array_map(fn ($use) => array_diff_key($use, ['department_id' => true]), $uses),
                'editable' => $departmentId !== null && in_array($departmentId, array_column($uses, 'department_id'), true),
                'group_id' => null,
            ];
        }

        $groupMembers = [];
        foreach ($members as $member) {
            $subjectId = (int) $member->subject_id;
            $groupId = (int) $member->subject_group_id;
            $groupMembers[$groupId][] = $subjectId;
            if (isset($subjects[$subjectId])) {
                $subjects[$subjectId]['group_id'] = $groupId;
            }
        }

        $groupRows = DB::table('subject_groups')->orderBy('name')->orderBy('id')
            ->get(['id', 'name', 'created_by', 'updated_by', 'updated_at']);
        $dismissalRows = DB::table('subject_group_dismissals')->get(['title_key', 'subject_ids', 'dismissed_by', 'updated_at']);
        $names = $this->userNames([
            ...$groupRows->pluck('created_by')->all(),
            ...$groupRows->pluck('updated_by')->all(),
            ...$dismissalRows->pluck('dismissed_by')->all(),
        ]);

        $groups = [];
        foreach ($groupRows as $group) {
            $groups[(int) $group->id] = [
                'id' => (int) $group->id,
                'name' => $group->name,
                'subject_ids' => $groupMembers[(int) $group->id] ?? [],
                'created_by' => $names[(int) $group->created_by] ?? null,
                'updated_by' => $names[(int) $group->updated_by] ?? null,
                'updated_at' => $group->updated_at,
            ];
        }

        $dismissals = [];
        foreach ($dismissalRows as $dismissal) {
            $dismissals[$dismissal->title_key] = [
                'subject_ids' => array_map('intval', json_decode((string) $dismissal->subject_ids, true) ?: []),
                'by' => $names[(int) $dismissal->dismissed_by] ?? null,
                'at' => $dismissal->updated_at,
            ];
        }

        [$suggestions, $dismissed] = $this->suggest($subjects, $groups, $dismissals);

        return [
            'subjects' => array_values($subjects),
            'groups' => array_values($groups),
            'suggestions' => $suggestions,
            'dismissed' => $dismissed,
        ];
    }

    /** @return array<int, list<array>> subject id => where it's used */
    private function usage(): array
    {
        $rows = DB::table('curriculum_term_subjects as e')
            ->join('curriculum_term as t', 't.id', '=', 'e.curriculum_term_id')
            ->join('curriculum as c', 'c.id', '=', 't.curriculum_id')
            ->join('course as co', 'co.id', '=', 'c.course_id')
            ->orderBy('co.course_name_abbreviation')->orderByDesc('c.school_year_start')
            ->orderBy('t.year_level_id')->orderBy('t.semester_id')
            ->get([
                'e.subject_id', 'c.id as curriculum_id', 'co.course_name_abbreviation', 'co.department_id',
                'c.school_year_start', 'c.school_year_end', 't.year_level_id', 't.semester_id',
            ]);

        $usage = [];
        foreach ($rows as $row) {
            $usage[(int) $row->subject_id][] = [
                'curriculum_id' => (int) $row->curriculum_id,
                'label' => trim("{$row->course_name_abbreviation} {$row->school_year_start}–{$row->school_year_end}"),
                'school_year_start' => (int) $row->school_year_start,
                'year_level_id' => (int) $row->year_level_id,
                'semester_id' => (int) $row->semester_id,
                'department_id' => (int) $row->department_id,
            ];
        }

        return $usage;
    }

    /**
     * Ungrouped subjects with the same title, as "make a group" or "add to this group".
     * A suggestion marked "not the same" stays hidden until a subject it didn't cover appears.
     *
     * @return array{0: list<array>, 1: list<array>} suggestions, and the dismissed ones
     */
    private function suggest(array $subjects, array $groups, array $dismissals): array
    {
        $titleKeys = [];
        foreach ($subjects as $id => $subject) {
            $key = CurriculumComparison::canonicalTitle($subject['title']);
            if ($key !== '') {
                $titleKeys[$id] = $key;
            }
        }
        $root = $this->mergeTypos(array_values(array_unique($titleKeys)));

        $codeTitleGroup = [];
        foreach ($subjects as $subject) {
            if ($subject['group_id'] !== null) {
                $codeTitleGroup[self::codeTitleKey($subject['code'], $subject['title'])] ??= $subject['group_id'];
            }
        }

        $buckets = [];
        $groupsByKey = [];
        foreach ($titleKeys as $id => $key) {
            $subject = $subjects[$id];
            $key = $root[$key];
            $group = $subject['group_id'] ?? $codeTitleGroup[self::codeTitleKey($subject['code'], $subject['title'])] ?? null;
            if ($group !== null) {
                $groupsByKey[$key][$group] = true;
            } elseif ($subject['used_in'] !== []) {
                $buckets[$key][] = $id;
            }
        }

        $suggestions = [];
        $dismissed = [];
        foreach ($buckets as $key => $ids) {
            $groupIds = array_keys($groupsByKey[$key] ?? []);
            usort($groupIds, fn ($a, $b) => strcasecmp($groups[$a]['name'] ?? '', $groups[$b]['name'] ?? ''));
            if ($groupIds === []) {
                $codes = array_unique(array_map(fn ($id) => CurriculumComparison::normalizeCode($subjects[$id]['code']), $ids));
                if (count($codes) < 2) {
                    continue; // Versions of one code: already the same subject.
                }
            }

            $suggestion = [
                'key' => (string) $key,
                'type' => $groupIds === [] ? 'new' : 'add',
                'name' => $groupIds === [] ? $this->suggestedName($ids, $subjects) : $groups[$groupIds[0]]['name'],
                'subject_ids' => $ids,
                'group_ids' => $groupIds,
            ];

            $dismissal = $dismissals[$key] ?? null;
            if ($dismissal !== null && array_diff($ids, $dismissal['subject_ids']) === []) {
                $dismissed[] = [...$suggestion, 'dismissed_by' => $dismissal['by'], 'dismissed_at' => $dismissal['at']];
            } else {
                $suggestions[] = $suggestion;
            }
        }

        $byName = fn ($a, $b) => strcasecmp($a['name'], $b['name']);
        usort($suggestions, $byName);
        usort($dismissed, $byName);

        return [$suggestions, $dismissed];
    }

    /**
     * The title used in the newest curriculum; on a tie, the most common one, then the shortest.
     * Curriculum notes are left out ("Ethics 25-26 curr" is suggested as "Ethics").
     */
    private function suggestedName(array $ids, array $subjects): string
    {
        $titles = [];
        foreach ($ids as $id) {
            $title = trim(preg_replace('/\s*\b\d{2}\s*-\s*\d{2}\s*curr?\b\.?/i', '', $subjects[$id]['title'])) ?: $subjects[$id]['title'];
            $key = CurriculumComparison::normalizeTitle($title);
            $titles[$key] ??= ['title' => $title, 'year' => 0, 'count' => 0];
            $titles[$key]['year'] = max([$titles[$key]['year'], ...array_column($subjects[$id]['used_in'], 'school_year_start')]);
            $titles[$key]['count']++;
        }
        usort($titles, fn ($a, $b) => [$b['year'], $b['count'], strlen($a['title'])] <=> [$a['year'], $a['count'], strlen($b['title'])]);

        return $titles[0]['title'];
    }

    /**
     * Title keys that differ by a small typo ("entrepreneurial" / "entrepreneural") go
     * together. Numbers must match, so Programming 1 and Programming 2 never do.
     *
     * @return array<string, string> title key => the key it's suggested under
     */
    private function mergeTypos(array $keys): array
    {
        sort($keys, SORT_STRING);
        $parent = array_combine($keys, $keys);
        $find = function (string $key) use (&$parent): string {
            while ($parent[$key] !== $key) {
                $key = $parent[$key] = $parent[$parent[$key]];
            }

            return $key;
        };
        $numbers = array_map(fn ($key) => preg_match_all('/\d+/', $key, $m) ? implode(',', $m[0]) : '', $keys);

        $count = count($keys);
        for ($i = 0; $i < $count; $i++) {
            for ($j = $i + 1; $j < $count; $j++) {
                if ($numbers[$i] !== $numbers[$j] || abs(strlen($keys[$i]) - strlen($keys[$j])) > 3) {
                    continue;
                }
                similar_text($keys[$i], $keys[$j], $percent);
                if ($percent < self::TYPO_SIMILARITY) {
                    continue;
                }
                [$a, $b] = [$find($keys[$i]), $find($keys[$j])];
                if (strcmp($a, $b) < 0) {
                    $parent[$b] = $a;
                } elseif (strcmp($a, $b) > 0) {
                    $parent[$a] = $b;
                }
            }
        }

        $root = [];
        foreach ($keys as $key) {
            $root[$key] = $find($key);
        }

        return $root;
    }

    /** @return array<int, string> user id => "First Last" */
    private function userNames(array $userIds): array
    {
        $ids = array_values(array_filter(array_unique(array_map('intval', $userIds))));
        if ($ids === [] || !DB::getSchemaBuilder()->hasTable('user_information')) {
            return [];
        }

        return DB::table('user_information')->whereIn('user_id', $ids)
            ->get(['user_id', 'first_name', 'last_name'])
            ->mapWithKeys(fn ($user) => [(int) $user->user_id => trim("{$user->first_name} {$user->last_name}")])
            ->all();
    }

    // ---- Changes (each checked against the program head's department) ----

    /** @return int the new group's id */
    public function create(string $name, array $subjectIds, int $userId, int $departmentId): int
    {
        $subjectIds = $this->ids($subjectIds);
        $this->assertOwnsAll($departmentId, $subjectIds, 'You can only group subjects used in your department’s curricula.');

        return $this->guardRace(fn () => DB::transaction(function () use ($name, $subjectIds, $userId) {
            $subjects = DB::table('subjects')->whereIn('id', $subjectIds)->get(['id', 'subject_code', 'descriptive_title']);
            $codes = $subjects->map(fn ($s) => CurriculumComparison::normalizeCode((string) $s->subject_code))->unique();
            if ($codes->count() < 2) {
                throw ValidationException::withMessages(['subject_ids' => 'Choose at least two different subject codes. Versions of one code are already the same subject.']);
            }
            $this->assertCanJoin($subjects, null);

            $group = SubjectGroup::create(['name' => $name, 'created_by' => $userId, 'updated_by' => $userId]);
            foreach ($subjectIds as $subjectId) {
                SubjectGroupMember::create(['subject_group_id' => $group->id, 'subject_id' => $subjectId, 'added_by' => $userId]);
            }

            return (int) $group->id;
        }));
    }

    public function addMembers(int $groupId, array $subjectIds, int $userId, int $departmentId): void
    {
        $subjectIds = $this->ids($subjectIds);
        $this->assertOwnsAll($departmentId, $subjectIds, 'You can only add subjects used in your department’s curricula.');

        $this->guardRace(fn () => DB::transaction(function () use ($groupId, $subjectIds, $userId) {
            $group = SubjectGroup::lockForUpdate()->findOrFail($groupId);
            $subjects = DB::table('subjects')->whereIn('id', $subjectIds)->get(['id', 'subject_code', 'descriptive_title']);
            $this->assertCanJoin($subjects, (int) $group->id);

            $current = SubjectGroupMember::where('subject_group_id', $group->id)->pluck('subject_id')->map(fn ($id) => (int) $id)->all();
            foreach (array_diff($subjectIds, $current) as $subjectId) {
                SubjectGroupMember::create(['subject_group_id' => $group->id, 'subject_id' => $subjectId, 'added_by' => $userId]);
            }
            $group->updated_by = $userId;
            $group->touch();
        }));
    }

    /** Removing the last subject deletes the group. */
    public function removeMember(int $groupId, int $subjectId, int $userId, int $departmentId): void
    {
        $this->assertOwnsAll($departmentId, [$subjectId], 'You can only remove subjects used in your department’s curricula.');

        DB::transaction(function () use ($groupId, $subjectId, $userId) {
            $group = SubjectGroup::lockForUpdate()->findOrFail($groupId);
            $removed = SubjectGroupMember::where('subject_group_id', $group->id)->where('subject_id', $subjectId)->delete();
            if ($removed === 0) {
                throw ValidationException::withMessages(['subject_id' => 'That subject is not in this group any more. Refresh the page.']);
            }

            if (!SubjectGroupMember::where('subject_group_id', $group->id)->exists()) {
                $group->delete();

                return;
            }
            $group->updated_by = $userId;
            $group->touch();
        });
    }

    public function rename(int $groupId, string $name, int $userId, int $departmentId): void
    {
        $group = SubjectGroup::findOrFail($groupId);
        if ($this->ownedSubjectIds($departmentId, $this->memberIds($groupId)) === []) {
            throw new AuthorizationException('You can only rename groups that include your department’s subjects.');
        }

        $group->name = $name;
        $group->updated_by = $userId;
        $group->save();
    }

    public function delete(int $groupId, int $departmentId): void
    {
        $group = SubjectGroup::findOrFail($groupId);
        $this->assertOwnsAll($departmentId, $this->memberIds($groupId), 'This group has subjects from another department’s curricula. Remove your own subjects instead.');

        DB::transaction(function () use ($group) {
            SubjectGroupMember::where('subject_group_id', $group->id)->delete();
            $group->delete();
        });
    }

    /** "Not the same subject": hide the suggestion until a subject it didn't cover appears. */
    public function dismiss(string $titleKey, array $subjectIds, int $userId, int $departmentId): void
    {
        $subjectIds = $this->ids($subjectIds);
        if ($this->ownedSubjectIds($departmentId, $subjectIds) === []) {
            throw new AuthorizationException('You can only answer suggestions that include your department’s subjects.');
        }

        $existing = DB::table('subject_group_dismissals')->where('title_key', $titleKey)->first();
        $covered = array_values(array_unique([...array_map('intval', json_decode((string) ($existing->subject_ids ?? '[]'), true) ?: []), ...$subjectIds]));
        sort($covered);

        DB::table('subject_group_dismissals')->updateOrInsert(['title_key' => $titleKey], [
            'subject_ids' => json_encode($covered),
            'dismissed_by' => $userId,
            'created_at' => $existing->created_at ?? now(),
            'updated_at' => now(),
        ]);
    }

    public function restore(string $titleKey, int $departmentId): void
    {
        $existing = DB::table('subject_group_dismissals')->where('title_key', $titleKey)->first();
        if ($existing === null) {
            return;
        }

        $covered = array_map('intval', json_decode((string) $existing->subject_ids, true) ?: []);
        if ($this->ownedSubjectIds($departmentId, $covered) === []) {
            throw new AuthorizationException('You can only restore suggestions that include your department’s subjects.');
        }

        DB::table('subject_group_dismissals')->where('title_key', $titleKey)->delete();
    }

    /**
     * Revising a curriculum subject points its entry at a new subjects row; the new
     * version joins the old one's group, since it's the same subject.
     */
    public function followRevision(int $oldSubjectId, int $newSubjectId, ?int $userId): void
    {
        if ($oldSubjectId === $newSubjectId || !DB::getSchemaBuilder()->hasTable('subject_group_members')) {
            return;
        }

        $groupId = SubjectGroupMember::where('subject_id', $oldSubjectId)->value('subject_group_id');
        if ($groupId === null || SubjectGroupMember::where('subject_id', $newSubjectId)->exists()) {
            return;
        }

        $new = DB::table('subjects')->where('id', $newSubjectId)->first(['subject_code', 'descriptive_title']);
        $inherited = $new ? self::groupIn($this->index(), $newSubjectId, (string) $new->subject_code, (string) $new->descriptive_title) : null;
        if ($inherited !== null && $inherited !== (int) $groupId) {
            return; // Same code and title as another group's subject: that group already covers it.
        }

        SubjectGroupMember::create(['subject_group_id' => (int) $groupId, 'subject_id' => $newSubjectId, 'added_by' => $userId]);
    }

    /** @return list<int> the given subjects that are used in the department's curricula */
    public function ownedSubjectIds(int $departmentId, array $subjectIds): array
    {
        if ($subjectIds === []) {
            return [];
        }

        return DB::table('curriculum_term_subjects as e')
            ->join('curriculum_term as t', 't.id', '=', 'e.curriculum_term_id')
            ->join('curriculum as c', 'c.id', '=', 't.curriculum_id')
            ->join('course as co', 'co.id', '=', 'c.course_id')
            ->where('co.department_id', $departmentId)
            ->whereIn('e.subject_id', $subjectIds)
            ->distinct()
            ->pluck('e.subject_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function assertOwnsAll(int $departmentId, array $subjectIds, string $message): void
    {
        if (array_diff($subjectIds, $this->ownedSubjectIds($departmentId, $subjectIds)) !== []) {
            throw new AuthorizationException($message);
        }
    }

    /** Each subject may only be in one group (counting versions with the same code and title). */
    private function assertCanJoin($subjects, ?int $groupId): void
    {
        $index = $this->index();
        foreach ($subjects as $subject) {
            $current = self::groupIn($index, (int) $subject->id, (string) $subject->subject_code, (string) $subject->descriptive_title);
            if ($current !== null && $current !== $groupId) {
                $name = SubjectGroup::whereKey($current)->value('name');
                throw ValidationException::withMessages([
                    'subject_ids' => "{$subject->subject_code} is already in “{$name}”. A subject can only be in one group.",
                ]);
            }
        }
    }

    /** @return list<int> */
    private function memberIds(int $groupId): array
    {
        return SubjectGroupMember::where('subject_group_id', $groupId)->pluck('subject_id')->map(fn ($id) => (int) $id)->all();
    }

    /** @return list<int> */
    private function ids(array $ids): array
    {
        return array_values(array_unique(array_map('intval', $ids)));
    }

    /** Two people grouping the same subject at once: the unique index stops the second. */
    private function guardRace(callable $change)
    {
        try {
            return $change();
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['subject_ids' => 'Someone just grouped one of these subjects. Refresh the page and try again.']);
        }
    }
}
