<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Suggests a student's type when enrolling them into a term (staff can still change it):
 *
 * - Old: has a record from the previous semester or later. Summer doesn't count as
 *   skipping, and taking the summer right after it counts as continuing.
 * - Returnee: has an earlier record (an OCC enrollment, old imported grades, FES grades or
 *   an old academic record) but skipped at least one semester.
 * - Transferee: no OCC record, but a transferee record from another school.
 * - No suggestion: no record at all, so staff choose Freshman or Transferee.
 */
class StudentTypes
{
    public const FRESHMAN = 1;
    public const TRANSFEREE = 2;
    public const OLD = 3;
    public const RETURNEE = 4;

    private const NAMES = [1 => 'Freshman', 2 => 'Transferee', 3 => 'Old', 4 => 'Returnee'];
    private const SEMESTER = [1 => '1st sem', 2 => '2nd sem', 3 => 'Summer'];

    /** @return array{type_id: ?int, name: ?string, reason: string} */
    public function suggest(int $studentId, int $schoolYearId): array
    {
        $term = DB::table('school_years')->where('id', $schoolYearId)->first(['start_year', 'semester_id']);
        $target = $term ? self::key((int) $term->start_year, (int) $term->semester_id) : PHP_INT_MAX;
        $previous = $term ? self::previousSemester((int) $term->start_year, (int) $term->semester_id) : null;

        // Every term the student has a record in, before the one being enrolled
        // (0 for an OCC enrollment whose school year no longer exists).
        $keys = array_values(array_filter($this->recordTerms($studentId), fn ($key) => $key < $target));
        rsort($keys);

        if ($keys !== [] && ($previous === null || $keys[0] >= $previous)) {
            return self::result(self::OLD, $keys[0] > 0 ? 'Enrolled in '.self::label($keys[0]).'.' : 'Has earlier OCC records.');
        }

        if ($keys !== []) {
            $skipped = $previous !== null ? 'skipped '.self::label($previous) : 'skipped a semester';

            return self::result(self::RETURNEE, $keys[0] > 0
                ? 'Last enrolled in '.self::label($keys[0])."; {$skipped}."
                : "Has earlier OCC records; {$skipped}.");
        }

        $transferee = DB::table('academic_records')->where('student_id', $studentId)->where('record_type', 'transferee')->first(['school_name']);
        if ($transferee !== null) {
            $from = trim((string) $transferee->school_name);

            return self::result(self::TRANSFEREE, 'Has a transferee record'.($from !== '' ? " from {$from}" : '').'.');
        }

        return ['type_id' => null, 'name' => null, 'reason' => 'No records at OCC yet: choose Freshman or Transferee.'];
    }

    /** @return list<int> term keys (start year * 10 + semester) */
    private function recordTerms(int $studentId): array
    {
        $keys = DB::table('enrolled_students as es')
            ->join('year_section as ys', 'ys.id', '=', 'es.year_section_id')
            ->leftJoin('school_years as sy', 'sy.id', '=', 'ys.school_year_id')
            ->where('es.student_id', $studentId)
            ->get(['sy.start_year', 'sy.semester_id'])
            ->map(fn ($row) => $row->start_year === null ? 0 : self::key((int) $row->start_year, (int) $row->semester_id))
            ->all();

        $idNo = (string) DB::table('users')->where('id', $studentId)->value('user_id_no');
        $old = $idNo === '' ? collect() : DB::table('student_grades')->where('id_no', $idNo)->distinct()->get(['school_year', 'semester'])
            ->merge(DB::table('fes_student_grades')->where('id_no', $idNo)->distinct()->get(['school_year', 'semester']));
        $old = $old->merge(DB::table('academic_records')->where('student_id', $studentId)->where('record_type', 'old')->get(['school_year', 'semester']));

        foreach ($old as $row) {
            if (preg_match('/(\d{4})/', (string) $row->school_year, $year)) {
                $keys[] = self::key((int) $year[1], GradeRecords::semesterNumber((string) $row->semester));
            }
        }

        return $keys;
    }

    /** The regular semester before this term: 1st sem follows last year's 2nd; summer follows the 2nd. */
    private static function previousSemester(int $startYear, int $semester): int
    {
        return match ($semester) {
            1 => self::key($startYear - 1, 2),
            2 => self::key($startYear, 1),
            default => self::key($startYear, 2),
        };
    }

    private static function key(int $startYear, int $semester): int
    {
        return $startYear * 10 + $semester;
    }

    /** "2nd sem 2025–2026" */
    private static function label(int $key): string
    {
        $year = intdiv($key, 10);
        $semester = $key % 10;

        return trim((self::SEMESTER[$semester] ?? '').' '.$year.'–'.($year + 1));
    }

    private static function result(int $typeId, string $reason): array
    {
        return ['type_id' => $typeId, 'name' => self::NAMES[$typeId], 'reason' => $reason];
    }
}
