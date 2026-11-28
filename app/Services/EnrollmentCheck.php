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
 * - notes: retakes, grades not out yet, subjects outside the student's curriculum.
 *
 * Grades come from every record the Student Grades page shows: classes in this system,
 * old imported grades, FES grades, and old/transferee records. A grade counts for a
 * subject when it's for the same subject (same group, or exact code and title), or for one
 * of the subject's codes with a similar title: a code reused for a different subject
 * (IT204-- Object Oriented Programming, IT204- Database Systems) never counts.
 */
class EnrollmentCheck
{
    public const BLOCK = 'block';
    public const WARN = 'warn';
    public const NOTE = 'note';

    private const ORDINAL = [1 => '1st', 2 => '2nd', 3 => '3rd', 4 => '4th', 5 => '5th'];
    private const SEMESTER = [1 => '1st sem', 2 => '2nd sem', 3 => 'Summer'];

    private array $index = ['by_subject' => [], 'by_code_title' => []];
    private array $groupMembers = [];
    private array $subjects = [];
    private array $keyCache = [];
    private array $codesCache = [];
    private array $curriculumCache = [];

    public function __construct(private SubjectGroups $groups, private StudentCurricula $curricula)
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
        $this->prepare();
        $classIds = self::ids($classIds);
        $newClassIds = $newClassIds === null ? $classIds : array_values(array_intersect(self::ids($newClassIds), $classIds));

        $section = DB::table('year_section')->where('id', $yearSectionId)->first(['course_id', 'year_level_id', 'school_year_id']);
        $courseId = (int) $section->course_id;
        $yearLevel = (int) $section->year_level_id;
        $curriculum = $this->curricula->resolve($studentId, $courseId, $yearLevel, (int) $section->school_year_id);

        $classes = $this->classes($classIds);
        $history = $this->history($studentId, (int) $section->school_year_id);

        $results = [];
        foreach ($newClassIds as $classId) {
            if (isset($classes[$classId])) {
                $class = $classes[$classId];
                $results[] = [
                    'class_id' => $classId,
                    'code' => $class['code'],
                    'title' => $class['title'],
                    'issues' => $this->issuesFor($class, $classes, $history, $curriculum, $yearLevel),
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
        $this->prepare();
        $classes = $this->classes(self::ids($classIds));
        $messages = [];
        foreach (self::ids($newClassIds) as $classId) {
            if (isset($classes[$classId]) && ($issue = $this->duplicateIssue($classes[$classId], $classes)) !== null) {
                $messages[] = $issue['message'];
            }
        }

        return array_values(array_unique($messages));
    }

    private function prepare(): void
    {
        $this->index = $this->groups->index();
        $this->groupMembers = [];
        foreach ($this->index['by_subject'] as $subjectId => $groupId) {
            $this->groupMembers[$groupId][] = $subjectId;
        }
        $this->subjects = $this->keyCache = $this->codesCache = $this->curriculumCache = [];
    }

    // ---- The checks ----

    private function issuesFor(array $class, array $classes, array $history, ?array $curriculum, int $yearLevel): array
    {
        $issues = [];
        if (($duplicate = $this->duplicateIssue($class, $classes)) !== null) {
            $issues[] = $duplicate;
        }

        $own = $this->standingIn($class['subject_id'], $history);
        if ($own !== null && $own['status'] === 'passed') {
            $as = self::looseCode($own['code']) === self::looseCode($class['code']) ? '' : " as {$own['code']}";
            $issues[] = self::issue(self::WARN, 'passed', "Already passed{$as} ({$own['grade']}, {$own['term']}).");
        } elseif ($own !== null && $own['status'] === 'pending') {
            $issues[] = self::issue(self::NOTE, 'retake', "Also taken in {$own['term']}; that grade isn't out yet.");
        } elseif ($own !== null) {
            $how = $own['status'] === 'dropped' ? 'dropped' : "failed ({$own['grade']})";
            $issues[] = self::issue(self::NOTE, 'retake', "Retake: {$how} in {$own['term']}.");
        }

        $rules = $this->rulesFor($class, $curriculum);
        if ($rules['note'] !== null) {
            $issues[] = self::issue(self::NOTE, 'curriculum', $rules['note']);
        }

        foreach ($rules['prerequisites'] as $required) {
            $label = $this->label($required);
            $inList = collect($classes)->first(fn ($other) => $other['id'] !== $class['id'] && $this->sameSubject($other['subject_id'], $required));
            if ($inList !== null) {
                $issues[] = self::issue(self::WARN, 'prerequisite', "Needs {$label}, which is in this same list: it has to be passed first.");
                continue;
            }

            $record = $this->standingIn($required, $history);
            if ($record === null) {
                $issues[] = self::issue(self::WARN, 'prerequisite', "Needs {$label}: no grade found.");
            } elseif ($record['status'] === 'pending') {
                $issues[] = self::issue(self::NOTE, 'prerequisite', "Needs {$label}: grade not out yet ({$record['term']}).");
            } elseif ($record['status'] !== 'passed') {
                $how = $record['status'] === 'dropped' ? 'dropped' : "failed ({$record['grade']})";
                $issues[] = self::issue(self::WARN, 'prerequisite', "Needs {$label}: {$how} in {$record['term']}.");
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
            if ($other['id'] === $class['id'] || (!$sameCode && !$this->sameSubject($other['subject_id'], $class['subject_id'], false))) {
                continue;
            }
            $message = self::looseCode($other['code']) === self::looseCode($class['code'])
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
     * @return array{prerequisites: list<int>, standing: ?int, note: ?string}
     */
    private function rulesFor(array $class, ?array $curriculum): array
    {
        $entry = $curriculum ? $this->entryFor($curriculum['id'], $class['subject_id']) : null;
        $note = null;

        if ($entry === null) {
            $classCurriculum = $this->activeCurriculum($class['course_id'], $class['year_level_id']);
            $entry = $classCurriculum !== null && $classCurriculum !== ($curriculum['id'] ?? null)
                ? $this->entryFor($classCurriculum, $class['subject_id'])
                : null;
            if ($curriculum !== null) {
                $note = "Not in the student's curriculum ({$curriculum['label']})"
                    .($entry !== null ? '; prerequisites are from '.$this->curriculumLabel($classCurriculum).'.' : '.');
            }
        }

        if ($entry === null) {
            return ['prerequisites' => [], 'standing' => null, 'note' => $note];
        }

        return ['prerequisites' => $entry['prerequisites'], 'standing' => $entry['standing'], 'note' => $note];
    }

    /** The subject's entry in a curriculum: the same subject, or one of its codes with a similar title. */
    private function entryFor(int $curriculumId, int $subjectId): ?array
    {
        $entries = $this->curriculumEntries($curriculumId);
        foreach ($entries as $entry) {
            if ($entry['subject_id'] === $subjectId) {
                return $entry;
            }
        }
        foreach ($entries as $entry) {
            if ($this->sameSubject($entry['subject_id'], $subjectId)) {
                return $entry;
            }
        }

        return null;
    }

    /** @return list<array{subject_id: int, prerequisites: list<int>, standing: ?int}> */
    private function curriculumEntries(int $curriculumId): array
    {
        if (isset($this->curriculumCache[$curriculumId])) {
            return $this->curriculumCache[$curriculumId];
        }

        $rows = DB::table('curriculum_term_subjects as e')
            ->join('curriculum_term as t', 't.id', '=', 'e.curriculum_term_id')
            ->where('t.curriculum_id', $curriculumId)
            ->get(['e.id', 'e.subject_id', 'e.required_year_level_id']);
        $links = $rows->isEmpty() ? collect() : DB::table('pre_requisite_subjects as p')
            ->join('curriculum_term_subjects as r', 'r.id', '=', 'p.required_term_subject_id')
            ->whereIn('p.curriculum_term_subjects_id', $rows->pluck('id'))
            ->get(['p.curriculum_term_subjects_id', 'r.subject_id']);

        $required = [];
        foreach ($links as $link) {
            $required[(int) $link->curriculum_term_subjects_id][] = (int) $link->subject_id;
        }
        $this->loadSubjects([...$rows->pluck('subject_id')->all(), ...$links->pluck('subject_id')->all()]);

        return $this->curriculumCache[$curriculumId] = $rows->map(fn ($row) => [
            'subject_id' => (int) $row->subject_id,
            'prerequisites' => $required[(int) $row->id] ?? [],
            'standing' => $row->required_year_level_id ? (int) $row->required_year_level_id : null,
        ])->all();
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

    // ---- The student's grades ----

    /**
     * The record that best describes the student's standing in a subject: a pass if there
     * is one, else the latest attempt.
     */
    private function standingIn(int $subjectId, array $history): ?array
    {
        $records = array_values(array_filter($history, fn ($record) => $this->counts($record, $subjectId)));
        if ($records === []) {
            return null;
        }
        usort($records, fn ($a, $b) => $b['order'] <=> $a['order']);

        foreach ($records as $record) {
            if ($record['status'] === 'passed') {
                return $record;
            }
        }

        return $records[0];
    }

    /** Whether a grade record is for this subject. */
    private function counts(array $record, int $subjectId): bool
    {
        if ($record['subject_id'] !== null && $this->key($record['subject_id']) === $this->key($subjectId)) {
            return true;
        }

        return $this->codeAndTitleMatch($record['code'], $record['title'], $subjectId);
    }

    /** Same subject: same group, or exact code and title; with $loose, also one of its codes with a similar title. */
    private function sameSubject(int $a, int $b, bool $loose = true): bool
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

    private function codeAndTitleMatch(string $code, string $title, int $subjectId): bool
    {
        $code = self::looseCode($code);
        if ($code === '') {
            return false;
        }
        $title = CurriculumComparison::canonicalTitle($title);
        foreach ($this->codesOf($subjectId) as [$otherCode, $otherTitle]) {
            if ($otherCode === $code && self::similarTitles($title, $otherTitle)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Every grade the student has outside this school year, newest last.
     *
     * @return list<array{subject_id: ?int, code: string, title: string, status: string, grade: string, term: string, order: int}>
     */
    private function history(int $studentId, int $schoolYearId): array
    {
        $records = [];

        $rows = DB::table('student_subjects')
            ->join('enrolled_students as es', 'es.id', '=', 'student_subjects.enrolled_students_id')
            ->join('year_section as ys', 'ys.id', '=', 'es.year_section_id')
            ->join('school_years as sy', 'sy.id', '=', 'ys.school_year_id')
            ->join('year_section_subjects as yss', 'yss.id', '=', 'student_subjects.year_section_subjects_id')
            ->join('subjects as s', 's.id', '=', 'yss.subject_id')
            ->where('es.student_id', $studentId)
            ->where('ys.school_year_id', '!=', $schoolYearId)
            ->get([
                's.id as subject_id', 's.subject_code', 's.descriptive_title',
                'student_subjects.dropped', 'student_subjects.midterm_grade', 'student_subjects.final_grade', FinalRating::column(),
                'sy.start_year', 'sy.end_year', 'sy.semester_id',
            ]);
        foreach ($rows as $row) {
            $this->subjects[(int) $row->subject_id] ??= ['code' => trim((string) $row->subject_code), 'title' => trim((string) $row->descriptive_title)];
            $rating = FinalRating::of($row);
            $status = $row->dropped ? 'dropped' : match (FinalRating::remark($rating)) {
                'PASSED' => 'passed', 'FAILED' => 'failed', 'DROPPED' => 'dropped', default => 'pending',
            };
            $records[] = self::record((int) $row->subject_id, $row->subject_code, $row->descriptive_title, $status, $rating,
                (int) $row->start_year, (int) $row->end_year, (int) $row->semester_id, '');
        }

        $idNo = (string) DB::table('users')->where('id', $studentId)->value('user_id_no');
        if ($idNo !== '') {
            foreach (DB::table('student_grades')->where('id_no', $idNo)->get(['subject_code', 'subject', 'grade', 'school_year', 'semester']) as $row) {
                $this->addTextRecord($records, $row->subject_code, $row->subject, is_numeric(trim((string) $row->grade)) ? trim((string) $row->grade) : null, $row->school_year, $row->semester, '');
            }

            foreach (DB::table('fes_student_grades')->where('id_no', $idNo)->get(['subject_code', 'subject', 'midterm', 'final', 'finalGrade', 'school_year', 'semester']) as $row) {
                // A final grade of 0 was often left unset; both period grades are needed otherwise.
                $grade = (float) $row->finalGrade > 0 ? (string) $row->finalGrade
                    : ((float) $row->midterm > 0 && (float) $row->final > 0 ? FinalRating::compute($row->midterm, $row->final) : null);
                $this->addTextRecord($records, $row->subject_code, $row->subject, $grade, $row->school_year, $row->semester, '');
            }
        }

        $rows = DB::table('academic_record_subjects as s')
            ->join('academic_records as r', 'r.id', '=', 's.academic_record_id')
            ->where('r.student_id', $studentId)
            ->get(['s.subject_code', 's.descriptive_title', 's.grade', 's.re_exam', 'r.school_year', 'r.semester', 'r.record_type']);
        foreach ($rows as $row) {
            $grade = is_numeric(trim((string) $row->re_exam)) ? trim((string) $row->re_exam) : trim((string) $row->grade);
            if (!is_numeric($grade)) {
                $grade = in_array(strtoupper($grade), ['P', 'PASS', 'PASSED', 'CR', 'CREDITED'], true) ? 'passed' : null;
            }
            $where = $row->record_type === 'transferee' ? ' (transferee record)' : '';
            $this->addTextRecord($records, $row->subject_code, $row->descriptive_title, $grade, $row->school_year, $row->semester, $where);
        }

        return $records;
    }

    private function addTextRecord(array &$records, $code, $title, ?string $grade, $schoolYear, $semester, string $where): void
    {
        if ($grade === null) {
            return; // No grade to go by.
        }
        $status = $grade === 'passed' ? 'passed' : match (FinalRating::remark($grade)) {
            'PASSED' => 'passed', 'FAILED' => 'failed', default => 'dropped',
        };
        preg_match('/(\d{4})\D+(\d{4})/', (string) $schoolYear, $years);
        $records[] = self::record(null, (string) $code, (string) $title, $status, $grade === 'passed' ? 'passed' : $grade,
            (int) ($years[1] ?? 0), (int) ($years[2] ?? 0), self::semesterNumber((string) $semester), $where);
    }

    private static function record(?int $subjectId, $code, $title, string $status, ?string $grade, int $start, int $end, int $semester, string $where): array
    {
        $term = trim((self::SEMESTER[$semester] ?? '').' '.($start ? "{$start}–{$end}" : 'an earlier term')).$where;

        return [
            'subject_id' => $subjectId,
            'code' => trim((string) $code),
            'title' => trim((string) $title),
            'status' => $status,
            'grade' => (string) $grade,
            'term' => $term,
            'order' => $start * 10 + $semester,
        ];
    }

    /** 1 (first), 2 (second) or 3 (summer) from "FIRST", "Second", "summer", "1st"...; 0 if unknown. */
    public static function semesterNumber(string $semester): int
    {
        $s = strtolower(trim($semester));

        return match (true) {
            str_contains($s, 'sum') => 3,
            str_starts_with($s, 'f') || str_starts_with($s, '1') => 1,
            str_starts_with($s, 's') || str_starts_with($s, '2') => 2,
            default => 0,
        };
    }

    // ---- Subjects ----

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
            $this->subjects[(int) $row->subject_id] = ['code' => trim((string) $row->subject_code), 'title' => trim((string) $row->descriptive_title)];
        }

        return $classes;
    }

    private function loadSubjects(array $ids): void
    {
        $missing = array_diff(self::ids($ids), array_keys($this->subjects));
        if ($missing === []) {
            return;
        }
        foreach (DB::table('subjects')->whereIn('id', $missing)->get(['id', 'subject_code', 'descriptive_title']) as $row) {
            $this->subjects[(int) $row->id] = ['code' => trim((string) $row->subject_code), 'title' => trim((string) $row->descriptive_title)];
        }
    }

    private function subject(int $id): array
    {
        $this->loadSubjects([$id]);

        return $this->subjects[$id] ?? ['code' => '', 'title' => ''];
    }

    private function label(int $subjectId): string
    {
        $subject = $this->subject($subjectId);

        return trim("{$subject['code']} {$subject['title']}");
    }

    /** Same-subject key: the subject's group, or its exact code and title. */
    private function key(int $subjectId): string
    {
        if (!isset($this->keyCache[$subjectId])) {
            $subject = $this->subject($subjectId);
            $group = SubjectGroups::groupIn($this->index, $subjectId, $subject['code'], $subject['title']);
            $this->keyCache[$subjectId] = $group === null ? 'subject:'.SubjectGroups::codeTitleKey($subject['code'], $subject['title']) : 'group:'.$group;
        }

        return $this->keyCache[$subjectId];
    }

    /** The subject's codes with their titles: its own, and those of the others in its group. */
    private function codesOf(int $subjectId): array
    {
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

    /** "Gen Ed 6", "GENED06" and "GenEd-6" are the same code; so are IT104 and IT104-. */
    public static function looseCode(string $code): string
    {
        $code = strtoupper(preg_replace('/[^A-Za-z0-9]+/', '', $code));

        return preg_replace('/(?<=[A-Z])0+(?=\d)/', '', $code);
    }

    /** Titles that name the same subject: same numbers, and the same or very similar words. */
    private static function similarTitles(string $a, string $b): bool
    {
        if ($a === '' || $b === '') {
            return false;
        }
        if ($a === $b) {
            return true;
        }
        $numbers = fn ($t) => preg_match_all('/\d+/', $t, $m) ? implode(',', $m[0]) : '';

        return $numbers($a) === $numbers($b) && CurriculumComparison::titleSimilarity($a, $b) >= CurriculumComparison::SIMILAR_TITLE_THRESHOLD;
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
