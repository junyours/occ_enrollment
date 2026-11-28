<?php

namespace App\Services;

use App\Models\StudentCurriculum;
use Illuminate\Support\Facades\DB;

/**
 * The curriculum a student follows in a program:
 *
 * 1. the one staff set (student_curricula), else
 * 2. the one that best matches the classes of the student's first term in the program
 *    (sections are built from the curriculum active for their year level, so a regular
 *    student's first classes come from their own curriculum), else
 * 3. for a student new to the program, the one active for the year level they're
 *    enrolling in (where this term's classes come from), else
 * 4. the newest one that had started by then.
 *
 * So a backlog student keeps the curriculum they started with, whatever their year level.
 */
class StudentCurricula
{
    public function __construct(private SubjectGroups $groups)
    {
    }

    /**
     * @return array{id: int, label: string, source: string, set_by: ?string}|null
     *         source: "set", "first_term", "active" or "start_year"; null when the program has no curricula
     */
    public function resolve(int $studentId, int $courseId, ?int $yearLevelId = null, ?int $schoolYearId = null): ?array
    {
        $curricula = $this->curricula($courseId);
        if ($curricula === []) {
            return null;
        }

        $set = DB::table('student_curricula')->where('student_id', $studentId)->where('course_id', $courseId)->first(['curriculum_id', 'set_by']);
        if ($set && isset($curricula[(int) $set->curriculum_id])) {
            return $this->describe($curricula[(int) $set->curriculum_id], 'set', $set->set_by === null ? null : (int) $set->set_by);
        }

        $first = $this->firstTerm($studentId, $courseId);
        if ($first !== null && ($best = $this->bestMatch($curricula, $first['subject_ids'], $first['start_year'])) !== null) {
            return $this->describe($curricula[$best], 'first_term');
        }

        if ($first === null && $yearLevelId !== null) {
            $active = $this->activeFor($courseId, $yearLevelId);
            if ($active !== null && isset($curricula[$active])) {
                return $this->describe($curricula[$active], 'active');
            }
        }

        $year = $first['start_year']
            ?? ($schoolYearId ? (int) DB::table('school_years')->where('id', $schoolYearId)->value('start_year') : 0)
            ?: (int) date('Y');

        return $this->describe($curricula[$this->startedBy($curricula, $year)], 'start_year');
    }

    /** @return array<int, array{id: int, label: string, start: int}> the program's curricula by id, oldest first */
    public function curricula(int $courseId): array
    {
        $program = trim((string) DB::table('course')->where('id', $courseId)->value('course_name_abbreviation'));
        $list = [];
        $rows = DB::table('curriculum')->where('course_id', $courseId)
            ->orderBy('school_year_start')->orderBy('id')
            ->get(['id', 'school_year_start', 'school_year_end']);
        foreach ($rows as $row) {
            $list[(int) $row->id] = [
                'id' => (int) $row->id,
                'label' => trim("{$program} {$row->school_year_start}–{$row->school_year_end}"),
                'start' => (int) $row->school_year_start,
            ];
        }

        return $list;
    }

    /** Sets (or with null, clears) the curriculum a student follows in a program. */
    public function set(int $studentId, int $courseId, ?int $curriculumId, ?int $userId): void
    {
        if ($curriculumId === null) {
            StudentCurriculum::where('student_id', $studentId)->where('course_id', $courseId)->delete();

            return;
        }

        StudentCurriculum::updateOrCreate(
            ['student_id' => $studentId, 'course_id' => $courseId],
            ['curriculum_id' => $curriculumId, 'set_by' => $userId],
        );
    }

    /** The student's earliest enrollment in the program: when it was, and its classes' subjects. */
    private function firstTerm(int $studentId, int $courseId): ?array
    {
        $first = DB::table('enrolled_students as es')
            ->join('year_section as ys', 'ys.id', '=', 'es.year_section_id')
            ->join('school_years as sy', 'sy.id', '=', 'ys.school_year_id')
            ->where('es.student_id', $studentId)
            ->where('ys.course_id', $courseId)
            ->orderBy('sy.start_year')->orderBy('sy.semester_id')->orderBy('es.id')
            ->first(['es.id', 'sy.start_year']);
        if ($first === null) {
            return null;
        }

        $subjectIds = DB::table('student_subjects as ss')
            ->join('year_section_subjects as yss', 'yss.id', '=', 'ss.year_section_subjects_id')
            ->where('ss.enrolled_students_id', $first->id)
            ->pluck('yss.subject_id')->map(fn ($id) => (int) $id)->all();

        return ['start_year' => (int) $first->start_year, 'subject_ids' => $subjectIds];
    }

    /**
     * The curriculum with the most of these subjects; on a tie, the newest one that had
     * started by $startYear (a copied curriculum year has the same subjects as its source).
     */
    private function bestMatch(array $curricula, array $subjectIds, int $startYear): ?int
    {
        if ($subjectIds === []) {
            return null;
        }

        $entries = DB::table('curriculum_term_subjects as e')
            ->join('curriculum_term as t', 't.id', '=', 'e.curriculum_term_id')
            ->whereIn('t.curriculum_id', array_keys($curricula))
            ->get(['t.curriculum_id', 'e.subject_id']);
        $keys = $this->groups->sameSubjectKeys([...$subjectIds, ...$entries->pluck('subject_id')->all()]);
        $taken = array_flip(array_filter(array_map(fn ($id) => $keys[$id] ?? null, $subjectIds)));

        $matches = [];
        foreach ($entries as $entry) {
            $key = $keys[(int) $entry->subject_id] ?? null;
            if ($key !== null && isset($taken[$key])) {
                $matches[(int) $entry->curriculum_id][$key] = true;
            }
        }
        if ($matches === []) {
            return null;
        }

        $ranked = array_keys($curricula);
        usort($ranked, function ($a, $b) use ($matches, $curricula, $startYear) {
            $score = count($matches[$b] ?? []) <=> count($matches[$a] ?? []);
            if ($score !== 0) {
                return $score;
            }
            $startedA = $curricula[$a]['start'] <= $startYear;
            $startedB = $curricula[$b]['start'] <= $startYear;
            if ($startedA !== $startedB) {
                return $startedA ? -1 : 1;
            }

            return $startedA
                ? $curricula[$b]['start'] <=> $curricula[$a]['start']
                : $curricula[$a]['start'] <=> $curricula[$b]['start'];
        });

        return $ranked[0];
    }

    /** The curriculum new classes of this year level are made from. */
    private function activeFor(int $courseId, int $yearLevelId): ?int
    {
        $id = DB::table('curriculum_term as t')
            ->join('curriculum as c', 'c.id', '=', 't.curriculum_id')
            ->where('c.course_id', $courseId)
            ->where('t.year_level_id', $yearLevelId)
            ->where('t.active', 1)
            ->orderByDesc('c.id')
            ->value('c.id');

        return $id === null ? null : (int) $id;
    }

    /** The newest curriculum that had started by $year, else the oldest. */
    private function startedBy(array $curricula, int $year): int
    {
        $started = array_filter($curricula, fn ($c) => $c['start'] <= $year);

        return $started === [] ? array_key_first($curricula) : array_key_last($started);
    }

    private function describe(array $curriculum, string $source, ?int $setBy = null): array
    {
        $name = null;
        if ($setBy !== null && DB::getSchemaBuilder()->hasTable('user_information')) {
            $user = DB::table('user_information')->where('user_id', $setBy)->first(['first_name', 'last_name']);
            $name = $user ? trim("{$user->first_name} {$user->last_name}") : null;
        }

        return ['id' => $curriculum['id'], 'label' => $curriculum['label'], 'source' => $source, 'set_by' => $name];
    }
}
