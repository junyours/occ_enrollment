<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Compares two curriculum years subject by subject.
 *
 * Subject codes are often renumbered between curriculum years (GENED01 -> USELF101), and
 * old codes can even be reused for different subjects. So subjects are matched in passes,
 * strongest first, each subject being used at most once:
 *   1. the same subject record;
 *   2. the same code and the same title;
 *   3. the same title, different code   (reported as a code change);
 *   4. the same code, different title   (reported as a title change).
 * Whatever is left is "added" (only in the newer year) or "removed" (only in the older one).
 */
class CurriculumComparison
{
    public const ADDED = 'added';
    public const REMOVED = 'removed';
    public const CHANGED = 'changed';
    public const UNCHANGED = 'unchanged';

    /**
     * @return array{
     *     from: array{subjects: int, units: int}, to: array{subjects: int, units: int},
     *     counts: array<string, int>, rows: list<array>
     * }
     */
    public function compare(int $fromCurriculumId, int $toCurriculumId): array
    {
        $from = $this->entries($fromCurriculumId);
        $to = $this->entries($toCurriculumId);

        [$pairs, $unmatchedFrom, $unmatchedTo] = $this->match($from, $to);

        $toIdFor = []; // from entry id => matched to entry id
        foreach ($pairs as [$f, $t]) {
            $toIdFor[$f['id']] = $t['id'];
        }

        $rows = [];
        foreach ($pairs as [$f, $t]) {
            $changes = $this->changes($f, $t, $toIdFor);
            $rows[] = $this->row($changes === [] ? self::UNCHANGED : self::CHANGED, $f, $t, $changes);
        }
        foreach ($unmatchedTo as $t) {
            $rows[] = $this->row(self::ADDED, null, $t, []);
        }
        foreach ($unmatchedFrom as $f) {
            $rows[] = $this->row(self::REMOVED, $f, null, []);
        }

        // Curriculum order: by the newer year's position, or the older one's for removed subjects.
        usort($rows, function ($a, $b) {
            $pa = $a['to'] ?? $a['from'];
            $pb = $b['to'] ?? $b['from'];

            return [$pa['year_level_id'], $pa['semester_id'], $a['status'] === self::REMOVED ? 1 : 0, $pa['code']]
                <=> [$pb['year_level_id'], $pb['semester_id'], $b['status'] === self::REMOVED ? 1 : 0, $pb['code']];
        });

        $counts = array_fill_keys([self::ADDED, self::REMOVED, self::CHANGED, self::UNCHANGED], 0);
        foreach ($rows as $row) {
            $counts[$row['status']]++;
        }

        return [
            'from' => ['subjects' => count($from), 'units' => array_sum(array_column($from, 'units'))],
            'to' => ['subjects' => count($to), 'units' => array_sum(array_column($to, 'units'))],
            'counts' => $counts,
            'rows' => $rows,
        ];
    }

    /** @return array<int, array> curriculum entries keyed by curriculum_term_subjects.id */
    private function entries(int $curriculumId): array
    {
        $rows = DB::table('curriculum_term_subjects as e')
            ->join('curriculum_term as t', 't.id', '=', 'e.curriculum_term_id')
            ->join('subjects as s', 's.id', '=', 'e.subject_id')
            ->where('t.curriculum_id', $curriculumId)
            ->orderBy('t.year_level_id')->orderBy('t.semester_id')->orderBy('e.id')
            ->get([
                'e.id', 'e.subject_id', 'e.required_year_level_id',
                't.year_level_id', 't.semester_id',
                's.subject_code', 's.descriptive_title', 's.credit_units', 's.lecture_hours', 's.laboratory_hours',
            ]);

        $entries = [];
        foreach ($rows as $r) {
            $entries[(int) $r->id] = [
                'id' => (int) $r->id,
                'subject_id' => (int) $r->subject_id,
                'code' => trim((string) $r->subject_code),
                'title' => trim((string) $r->descriptive_title),
                'units' => (int) $r->credit_units,
                'lecture_hours' => (int) $r->lecture_hours,
                'laboratory_hours' => (int) $r->laboratory_hours,
                'year_level_id' => (int) $r->year_level_id,
                'semester_id' => (int) $r->semester_id,
                'required_year_level_id' => $r->required_year_level_id === null ? null : (int) $r->required_year_level_id,
                'prerequisite_ids' => [],
            ];
        }

        if ($entries !== []) {
            $links = DB::table('pre_requisite_subjects')
                ->whereIn('curriculum_term_subjects_id', array_keys($entries))
                ->whereNotNull('required_term_subject_id')
                ->get(['curriculum_term_subjects_id', 'required_term_subject_id']);
            foreach ($links as $link) {
                $entries[(int) $link->curriculum_term_subjects_id]['prerequisite_ids'][] = (int) $link->required_term_subject_id;
            }
        }

        return $entries;
    }

    /** @return array{0: list<array{0: array, 1: array}>, 1: list<array>, 2: list<array>} */
    private function match(array $from, array $to): array
    {
        $passes = [
            fn ($e) => 'subject:'.$e['subject_id'],
            fn ($e) => 'code+title:'.self::normalizeCode($e['code']).'|'.self::canonicalTitle($e['title']),
            fn ($e) => 'title:'.self::canonicalTitle($e['title']),
            'similar-title', // closest remaining titles, see matchSimilarTitles()
            fn ($e) => 'code:'.self::normalizeCode($e['code']),
        ];

        $pairs = [];
        $remainingFrom = $from;
        $remainingTo = $to;

        foreach ($passes as $key) {
            if ($key === 'similar-title') {
                $this->matchSimilarTitles($remainingFrom, $remainingTo, $pairs);
                continue;
            }

            $index = [];
            foreach ($remainingTo as $id => $t) {
                $index[$key($t)][] = $id;
            }
            foreach ($remainingFrom as $fromId => $f) {
                $candidates = $index[$key($f)] ?? [];
                while ($candidates !== [] && !isset($remainingTo[$candidates[0]])) {
                    array_shift($candidates);
                }
                if ($candidates === []) {
                    continue;
                }
                $toId = array_shift($candidates);
                $index[$key($f)] = $candidates;
                $pairs[] = [$f, $remainingTo[$toId]];
                unset($remainingFrom[$fromId], $remainingTo[$toId]);
            }
        }

        return [$pairs, array_values($remainingFrom), array_values($remainingTo)];
    }

    /** @return list<string> */
    private function changes(array $f, array $t, array $toIdFor): array
    {
        $changes = [];
        if (self::normalizeCode($f['code']) !== self::normalizeCode($t['code'])) {
            $changes[] = 'code';
        }
        if (self::normalizeTitle($f['title']) !== self::normalizeTitle($t['title'])) {
            $changes[] = 'title';
        }
        if ($f['units'] !== $t['units']) {
            $changes[] = 'units';
        }
        if ($f['lecture_hours'] !== $t['lecture_hours'] || $f['laboratory_hours'] !== $t['laboratory_hours']) {
            $changes[] = 'hours';
        }
        if ($f['year_level_id'] !== $t['year_level_id'] || $f['semester_id'] !== $t['semester_id']) {
            $changes[] = 'moved';
        }

        // Prerequisites are compared through the matching, so a renumbered prerequisite
        // (IT103 -> IT113 for the same subject) isn't reported as a change.
        $before = array_map(fn ($id) => $toIdFor[$id] ?? 'gone:'.$id, $f['prerequisite_ids']);
        $after = $t['prerequisite_ids'];
        sort($before);
        sort($after);
        if ($before !== $after) {
            $changes[] = 'prerequisites';
        }
        if ($f['required_year_level_id'] !== $t['required_year_level_id']) {
            $changes[] = 'standing';
        }

        return $changes;
    }

    private function row(string $status, ?array $f, ?array $t, array $changes): array
    {
        return [
            'status' => $status,
            'changes' => $changes,
            'from' => $f ? $this->side($f) : null,
            'to' => $t ? $this->side($t) : null,
        ];
    }

    private array $codeCache = [];

    private function side(array $e): array
    {
        return [
            'entry_id' => $e['id'],
            'code' => $e['code'],
            'title' => $e['title'],
            'units' => $e['units'],
            'lecture_hours' => $e['lecture_hours'],
            'laboratory_hours' => $e['laboratory_hours'],
            'year_level_id' => $e['year_level_id'],
            'semester_id' => $e['semester_id'],
            'required_year_level_id' => $e['required_year_level_id'],
            'prerequisites' => $this->codesFor($e['prerequisite_ids']),
        ];
    }

    /** @param list<int> $entryIds */
    private function codesFor(array $entryIds): array
    {
        if ($entryIds === []) {
            return [];
        }

        $missing = array_diff($entryIds, array_keys($this->codeCache));
        if ($missing !== []) {
            $found = DB::table('curriculum_term_subjects as e')
                ->join('subjects as s', 's.id', '=', 'e.subject_id')
                ->whereIn('e.id', $missing)
                ->pluck('s.subject_code', 'e.id');
            foreach ($found as $id => $code) {
                $this->codeCache[(int) $id] = trim((string) $code);
            }
        }

        $codes = array_values(array_filter(array_map(fn ($id) => $this->codeCache[$id] ?? null, $entryIds)));
        sort($codes);

        return $codes;
    }

    /**
     * Pairs the remaining subjects whose titles are very similar (typos, extra words),
     * best match first. Being in the same year and semester counts a little in favour.
     */
    private function matchSimilarTitles(array &$remainingFrom, array &$remainingTo, array &$pairs): void
    {
        $candidates = [];
        foreach ($remainingFrom as $fromId => $f) {
            $a = self::canonicalTitle($f['title']);
            foreach ($remainingTo as $toId => $t) {
                $b = self::canonicalTitle($t['title']);
                $score = self::titleSimilarity($a, $b);
                if ($f['year_level_id'] === $t['year_level_id'] && $f['semester_id'] === $t['semester_id']) {
                    $score += 0.1;
                }
                if ($score >= self::SIMILAR_TITLE_THRESHOLD) {
                    $candidates[] = [$score, $fromId, $toId];
                }
            }
        }

        usort($candidates, fn ($x, $y) => $y[0] <=> $x[0]);
        foreach ($candidates as [, $fromId, $toId]) {
            if (isset($remainingFrom[$fromId], $remainingTo[$toId])) {
                $pairs[] = [$remainingFrom[$fromId], $remainingTo[$toId]];
                unset($remainingFrom[$fromId], $remainingTo[$toId]);
            }
        }
    }

    public const SIMILAR_TITLE_THRESHOLD = 0.6;

    /** 0..1: the better of word overlap and character similarity. */
    public static function titleSimilarity(string $a, string $b): float
    {
        if ($a === '' || $b === '') {
            return 0.0;
        }
        $wa = array_unique(explode(' ', $a));
        $wb = array_unique(explode(' ', $b));
        $jaccard = count(array_intersect($wa, $wb)) / count(array_unique(array_merge($wa, $wb)));
        similar_text($a, $b, $percent);

        return max($jaccard, $percent / 100);
    }

    /**
     * Title reduced to what identifies the subject: lower case, "&" as "and", no year or
     * curriculum notes ("24-25 cur"), no elective slot prefix ("IT Elective 1:"),
     * and singular words ("Readings" = "Reading").
     */
    public static function canonicalTitle(string $title): string
    {
        $t = strtolower($title);
        $t = str_replace('&', ' and ', $t);
        $t = preg_replace('/^\s*(it\s+|professional\s+)?elective\s*\d*\s*:\s*/', '', $t);
        $t = preg_replace('/\b\d{2}\s*-\s*\d{2}\s*curr?\b/', ' ', $t);
        $t = preg_replace('/\bcurr?\b/', ' ', $t);
        $t = preg_replace('/[^a-z0-9]+/', ' ', $t);
        $words = array_map(fn ($w) => strlen($w) > 3 && str_ends_with($w, 's') && !str_ends_with($w, 'ss') ? substr($w, 0, -1) : $w,
            preg_split('/\s+/', trim($t), -1, PREG_SPLIT_NO_EMPTY));

        return implode(' ', $words);
    }

    public static function normalizeCode(string $code): string
    {
        return strtoupper(preg_replace('/\s+/', '', $code));
    }

    public static function normalizeTitle(string $title): string
    {
        $title = strtolower($title);
        $title = preg_replace('/[^a-z0-9]+/', ' ', $title);

        return trim(preg_replace('/\s+/', ' ', $title));
    }
}
