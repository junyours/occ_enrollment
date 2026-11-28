<?php

namespace App\Services;

use App\Models\StudentGradeMatch;
use Illuminate\Support\Facades\DB;

/**
 * Lays a student's grades (GradeRecords) over a curriculum: which subjects are passed, in
 * progress, failed or still lacking, and which grades don't fit any subject.
 *
 * Grades are matched in rounds, strongest first, the way Compare pairs subjects:
 * 1. the same subject (same group, or exact code and title);
 * 2. one of the subject's codes with a similar title;
 * 3. the same title under another code (IT104-- Programming 2 is IT105- in 2025-2026);
 * then, only for subjects without a grade yet, as "check" matches a person should confirm:
 * 4. the same code with a different title ("NSTP1 CWTS");
 * 5. a very similar title ("Entreprenueral Mind").
 * A grade counts for one subject; a subject collects every attempt (retakes, and the same
 * grade recorded twice). Grades matched by hand (student_grade_matches) come first: approved
 * ones count, pending ones wait for approval. Transferee records never match on their own:
 * crediting another school's subject is for a person to decide.
 */
class CurriculumAudit
{
    public const MANUAL = 'manual';
    public const AUTO = 'auto';
    public const CHECK = 'check';

    private const WEAK_SIMILARITY = 0.75;
    private const SURENESS = [self::MANUAL => 0, self::AUTO => 1, self::CHECK => 2];
    private const STATUS = ['passed' => 'passed', 'failed' => 'failed', 'dropped' => 'dropped', 'pending' => 'in_progress'];

    private bool $ready = false;
    private array $index = ['by_subject' => [], 'by_code_title' => []];
    private array $groupMembers = [];
    private array $subjects = [];
    private array $keyCache = [];
    private array $codesCache = [];
    private array $entryCache = [];

    public function __construct(private SubjectGroups $groups)
    {
    }

    /** Reloads the same-subject groups and forgets cached subjects; call at the start of a request's work. */
    public function reset(): void
    {
        $this->index = $this->groups->index();
        $this->groupMembers = [];
        foreach ($this->index['by_subject'] as $subjectId => $groupId) {
            $this->groupMembers[$groupId][] = $subjectId;
        }
        $this->subjects = $this->keyCache = $this->codesCache = $this->entryCache = [];
        $this->ready = true;
    }

    /**
     * @param  list<array>  $records  GradeRecords::forStudent()
     * @param  array<string, array>  $matches  matches(): grade reference => match
     * @return array{entries: array<int, array>, others: list<array>, hidden: list<array>}
     *         entries by curriculum_term_subjects.id: status ("passed", "in_progress", "failed", "dropped",
     *         "not_taken"), how the deciding grade was matched (manual, auto, check), that grade, every
     *         attempt, and pending hand matches waiting to count for it. others: grades that fit no subject
     *         (with any pending match, and up to three likely subjects). hidden: grades marked "doesn't count".
     */
    public function audit(int $curriculumId, array $records, array $matches = []): array
    {
        $this->ensureReady();
        $entries = $this->entries($curriculumId);
        $byEntry = [];   // entry index => list of [record index, how]
        $placed = [];    // record index => true once it counts for a subject
        $held = [];      // record index => pending match
        $hidden = [];    // record index => approved "doesn't count"
        $elsewhere = []; // record index => approved match to a subject outside this curriculum

        foreach ($records as $ri => $record) {
            $match = $matches[$record['ref']] ?? null;
            if ($match === null) {
                continue;
            }
            if ($match['status'] === StudentGradeMatch::PENDING) {
                $held[$ri] = $match;
            } elseif ($match['subject_id'] === null) {
                $hidden[$ri] = $match;
            } elseif (($ei = $this->entryIndex($entries, $match['subject_id'])) === null) {
                $elsewhere[$ri] = $match;
            } else {
                $byEntry[$ei][] = [$ri, self::MANUAL];
                $placed[$ri] = true;
            }
        }
        // By reference: $placed grows as the rounds go (an arrow function would only see a copy).
        $free = function (int $ri) use (&$placed, $held, $hidden, $elsewhere, $records): bool {
            return !isset($placed[$ri]) && !isset($held[$ri]) && !isset($hidden[$ri]) && !isset($elsewhere[$ri]) && !$records[$ri]['transferee'];
        };

        $rounds = [
            [true, fn ($r, $e) => $r['subject_id'] !== null && $this->key($r['subject_id']) === $this->key($e['subject_id'])],
            [true, fn ($r, $e) => $this->codeAndTitleMatch($r['code'], $r['title'], $e['subject_id'])],
            [true, fn ($r, $e) => $this->sameTitle($r['title'], $e['subject_id'])],
            [false, fn ($r, $e) => $this->sameCode($r['code'], $e['subject_id']) && !$this->clearlyAnotherSubject($r['title'], $e['subject_id'])],
            [false, fn ($r, $e) => $this->similarTitle($r['title'], $e['subject_id'], self::WEAK_SIMILARITY)],
        ];
        foreach ($rounds as [$strong, $test]) {
            foreach ($records as $ri => $record) {
                if (!$free($ri)) {
                    continue;
                }
                foreach ($entries as $ei => $entry) {
                    if (($strong || empty($byEntry[$ei])) && $test($record, $entry)) {
                        $byEntry[$ei][] = [$ri, $strong ? self::AUTO : self::CHECK];
                        $placed[$ri] = true;
                        break;
                    }
                }
            }
        }

        // The same grade recorded twice (here and in old imports, say) joins the subject its twin
        // counts for: a very similar title to the subject, or the same grade as one already there.
        foreach ($records as $ri => $record) {
            if (!$free($ri)) {
                continue;
            }
            foreach ($entries as $ei => $entry) {
                if (empty($byEntry[$ei])) {
                    continue;
                }
                $repeats = $this->similarTitle($record['title'], $entry['subject_id'], self::WEAK_SIMILARITY);
                foreach ($byEntry[$ei] as [$other]) {
                    $repeats = $repeats || self::sameGrade($record, $records[$other]);
                }
                if ($repeats) {
                    $byEntry[$ei][] = [$ri, self::CHECK];
                    $placed[$ri] = true;
                    break;
                }
            }
        }

        $results = [];
        foreach ($entries as $ei => $entry) {
            // The deciding grade: a pass if there is one (the surest match first, then the newest),
            // else the newest attempt.
            $attempts = $byEntry[$ei] ?? [];
            usort($attempts, fn ($a, $b) => $records[$b[0]]['order'] <=> $records[$a[0]]['order']);
            $passes = array_values(array_filter($attempts, fn ($attempt) => $records[$attempt[0]]['status'] === 'passed'));
            usort($passes, fn ($a, $b) => [self::SURENESS[$a[1]], $records[$b[0]]['order']] <=> [self::SURENESS[$b[1]], $records[$a[0]]['order']]);
            $deciding = $passes[0] ?? $attempts[0] ?? null;
            $best = $deciding === null ? null : $records[$deciding[0]];

            $pending = [];
            foreach ($held as $ri => $match) {
                if ($match['subject_id'] !== null && $this->entryIndex($entries, $match['subject_id']) === $ei) {
                    $pending[] = $records[$ri] + ['match' => $match];
                }
            }

            $results[$entry['id']] = [
                'entry' => $entry,
                'status' => $best === null ? 'not_taken' : self::STATUS[$best['status']],
                'how' => $deciding[1] ?? null,
                'best' => $best,
                'match' => $best === null ? null : ($matches[$best['ref']] ?? null),
                'records' => array_map(fn ($attempt) => $records[$attempt[0]] + ['how' => $attempt[1]], $attempts),
                'pending' => $pending,
            ];
        }

        $open = array_values(array_filter($entries, fn ($entry) => $results[$entry['id']]['status'] !== 'passed'));
        $others = [];
        $hiddenList = [];
        foreach ($records as $ri => $record) {
            if (isset($hidden[$ri])) {
                $hiddenList[] = $record + ['match' => $hidden[$ri]];
            } elseif (!isset($placed[$ri])) {
                $others[] = $record + ['match' => $held[$ri] ?? $elsewhere[$ri] ?? null, 'suggestions' => $this->suggest($record, $open)];
            }
        }

        return ['entries' => $results, 'others' => $others, 'hidden' => $hiddenList];
    }

    /**
     * Hand matches for the student that still count or wait: grade reference => match.
     *
     * @return array<string, array{id: int, course_id: int, subject_id: ?int, status: string, note: ?string, requested_by: ?int, decided_by: ?int, decided_at: ?string}>
     */
    public function matches(int $studentId): array
    {
        if (!DB::getSchemaBuilder()->hasTable('student_grade_matches')) {
            return []; // Not migrated yet.
        }

        $matches = [];
        $rows = DB::table('student_grade_matches')
            ->where('student_id', $studentId)
            ->whereIn('status', [StudentGradeMatch::PENDING, StudentGradeMatch::APPROVED])
            ->get();
        foreach ($rows as $row) {
            $matches["{$row->source_type}:{$row->source_id}"] = [
                'id' => (int) $row->id,
                'course_id' => (int) $row->course_id,
                'subject_id' => $row->subject_id === null ? null : (int) $row->subject_id,
                'status' => $row->status,
                'note' => $row->note,
                'requested_by' => $row->requested_by === null ? null : (int) $row->requested_by,
                'decided_by' => $row->decided_by === null ? null : (int) $row->decided_by,
                'decided_at' => $row->decided_at,
            ];
        }

        return $matches;
    }

    // ---- Curriculum entries ----

    /**
     * @return list<array{id: int, subject_id: int, code: string, title: string, units: int, year_level_id: int,
     *     semester_id: int, prerequisites: list<int>, standing: ?int}> in curriculum order
     */
    public function entries(int $curriculumId): array
    {
        if (isset($this->entryCache[$curriculumId])) {
            return $this->entryCache[$curriculumId];
        }

        $rows = DB::table('curriculum_term_subjects as e')
            ->join('curriculum_term as t', 't.id', '=', 'e.curriculum_term_id')
            ->join('subjects as s', 's.id', '=', 'e.subject_id')
            ->where('t.curriculum_id', $curriculumId)
            ->orderBy('t.year_level_id')->orderBy('t.semester_id')->orderBy('e.id')
            ->get(['e.id', 'e.subject_id', 'e.required_year_level_id', 't.year_level_id', 't.semester_id', 's.subject_code', 's.descriptive_title', 's.credit_units']);
        $links = $rows->isEmpty() ? collect() : DB::table('pre_requisite_subjects as p')
            ->join('curriculum_term_subjects as r', 'r.id', '=', 'p.required_term_subject_id')
            ->whereIn('p.curriculum_term_subjects_id', $rows->pluck('id'))
            ->get(['p.curriculum_term_subjects_id', 'r.subject_id']);

        $required = [];
        foreach ($links as $link) {
            $required[(int) $link->curriculum_term_subjects_id][] = (int) $link->subject_id;
        }
        $this->loadSubjects($links->pluck('subject_id')->all());

        return $this->entryCache[$curriculumId] = $rows->map(function ($row) use ($required) {
            $this->remember((int) $row->subject_id, (string) $row->subject_code, (string) $row->descriptive_title);

            return [
                'id' => (int) $row->id,
                'subject_id' => (int) $row->subject_id,
                'code' => trim((string) $row->subject_code),
                'title' => trim((string) $row->descriptive_title),
                'units' => (int) $row->credit_units,
                'year_level_id' => (int) $row->year_level_id,
                'semester_id' => (int) $row->semester_id,
                'prerequisites' => $required[(int) $row->id] ?? [],
                'standing' => $row->required_year_level_id ? (int) $row->required_year_level_id : null,
            ];
        })->all();
    }

    /** The subject's entry in a curriculum: the same subject, or one of its codes with a similar title. */
    public function entryFor(int $curriculumId, int $subjectId): ?array
    {
        $entries = $this->entries($curriculumId);
        $index = $this->entryIndex($entries, $subjectId);

        return $index === null ? null : $entries[$index];
    }

    private function entryIndex(array $entries, int $subjectId): ?int
    {
        foreach ($entries as $index => $entry) {
            if ($entry['subject_id'] === $subjectId) {
                return $index;
            }
        }
        foreach ($entries as $index => $entry) {
            if ($this->sameSubject($entry['subject_id'], $subjectId)) {
                return $index;
            }
        }

        return null;
    }

    /** @return list<int> up to three entry ids, likeliest first */
    private function suggest(array $record, array $open): array
    {
        $title = CurriculumComparison::canonicalTitle($record['title']);
        $code = self::looseCode($record['code']);
        $scored = [];
        foreach ($open as $entry) {
            $score = 0.0;
            foreach ($this->codesOf($entry['subject_id']) as [$otherCode, $otherTitle]) {
                $score = max($score, $title === '' ? 0.0 : CurriculumComparison::titleSimilarity($title, $otherTitle), $code !== '' && $code === $otherCode ? 0.5 : 0.0);
            }
            if ($score >= 0.35) {
                $scored[$entry['id']] = $score;
            }
        }
        arsort($scored);

        return array_slice(array_keys($scored), 0, 3);
    }

    // ---- Subjects ----

    public function remember(int $subjectId, string $code, string $title): void
    {
        $this->subjects[$subjectId] ??= ['code' => trim($code), 'title' => trim($title)];
    }

    public function subject(int $id): array
    {
        $this->loadSubjects([$id]);

        return $this->subjects[$id] ?? ['code' => '', 'title' => ''];
    }

    public function label(int $subjectId): string
    {
        $subject = $this->subject($subjectId);

        return trim("{$subject['code']} {$subject['title']}");
    }

    /** Same-subject key: the subject's group, or its exact code and title. */
    public function key(int $subjectId): string
    {
        $this->ensureReady();
        if (!isset($this->keyCache[$subjectId])) {
            $subject = $this->subject($subjectId);
            $group = SubjectGroups::groupIn($this->index, $subjectId, $subject['code'], $subject['title']);
            $this->keyCache[$subjectId] = $group === null ? 'subject:'.SubjectGroups::codeTitleKey($subject['code'], $subject['title']) : 'group:'.$group;
        }

        return $this->keyCache[$subjectId];
    }

    /** Same subject: same group, or exact code and title; with $loose, also one of its codes with a similar title. */
    public function sameSubject(int $a, int $b, bool $loose = true): bool
    {
        if ($a === $b || $this->key($a) === $this->key($b)) {
            return true;
        }
        if (!$loose) {
            return false;
        }
        $subject = $this->subject($a);

        return $this->codeAndTitleMatch($subject['code'], $subject['title'], $b);
    }

    /** One of the subject's codes (its own or its group's) with a similar title. */
    public function codeAndTitleMatch(string $code, string $title, int $subjectId): bool
    {
        $code = self::looseCode($code);
        if ($code === '') {
            return false;
        }
        $title = CurriculumComparison::canonicalTitle($title);
        foreach ($this->codesOf($subjectId) as [$otherCode, $otherTitle]) {
            if ($otherCode === $code && self::similarTitles($title, $otherTitle, CurriculumComparison::SIMILAR_TITLE_THRESHOLD)) {
                return true;
            }
        }

        return false;
    }

    private function sameTitle(string $title, int $subjectId): bool
    {
        $title = CurriculumComparison::canonicalTitle($title);

        return $title !== '' && in_array($title, array_column($this->codesOf($subjectId), 1), true);
    }

    private function sameCode(string $code, int $subjectId): bool
    {
        $code = self::looseCode($code);

        return $code !== '' && in_array($code, array_column($this->codesOf($subjectId), 0), true);
    }

    private function similarTitle(string $title, int $subjectId, float $threshold): bool
    {
        $title = CurriculumComparison::canonicalTitle($title);
        foreach ($this->codesOf($subjectId) as [, $otherTitle]) {
            if (self::similarTitles($title, $otherTitle, $threshold)) {
                return true;
            }
        }

        return false;
    }

    /**
     * A descriptive title (two or more real words) that has almost nothing in common with the
     * subject's: "IT316--- Social and Professional Issues" is not "IT316-- Capstone Project and
     * Research 1", though the code is reused. Abbreviated titles ("NSTP1 CWTS/ROTC/LTS") can't tell.
     */
    private function clearlyAnotherSubject(string $title, int $subjectId): bool
    {
        $words = self::meaningfulWords($title);
        if (count(array_filter($words, fn ($word) => strlen($word) > 4)) < 2) {
            return false;
        }
        foreach ($this->codesOf($subjectId) as [, $otherTitle]) {
            if ($otherTitle === '' || array_intersect($words, self::meaningfulWords($otherTitle)) !== []) {
                return false; // A word in common (typos allowed): could be the same subject.
            }
        }

        return true;
    }

    /** The title's real words, each cut to 5 letters so "programing" and "programming" agree. */
    private static function meaningfulWords(string $title): array
    {
        $stop = ['and', 'the', 'for', 'with', 'from', 'into'];
        $words = array_filter(
            explode(' ', CurriculumComparison::canonicalTitle($title)),
            fn ($word) => strlen($word) > 2 && !ctype_digit($word) && !in_array($word, $stop, true)
        );

        return array_values(array_unique(array_map(fn ($word) => substr($word, 0, 5), $words)));
    }

    /** The subject's codes with their titles: its own, and those of the others in its group. */
    private function codesOf(int $subjectId): array
    {
        $this->ensureReady();
        if (!isset($this->codesCache[$subjectId])) {
            $subject = $this->subject($subjectId);
            $group = SubjectGroups::groupIn($this->index, $subjectId, $subject['code'], $subject['title']);
            $ids = array_values(array_unique([$subjectId, ...($group === null ? [] : $this->groupMembers[$group] ?? [])]));
            $this->loadSubjects($ids);
            $this->codesCache[$subjectId] = array_map(fn ($id) => [
                self::looseCode($this->subjects[$id]['code'] ?? ''),
                CurriculumComparison::canonicalTitle($this->subjects[$id]['title'] ?? ''),
            ], $ids);
        }

        return $this->codesCache[$subjectId];
    }

    private function loadSubjects(array $ids): void
    {
        $missing = array_diff(array_values(array_unique(array_map('intval', $ids))), array_keys($this->subjects));
        if ($missing === []) {
            return;
        }
        foreach (DB::table('subjects')->whereIn('id', $missing)->get(['id', 'subject_code', 'descriptive_title']) as $row) {
            $this->remember((int) $row->id, (string) $row->subject_code, (string) $row->descriptive_title);
        }
    }

    private function ensureReady(): void
    {
        if (!$this->ready) {
            $this->reset();
        }
    }

    /** "Gen Ed 6", "GENED06" and "GenEd-6" are the same code; so are IT104 and IT104-. */
    public static function looseCode(string $code): string
    {
        $code = strtoupper(preg_replace('/[^A-Za-z0-9]+/', '', $code));

        return preg_replace('/(?<=[A-Z])0+(?=\d)/', '', $code);
    }

    /**
     * Two grade records for the same subject: the same code and a similar title; or, when one
     * has no code, a very similar title. Different codes are different subjects: NSTP1 and
     * NSTP2 are both titled "CWTS/ROTC/LTS".
     */
    private static function sameGrade(array $a, array $b): bool
    {
        $titleA = CurriculumComparison::canonicalTitle($a['title']);
        $titleB = CurriculumComparison::canonicalTitle($b['title']);
        $codeA = self::looseCode($a['code']);
        $codeB = self::looseCode($b['code']);

        if ($codeA !== '' && $codeB !== '') {
            return $codeA === $codeB && self::similarTitles($titleA, $titleB, CurriculumComparison::SIMILAR_TITLE_THRESHOLD);
        }

        return self::similarTitles($titleA, $titleB, self::WEAK_SIMILARITY);
    }

    /** Titles that name the same subject: same numbers, and the same or similar words. */
    private static function similarTitles(string $a, string $b, float $threshold): bool
    {
        if ($a === '' || $b === '') {
            return false;
        }
        if ($a === $b) {
            return true;
        }
        $numbers = fn ($t) => preg_match_all('/\d+/', $t, $m) ? implode(',', $m[0]) : '';

        return $numbers($a) === $numbers($b) && CurriculumComparison::titleSimilarity($a, $b) >= $threshold;
    }
}
