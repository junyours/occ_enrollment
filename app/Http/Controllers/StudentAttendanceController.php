<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * A student's own attendance in one class, for the class page and the
 * mobile app: each meeting with the student's mark, grouped by grading
 * period with totals. Cancelled meetings are left out, and teachers'
 * remarks stay private.
 */
class StudentAttendanceController extends Controller
{
    private const PERIODS = ['final' => 'Final', 'midterm' => 'Midterm'];

    public function show(Request $request, int $classId): JsonResponse
    {
        $studentSubjectId = $this->enrollment($request, $classId);

        // Only meetings the student is on the roster of: a meeting gets its
        // roster when the teacher starts it.
        $meetings = DB::table('attendance_records as r')
            ->join('attendance_sessions as s', 's.id', '=', 'r.attendance_session_id')
            ->where('r.student_subject_id', $studentSubjectId)
            ->where('s.year_section_subject_id', $classId)
            ->where('s.status', '!=', 'cancelled')
            ->orderByDesc('s.attendance_date')
            ->orderByDesc('s.session_number')
            ->get([
                's.id',
                's.attendance_date',
                's.session_number',
                's.period',
                's.locked_at',
                'r.status',
                'r.time_in',
            ])
            ->map(fn($row) => [
                'id' => (int) $row->id,
                'period' => $row->period,
                'date' => substr((string) $row->attendance_date, 0, 10),
                'number' => (int) $row->session_number,
                'status' => $row->status,
                'time_in' => $row->time_in === null ? null : substr((string) $row->time_in, 0, 5),
                'locked' => $row->locked_at !== null,
            ]);

        $periods = [];

        foreach (self::PERIODS as $period => $label) {
            $rows = $meetings->where('period', $period)->values();

            if ($rows->isEmpty()) {
                continue;
            }

            $periods[] = [
                'period' => $period,
                'label' => $label,
                'totals' => $this->totals($rows),
                'meetings' => $rows->map(fn($row) => array_diff_key($row, ['period' => true]))->all(),
            ];
        }

        return response()
            ->json(['periods' => $periods])
            ->header('Cache-Control', 'private, no-store');
    }

    /**
     * Counts per mark, and the attendance rate the teacher's view uses:
     * present and late out of present, late and absent. Excused and
     * unrecorded meetings don't count either way.
     */
    private function totals($rows): array
    {
        $count = fn(?string $status) => $rows->where('status', $status)->count();

        $attended = $count('present') + $count('late');
        $counted = $attended + $count('absent');

        return [
            'present' => $count('present'),
            'late' => $count('late'),
            'absent' => $count('absent'),
            'excused' => $count('excused'),
            'unmarked' => $count(null),
            'rate' => $counted > 0 ? (int) round($attended / $counted * 100) : null,
        ];
    }

    /** The student's place in this class, by the same rules as Classwork. */
    private function enrollment(Request $request, int $classId): int
    {
        $rows = DB::table('student_subjects as ss')
            ->join('enrolled_students as es', 'es.id', '=', 'ss.enrolled_students_id')
            ->where('ss.year_section_subjects_id', $classId)
            ->where(fn($query) => $query->whereNull('ss.dropped')->orWhere('ss.dropped', 0))
            ->where('es.student_id', $request->user()->id)
            ->pluck('ss.id');

        abort_if($rows->isEmpty(), 403, 'You are not enrolled in this class.');
        abort_unless($rows->count() === 1, 409, 'Duplicate class enrollment needs to be corrected.');

        return (int) $rows->first();
    }
}
