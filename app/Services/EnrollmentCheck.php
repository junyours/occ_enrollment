<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Checks the classes a student is about to be enrolled in:
 *
 * - "duplicate" (blocks): the same subject twice in the term, also under different
 *   codes (Curriculum > Same subjects);
 * - "passed" (warns): the student already passed the subject, under any of its codes;
 * - "prerequisite" and "standing" (warn): from the student's own curriculum, so a backlog
 *   student follows the one they started with; a subject that isn't in it uses the
 *   prerequisites of the curriculum the class was made from;
 * - notes: retakes, grades not out yet, subjects outside the student's curriculum, grades
 *   matched only by code or a similar title, and credits waiting for approval.
 *
 * Grades (GradeRecords) are matched to the curriculum the same way as the curriculum view on
 * Student Grades (CurriculumAudit): in rounds, with grades matched by hand counting once
 * approved. A code reused for a different subject (IT204-- Object Oriented Programming,
 * IT204- Database Systems) never counts.
 */
class EnrollmentCheck
{
    public const BLOCK = 'block';
    public const WARN = 'warn';
    public const NOTE = 'note';

    private const ORDINAL = [1 => '1st', 2 => '2nd', 3 => '3rd', 4 => '4th', 5 => '5th'];

    private array $history = [];
    private array $matches = [];
    private array $audits = [];

    public function __construct(private StudentCurricula $curricula, private GradeRecords $records, private CurriculumAudit $audit)
    {
    }

    /**
     * @param  int  $studentId  users.id
     * @param  int  $yearSectionId  the student's section this term
     * @param  list<int>  $classIds  every class the student will have this term
     * @param  list<int>|null  $newClassIds  the ones being added (default: all)
     */
    public function check(int $studentId, int $yearSectionId, array $classIds, ?array $newClassIds = null): array
    {
        $this->audit->reset();
        $this->audits = [];
        $classIds = self::ids($classIds);
        $newClassIds = $newClassIds === null ? $classIds : array_values(array_intersect(self::ids($newClassIds), $classIds));

        $section = DB::table('year_section')->where('id', $yearSectionId)->first(['course_id', 'year_level_id', 'school_year_id']);
        $courseId = (int) $section->course_id;
        $yearLevel = (int) $section->year_level_id;
        $curriculum = $this->curricula->resolve($studentId, $courseId, $yearLevel, (int) $section->school_year_id);

        $classes = $this->classes($classIds);
        $this->history = $this->records->forStudent($studentId, (int) $section->school_year_id);
        $this->matches = $this->audit->matches($studentId);

        $results = [];
        foreach ($newClassIds as $classId) {
            if (isset($classes[$classId])) {
                $class = $classes[$classId];
                $results[] = [
                    'class_id' => $classId,
                    'code' => $class['code'],
                    'title' => $class['title'],
                    'issues' => $this->issuesFor($class, $classes, $curriculum, $yearLevel),
                ];
            }
        }

        return [
            'program' => ['id' => $courseId, 'abbreviation' => (string) DB::table('course')->where('id', $courseId)->value('course_name_abbreviation')],
            'year_level' => $yearLevel,
            'curriculum' => $curriculum,
            'curricula' => array_values(array_map(fn ($c) => ['id' => $c['id'], 'label' => $c['label']], $this->curricula->curricula($courseId))),
            'classes' => $results,
        ];
    }

    /**
     * Added classes that repeat a subject already in the term's list, for the save endpoints.
     *
     * @return list<string>
     */
    public function duplicates(array $classIds, array $newClassIds): array
    {
        $this->audit->reset();
        $classes = $this->classes(self::ids($classIds));
        $messages = [];
        foreach (self::ids($newClassIds) as $classId) {
            if (isset($classes[$classId]) && ($issue = $this->duplicateIssue($classes[$classId], $classes)) !== null) {
                $messages[] = $issue['message'];
            }
        }

        return array_values(array_unique($messages));
    }

    // ---- The checks ----

    private function issuesFor(array $class, array $classes, ?array $curriculum, int $yearLevel): array
    {
        $issues = [];
        if (($duplicate = $this->duplicateIssue($class, $classes)) !== null) {
            $issues[] = $duplicate;
        }

        $classCurriculum = $this->activeCurriculum($class['course_id'], $class['year_level_id']);
        $own = $this->standing($class['subject_id'], [$curriculum['id'] ?? null, $classCurriculum]);
        $record = $own['record'];
        if ($record !== null && $record['status'] === 'passed') {
            if ($own['how'] === CurriculumAudit::CHECK) {
                $issues[] = self::issue(self::NOTE, 'passed', "Possibly passed as {$record['code']} {$record['title']} ({$record['grade']}, {$record['term']}): matched only by code or a similar title, so check it in Student Grades.");
            } elseif ($own['how'] === CurriculumAudit::MANUAL) {
                $issues[] = self::issue(self::WARN, 'passed', "Already passed: credited from {$record['code']} {$record['title']} ({$record['grade']}, {$record['term']}).");
            } else {
                $as = CurriculumAudit::looseCode($record['code']) === CurriculumAudit::looseCode($class['code']) ? '' : " as {$record['code']}";
                $issues[] = self::issue(self::WARN, 'passed', "Already passed{$as} ({$record['grade']}, {$record['term']}).");
            }
        } elseif ($record !== null && $record['status'] === 'pending') {
            $issues[] = self::issue(self::NOTE, 'retake', "Also taken in {$record['term']}; that grade isn't out yet.");
        } elseif ($record !== null) {
            $how = $record['status'] === 'dropped' ? 'dropped' : "failed ({$record['grade']})";
            $issues[] = self::issue(self::NOTE, 'retake', "Retake: {$how} in {$record['term']}.");
        }

        $rules = $this->rulesFor($class, $curriculum, $classCurriculum);
        if ($rules['note'] !== null) {
            $issues[] = self::issue(self::NOTE, 'curriculum', $rules['note']);
        }

        foreach ($rules['prerequisites'] as $required) {
            $label = $this->audit->label($required);
            $inList = collect($classes)->first(fn ($other) => $other['id'] !== $class['id'] && $this->audit->sameSubject($other['subject_id'], $required));
            if ($inList !== null) {
                $issues[] = self::issue(self::WARN, 'prerequisite', "Needs {$label}, which is in this same list: it has to be passed first.");
                continue;
            }

            $standing = $this->standing($required, [$rules['curriculum_id']]);
            $record = $standing['record'];
            if ($record === null) {
                $issues[] = $standing['pending']
                    ? self::issue(self::NOTE, 'prerequisite', "Needs {$label}: a credit for it is waiting for the program head's approval.")
                    : self::issue(self::WARN, 'prerequisite', "Needs {$label}: no grade found.");
            } elseif ($record['status'] === 'pending') {
                $issues[] = self::issue(self::NOTE, 'prerequisite', "Needs {$label}: grade not out yet ({$record['term']}).");
            } elseif ($record['status'] !== 'passed') {
                $how = $record['status'] === 'dropped' ? 'dropped' : "failed ({$record['grade']})";
                $issues[] = self::issue(self::WARN, 'prerequisite', "Needs {$label}: {$how} in {$record['term']}.");
            } elseif ($standing['how'] === CurriculumAudit::CHECK) {
                $issues[] = self::issue(self::NOTE, 'prerequisite', "Needs {$label}: counted from {$record['code']} {$record['title']}, matched only by code or a similar title (check it in Student Grades).");
            }
        }

        if ($rules['standing'] !== null && $rules['standing'] > $yearLevel) {
            $needed = self::ORDINAL[$rules['standing']] ?? $rules['standing'];
            $current = self::ORDINAL[$yearLevel] ?? $yearLevel;
            $issues[] = self::issue(self::WARN, 'standing', "Needs {$needed} Year Standing; the student is in {$current} year.");
        }

        return $issues;
    }

    /** The same code (as written, hyphens included), or the same subject by group or exact code and title. */
    private function duplicateIssue(array $class, array $classes): ?array
    {
        foreach ($classes as $other) {
            $sameCode = CurriculumComparison::normalizeCode($other['code']) === CurriculumComparison::normalizeCode($class['code']);
            if ($other['id'] === $class['id'] || (!$sameCode && !$this->audit->sameSubject($other['subject_id'], $class['subject_id'], false))) {
                continue;
            }
            $message = CurriculumAudit::looseCode($other['code']) === CurriculumAudit::looseCode($class['code'])
                ? "{$class['code']} {$class['title']} is already in this list (another section)."
                : "{$class['code']} {$class['title']} is the same subject as {$other['code']} {$other['title']}, which is already in this list.";

            return self::issue(self::BLOCK, 'duplicate', $message);
        }

        return null;
    }

    /**
     * The prerequisites and year standing for a class: from the entry for its subject in the
     * student's curriculum, else in the curriculum the class was made from.
     *
     * @return array{prerequisites: list<int>, standing: ?int, note: ?string, curriculum_id: ?int}
     */
    private function rulesFor(array $class, ?array $curriculum, ?int $classCurriculum): array
    {
        $entry = $curriculum ? $this->audit->entryFor($curriculum['id'], $class['subject_id']) : null;
        $from = $curriculum['id'] ?? null;
        $note = null;

        if ($entry === null) {
            $entry = $classCurriculum !== null && $classCurriculum !== ($curriculum['id'] ?? null)
                ? $this->audit->entryFor($classCurriculum, $class['subject_id'])
                : null;
            $from = $classCurriculum;
            if ($curriculum !== null) {
                $note = "Not in the student's curriculum ({$curriculum['label']})"
                    .($entry !== null ? '; prerequisites are from '.$this->curriculumLabel($classCurriculum).'.' : '.');
            }
        }

        if ($entry === null) {
            return ['prerequisites' => [], 'standing' => null, 'note' => $note, 'curriculum_id' => null];
        }

        return ['prerequisites' => $entry['prerequisites'], 'standing' => $entry['standing'], 'note' => $note, 'curriculum_id' => $from];
    }

    /**
     * The student's standing in a subject: from the audit of the first of these curricula that
     * has it (matching in rounds, grades matched by hand included), else from the grades that
     * count for it on their own.
     *
     * @return array{record: ?array, how: ?string, pending: bool}
     */
    private function standing(int $subjectId, array $curriculumIds): array
    {
        foreach (array_unique(array_filter($curriculumIds)) as $curriculumId) {
            $entry = $this->audit->entryFor($curriculumId, $subjectId);
            if ($entry !== null) {
                $result = $this->auditOf($curriculumId)['entries'][$entry['id']];

                return ['record' => $result['best'], 'how' => $result['how'], 'pending' => $result['pending'] !== []];
            }
        }

        $records = array_values(array_filter($this->history, fn ($record) => !$record['transferee'] && (
            ($record['subject_id'] !== null && $this->audit->key($record['subject_id']) === $this->audit->key($subjectId))
            || $this->audit->codeAndTitleMatch($record['code'], $record['title'], $subjectId)
        )));
        usort($records, fn ($a, $b) => $b['order'] <=> $a['order']);
        $best = collect($records)->firstWhere('status', 'passed') ?? ($records[0] ?? null);

        return ['record' => $best, 'how' => $best === null ? null : CurriculumAudit::AUTO, 'pending' => false];
    }

    private function auditOf(int $curriculumId): array
    {
        return $this->audits[$curriculumId] ??= $this->audit->audit($curriculumId, $this->history, $this->matches);
    }

    private function activeCurriculum(int $courseId, int $yearLevelId): ?int
    {
        $id = DB::table('curriculum_term as t')
            ->join('curriculum as c', 'c.id', '=', 't.curriculum_id')
            ->where('c.course_id', $courseId)->where('t.year_level_id', $yearLevelId)->where('t.active', 1)
            ->orderByDesc('c.id')->value('c.id');

        return $id === null ? null : (int) $id;
    }

    private function curriculumLabel(int $curriculumId): string
    {
        $row = DB::table('curriculum as c')->join('course as co', 'co.id', '=', 'c.course_id')
            ->where('c.id', $curriculumId)->first(['co.course_name_abbreviation', 'c.school_year_start', 'c.school_year_end']);

        return $row ? trim("{$row->course_name_abbreviation} {$row->school_year_start}–{$row->school_year_end}") : 'another curriculum';
    }

    /** @return array<int, array{id: int, subject_id: int, code: string, title: string, course_id: int, year_level_id: int}> */
    private function classes(array $classIds): array
    {
        if ($classIds === []) {
            return [];
        }

        $classes = [];
        $rows = DB::table('year_section_subjects as yss')
            ->join('subjects as s', 's.id', '=', 'yss.subject_id')
            ->join('year_section as ys', 'ys.id', '=', 'yss.year_section_id')
            ->whereIn('yss.id', $classIds)
            ->get(['yss.id', 'yss.subject_id', 's.subject_code', 's.descriptive_title', 'ys.course_id', 'ys.year_level_id']);
        foreach ($rows as $row) {
            $classes[(int) $row->id] = [
                'id' => (int) $row->id,
                'subject_id' => (int) $row->subject_id,
                'code' => trim((string) $row->subject_code),
                'title' => trim((string) $row->descriptive_title),
                'course_id' => (int) $row->course_id,
                'year_level_id' => (int) $row->year_level_id,
            ];
            $this->audit->remember((int) $row->subject_id, (string) $row->subject_code, (string) $row->descriptive_title);
        }

        return $classes;
    }

    private static function issue(string $severity, string $type, string $message): array
    {
        return ['severity' => $severity, 'type' => $type, 'message' => $message];
    }

    /** @return list<int> */
    private static function ids(array $ids): array
    {
        return array_values(array_unique(array_map('intval', $ids)));
    }
}
