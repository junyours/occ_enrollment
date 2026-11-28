<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * Every grade a student has, from all the places the Student Grades page reads: classes in
 * this system, old imported grades, FES grades, and old/transferee academic records.
 *
 * Each record has a stable reference ("class:123", "old:45", "fes:6", "record:7") so a grade
 * can be matched to a curriculum subject by hand (student_grade_matches).
 */
class GradeRecords
{
    public const CLASS_TYPE = 'class';   // student_subjects.id
    public const OLD = 'old';            // student_grades.id
    public const FES = 'fes';            // fes_student_grades.id
    public const RECORD = 'record';      // academic_record_subjects.id

    private const SEMESTER = [1 => '1st sem', 2 => '2nd sem', 3 => 'Summer'];

    /**
     * @return list<array{ref: string, source_type: string, source_id: int, subject_id: ?int, code: string, title: string,
     *     units: ?int, status: string, grade: string, term: string, order: int, school_year_id: ?int, transferee: bool}>
     *     status: "passed", "failed", "dropped" or "pending" (no grade yet); oldest first
     */
    public function forStudent(int $studentId, ?int $exceptSchoolYearId = null): array
    {
        $records = [];

        $rows = DB::table('student_subjects')
            ->join('enrolled_students as es', 'es.id', '=', 'student_subjects.enrolled_students_id')
            ->join('year_section as ys', 'ys.id', '=', 'es.year_section_id')
            ->join('school_years as sy', 'sy.id', '=', 'ys.school_year_id')
            ->join('year_section_subjects as yss', 'yss.id', '=', 'student_subjects.year_section_subjects_id')
            ->join('subjects as s', 's.id', '=', 'yss.subject_id')
            ->where('es.student_id', $studentId)
            ->when($exceptSchoolYearId !== null, fn ($q) => $q->where('ys.school_year_id', '!=', $exceptSchoolYearId))
            ->get([
                'student_subjects.id', 's.id as subject_id', 's.subject_code', 's.descriptive_title', 's.credit_units',
                'student_subjects.dropped', 'student_subjects.midterm_grade', 'student_subjects.final_grade', FinalRating::column(),
                'ys.school_year_id', 'sy.start_year', 'sy.end_year', 'sy.semester_id',
            ]);
        foreach ($rows as $row) {
            $rating = FinalRating::of($row);
            $status = $row->dropped ? 'dropped' : match (FinalRating::remark($rating)) {
                'PASSED' => 'passed', 'FAILED' => 'failed', 'DROPPED' => 'dropped', default => 'pending',
            };
            $records[] = self::record(self::CLASS_TYPE, (int) $row->id, (int) $row->subject_id, $row->subject_code, $row->descriptive_title,
                (int) $row->credit_units, $status, $rating, (int) $row->start_year, (int) $row->semester_id, '', (int) $row->school_year_id);
        }

        $idNo = (string) DB::table('users')->where('id', $studentId)->value('user_id_no');
        if ($idNo !== '') {
            foreach (DB::table('student_grades')->where('id_no', $idNo)->get(['id', 'subject_code', 'subject', 'units', 'grade', 'school_year', 'semester']) as $row) {
                $grade = is_numeric(trim((string) $row->grade)) ? trim((string) $row->grade) : null;
                $this->addText($records, self::OLD, (int) $row->id, $row->subject_code, $row->subject, $row->units, $grade, $row->school_year, $row->semester);
            }

            foreach (DB::table('fes_student_grades')->where('id_no', $idNo)->get(['id', 'subject_code', 'subject', 'midterm', 'final', 'finalGrade', 'school_year', 'semester']) as $row) {
                // A final grade of 0 was often left unset; both period grades are needed otherwise.
                $grade = (float) $row->finalGrade > 0 ? (string) $row->finalGrade
                    : ((float) $row->midterm > 0 && (float) $row->final > 0 ? FinalRating::compute($row->midterm, $row->final) : null);
                $this->addText($records, self::FES, (int) $row->id, $row->subject_code, $row->subject, null, $grade, $row->school_year, $row->semester);
            }
        }

        $rows = DB::table('academic_record_subjects as s')
            ->join('academic_records as r', 'r.id', '=', 's.academic_record_id')
            ->where('r.student_id', $studentId)
            ->get(['s.id', 's.subject_code', 's.descriptive_title', 's.units', 's.grade', 's.re_exam', 'r.school_year', 'r.semester', 'r.record_type', 'r.school_name']);
        foreach ($rows as $row) {
            $grade = is_numeric(trim((string) $row->re_exam)) ? trim((string) $row->re_exam) : trim((string) $row->grade);
            if (!is_numeric($grade)) {
                $grade = in_array(strtoupper($grade), ['P', 'PASS', 'PASSED', 'CR', 'CREDITED'], true) ? 'passed' : null;
            }
            $transferee = $row->record_type === 'transferee';
            $where = $transferee ? ' (transferee record'.(trim((string) $row->school_name) !== '' ? ', '.trim((string) $row->school_name) : '').')' : '';
            $this->addText($records, self::RECORD, (int) $row->id, $row->subject_code, $row->descriptive_title, $row->units, $grade, $row->school_year, $row->semester, $where, $transferee);
        }

        usort($records, fn ($a, $b) => [$a['order'], $a['ref']] <=> [$b['order'], $b['ref']]);

        return $records;
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

    private function addText(array &$records, string $type, int $id, $code, $title, $units, ?string $grade, $schoolYear, $semester, string $where = '', bool $transferee = false): void
    {
        if ($grade === null) {
            return; // No grade to go by.
        }
        $status = $grade === 'passed' ? 'passed' : match (FinalRating::remark($grade)) {
            'PASSED' => 'passed', 'FAILED' => 'failed', default => 'dropped',
        };
        preg_match('/(\d{4})/', (string) $schoolYear, $year);
        $records[] = self::record($type, $id, null, $code, $title, is_numeric($units) ? (int) $units : null, $status, $grade,
            (int) ($year[1] ?? 0), self::semesterNumber((string) $semester), $where, null, $transferee);
    }

    private static function record(string $type, int $id, ?int $subjectId, $code, $title, ?int $units, string $status, ?string $grade,
        int $start, int $semester, string $where, ?int $schoolYearId, bool $transferee = false): array
    {
        $term = trim((self::SEMESTER[$semester] ?? '').' '.($start ? $start.'–'.($start + 1) : 'an earlier term')).$where;

        return [
            'ref' => "{$type}:{$id}",
            'source_type' => $type,
            'source_id' => $id,
            'subject_id' => $subjectId,
            'code' => trim((string) $code),
            'title' => trim((string) $title),
            'units' => $units,
            'status' => $status,
            'grade' => (string) $grade,
            'term' => $term,
            'order' => $start * 10 + $semester,
            'school_year_id' => $schoolYearId,
            'transferee' => $transferee,
        ];
    }
}
