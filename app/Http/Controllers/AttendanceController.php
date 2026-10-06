<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class AttendanceController extends Controller
{
    // These arrival times and meeting dates use the school's local timezone.
    private const TIME_ZONE = 'Asia/Manila';

    private function today(): string
    {
        return now(self::TIME_ZONE)->toDateString();
    }

    private function ownedClass(Request $request, int $classId, bool $lock = false): object
    {
        abort_unless($request->user(), 401, 'Unauthenticated.');
        $query = DB::table('year_section_subjects')->where('id', $classId);
        if ($lock) {
            $query->lockForUpdate();
        }
        $class = $query->first();
        abort_unless($class, 404, 'Class not found.');
        abort_unless(
            (string) $class->faculty_id === (string) $request->user()->id,
            403,
            'You are not assigned to this class.'
        );
        return $class;
    }

    private function ownedSession(Request $request, int $classId, int $sessionId): object
    {
        // Called inside a transaction. Always lock class, then session.
        $this->ownedClass($request, $classId, true);
        $session = DB::table('attendance_sessions')->where('id', $sessionId)
            ->where('year_section_subject_id', $classId)->lockForUpdate()->first();
        abort_unless($session, 404, 'Attendance meeting not found.');
        return $session;
    }

    private function checkActor(Request $request): void
    {
        $data = $request->validate(['actor_id' => ['required', 'integer', 'min:1']]);
        abort_unless(
            $request->user() && (string) $request->user()->id === (string) $data['actor_id'],
            403,
            'These pending changes belong to another signed-in account.'
        );
    }

    private function assertUnlocked(object $session): void
    {
        abort_if($session->locked_at !== null, 423, 'This meeting is permanently locked.');
    }

    private function checkVersion(object $session, int $version): void
    {
        abort_unless(
            (int) $session->lock_version === $version,
            409,
            'Attendance changed elsewhere. Review the latest records before syncing your pending changes.'
        );
    }

    private function bumpVersion(object $session, array $changes = []): void
    {
        $session->lock_version = (int) $session->lock_version + 1;
        $session->updated_at = now();
        foreach ($changes as $key => $value) {
            $session->{$key} = $value;
        }
        DB::table('attendance_sessions')->where('id', $session->id)->update($changes + [
            'lock_version' => $session->lock_version,
            'updated_at' => $session->updated_at,
        ]);
    }

    private function initializeRoster(object $session): void
    {
        if ($session->roster_initialized_at !== null) {
            return;
        }
        $students = DB::table('student_subjects as ss')
            ->join('enrolled_students as e', 'e.id', '=', 'ss.enrolled_students_id')
            ->where('ss.year_section_subjects_id', $session->year_section_subject_id)
            ->where(fn($q) => $q->whereNull('ss.dropped')->orWhere('ss.dropped', 0))
            ->where('e.date_enrolled', '<=', $session->attendance_date)
            ->select('ss.id', 'e.student_id')->orderBy('ss.id')->lockForUpdate()->get();
        if ($students->pluck('student_id')->unique()->count() !== $students->count()) {
            throw ValidationException::withMessages([
                'roster' => 'Resolve duplicate student enrollments in this class before starting attendance.',
            ]);
        }
        $now = now();
        foreach ($students->chunk(500) as $chunk) {
            DB::table('attendance_records')->insert($chunk->map(fn($student) => [
                'attendance_session_id' => $session->id,
                'student_subject_id' => $student->id,
                'status' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all());
        }
        $this->bumpVersion($session, ['roster_initialized_at' => $now]);
    }

    private function detail(object $session): array
    {
        // Latest profile avoids duplicating a roster row if old profile rows exist.
        $profileIds = DB::table('user_information')->select('user_id')
            ->selectRaw('MAX(id) AS id')->groupBy('user_id');
        $term = DB::table('attendance_records as r')
            ->join('attendance_sessions as s', 's.id', '=', 'r.attendance_session_id')
            ->where('s.year_section_subject_id', $session->year_section_subject_id)
            ->where('s.status', '!=', 'cancelled')
            ->select('r.student_subject_id')
            ->selectRaw("SUM(CASE WHEN r.status IN ('present', 'late') THEN 1 ELSE 0 END) AS attended")
            ->selectRaw("SUM(CASE WHEN r.status IN ('present', 'late', 'absent') THEN 1 ELSE 0 END) AS counted")
            ->groupBy('r.student_subject_id');

        $records = DB::table('attendance_records as r')
            ->join('student_subjects as ss', 'ss.id', '=', 'r.student_subject_id')
            ->leftJoin('enrolled_students as e', 'e.id', '=', 'ss.enrolled_students_id')
            ->leftJoin('users as u', 'u.id', '=', 'e.student_id')
            ->leftJoinSub($profileIds, 'profile', 'profile.user_id', '=', 'u.id')
            ->leftJoin('user_information as ui', 'ui.id', '=', 'profile.id')
            ->leftJoinSub($term, 'term', 'term.student_subject_id', '=', 'ss.id')
            ->where('r.attendance_session_id', $session->id)
            ->select(
                'r.*',
                'e.student_id',
                'u.user_id_no',
                'ss.dropped',
                'ui.first_name',
                'ui.last_name',
                'ui.middle_name',
                'ui.suffix',
                'term.attended',
                'term.counted'
            )
            ->orderBy('ui.last_name')->orderBy('ui.first_name')->orderBy('r.id')->get();

        foreach ($records as $row) {
            $row->term_attended = (int) ($row->attended ?? 0);
            $row->term_count = (int) ($row->counted ?? 0);
            $row->term_rate = $row->term_count > 0
                ? (int) round($row->term_attended / $row->term_count * 100) : null;
            $row->time_in = $row->time_in === null ? null : substr($row->time_in, 0, 5);
            unset($row->attended, $row->counted);
        }
        $session->roster_count = $records->count();
        $session->marked_count = $records->filter(fn($row) => $row->status !== null)->count();
        foreach (['present', 'late', 'absent', 'excused'] as $status) {
            $session->{$status . '_count'} = $records->where('status', $status)->count();
        }
        $session->lock_version = (int) $session->lock_version;
        return [
            'session' => $session,
            'records' => $records,
            'today' => $this->today(),
            'time_zone' => self::TIME_ZONE
        ];
    }

    public function index(Request $request, int $classId): JsonResponse
    {
        $class = $this->ownedClass($request, $classId);
        $data = $request->validate(['period' => ['sometimes', 'in:midterm,final']]);
        $period = $data['period'] ?? null;
        $sessionIds = DB::table('attendance_sessions')->select('id')
            ->where('year_section_subject_id', $classId)
            ->when($period !== null, fn($query) => $query->where('period', $period));
        $counts = DB::table('attendance_records')->select('attendance_session_id')
            ->whereIn('attendance_session_id', $sessionIds)
            ->selectRaw('COUNT(*) AS roster_count')
            ->selectRaw('SUM(CASE WHEN status IS NOT NULL THEN 1 ELSE 0 END) AS marked_count')
            ->selectRaw("SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present_count")
            ->selectRaw("SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late_count")
            ->selectRaw("SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) AS absent_count")
            ->selectRaw("SUM(CASE WHEN status = 'excused' THEN 1 ELSE 0 END) AS excused_count")
            ->groupBy('attendance_session_id');
        $sessions = DB::table('attendance_sessions as s')
            ->leftJoinSub($counts, 'c', 'c.attendance_session_id', '=', 's.id')
            ->where('s.year_section_subject_id', $classId)
            ->when($period !== null, fn($query) => $query->where('s.period', $period))
            ->select('s.*')->selectRaw('COALESCE(c.roster_count, 0) AS roster_count')
            ->selectRaw('COALESCE(c.marked_count, 0) AS marked_count')
            ->selectRaw('COALESCE(c.present_count, 0) AS present_count, COALESCE(c.late_count, 0) AS late_count')
            ->selectRaw('COALESCE(c.absent_count, 0) AS absent_count, COALESCE(c.excused_count, 0) AS excused_count')
            ->orderBy('s.attendance_date')->orderBy('s.session_number')->get();
        return response()->json([
            'sessions' => $sessions,
            'schedule_day' => $class->day,
            'today' => $this->today(),
            'time_zone' => self::TIME_ZONE
        ])->header('Cache-Control', 'private, no-store');
    }

    public function store(Request $request, int $classId): JsonResponse
    {
        $this->checkActor($request);
        $data = $request->validate([
            'attendance_date' => ['required', 'date_format:Y-m-d'],
            'session_number' => ['required', 'integer', 'between:1,65535'],
            'period' => ['required', 'in:midterm,final'],
        ]);
        $result = DB::transaction(function () use ($request, $classId, $data) {
            $this->ownedClass($request, $classId, true);
            $key = [
                'year_section_subject_id' => $classId,
                'attendance_date' => $data['attendance_date'],
                'session_number' => $data['session_number']
            ];
            $session = DB::table('attendance_sessions')->where($key)->lockForUpdate()->first();
            if ($session) {
                abort_unless(
                    $session->period === $data['period'],
                    422,
                    'This date and meeting number already belong to another grading period.'
                );
                if ($session->status === 'open' && $session->locked_at === null) {
                    $this->initializeRoster($session);
                }
                return $this->detail($session);
            }
            $now = now();
            $id = DB::table('attendance_sessions')->insertGetId($key + [
                'period' => $data['period'],
                'status' => 'open',
                'created_by' => $request->user()->id,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
            $session = DB::table('attendance_sessions')->find($id);
            $this->initializeRoster($session);
            return $this->detail($session);
        }, 3);
        return response()->json($result);
    }

    public function show(Request $request, int $classId, int $sessionId): JsonResponse
    {
        // Keeps the returned version and its records from different concurrent saves from mixing.
        $result = DB::transaction(fn() => $this->detail(
            $this->ownedSession($request, $classId, $sessionId)
        ), 3);
        return response()->json($result)->header('Cache-Control', 'private, no-store');
    }

    public function start(Request $request, int $classId, int $sessionId): JsonResponse
    {
        $this->checkActor($request);
        $data = $request->validate(['version' => ['required', 'integer', 'min:0']]);
        $result = DB::transaction(function () use ($request, $classId, $sessionId, $data) {
            $session = $this->ownedSession($request, $classId, $sessionId);
            $this->assertUnlocked($session);
            $this->checkVersion($session, (int) $data['version']);
            abort_unless($session->status === 'open', 422, 'Restore this cancelled meeting first.');
            $this->initializeRoster($session);
            return $this->detail($session);
        }, 3);
        return response()->json($result);
    }

    public function save(Request $request, int $classId, int $sessionId): JsonResponse
    {
        $this->checkActor($request);
        $data = $request->validate([
            'request_id' => ['required', 'uuid'],
            'version' => ['required', 'integer', 'min:0'],
            'records' => ['required', 'array', 'min:1', 'max:2000'],
            'records.*.student_subject_id' => ['required', 'integer', 'min:1', 'distinct'],
            'records.*.status' => ['present', 'nullable', 'in:present,absent,late,excused'],
            'records.*.remarks' => ['present', 'nullable', 'string', 'max:255'],
        ]);
        $hash = hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));
        $result = DB::transaction(function () use ($request, $classId, $sessionId, $data, $hash) {
            $session = $this->ownedSession($request, $classId, $sessionId);
            $receipt = DB::table('attendance_sync_receipts')->where('request_id', $data['request_id'])->first();
            if ($receipt) {
                abort_unless((int) $receipt->attendance_session_id === $sessionId &&
                    (int) $receipt->user_id === (int) $request->user()->id &&
                    hash_equals($receipt->payload_hash, $hash), 409, 'This sync request ID was already used.');
                return $this->detail($session);
            }
            $this->assertUnlocked($session);
            $this->checkVersion($session, (int) $data['version']);
            abort_unless($session->status === 'open', 422, 'Restore this cancelled meeting before editing.');
            abort_unless(
                $session->roster_initialized_at,
                422,
                'Start attendance before marking students.'
            );
            $ids = array_column($data['records'], 'student_subject_id');
            $existing = DB::table('attendance_records as r')
                ->join('student_subjects as ss', 'ss.id', '=', 'r.student_subject_id')
                ->where('r.attendance_session_id', $sessionId)->where('ss.year_section_subjects_id', $classId)
                ->whereIn('r.student_subject_id', $ids)->select('r.*')
                ->orderBy('r.student_subject_id')->lockForUpdate()->get()->keyBy('student_subject_id');
            abort_unless($existing->count() === count($ids), 422, 'Every student must belong to this meeting roster and class.');
            $now = now();
            $rows = [];
            foreach ($data['records'] as $input) {
                $old = $existing->get((int) $input['student_subject_id']);
                $changed = $input['status'] !== $old->status;
                $rows[] = [
                    'attendance_session_id' => $sessionId,
                    'student_subject_id' => $old->student_subject_id,
                    'status' => $input['status'],
                    // Arrival time is hidden. Keep existing times where still applicable.
                    'time_in' => in_array($input['status'], ['present', 'late'], true) ? $old->time_in : null,
                    'remarks' => $input['remarks'],
                    'marked_by' => $input['status'] === null ? null : ($changed ? $request->user()->id : $old->marked_by),
                    'marked_at' => $input['status'] === null ? null : ($changed ? $now : $old->marked_at),
                    'created_at' => $old->created_at,
                    'updated_at' => $now,
                ];
            }
            DB::table('attendance_records')->upsert(
                $rows,
                ['attendance_session_id', 'student_subject_id'],
                ['status', 'time_in', 'remarks', 'marked_by', 'marked_at', 'updated_at']
            );
            $this->bumpVersion($session);
            DB::table('attendance_sync_receipts')->insert([
                'request_id' => $data['request_id'],
                'attendance_session_id' => $sessionId,
                'user_id' => $request->user()->id,
                'payload_hash' => $hash,
                'created_at' => $now,
            ]);
            return $this->detail($session);
        }, 3);
        return response()->json($result);
    }

    public function setStatus(Request $request, int $classId, int $sessionId): JsonResponse
    {
        $this->checkActor($request);
        $data = $request->validate([
            'version' => ['required', 'integer', 'min:0'],
            'status' => ['required', 'in:open,cancelled'],
        ]);
        $result = DB::transaction(function () use ($request, $classId, $sessionId, $data) {
            $session = $this->ownedSession($request, $classId, $sessionId);
            $this->assertUnlocked($session);
            $this->checkVersion($session, (int) $data['version']);
            $this->bumpVersion($session, ['status' => $data['status']]);
            return $this->detail($session);
        }, 3);
        return response()->json($result);
    }

    public function lock(Request $request, int $classId, int $sessionId): JsonResponse
    {
        $this->checkActor($request);
        $data = $request->validate(['version' => ['required', 'integer', 'min:0']]);
        $result = DB::transaction(function () use ($request, $classId, $sessionId, $data) {
            $session = $this->ownedSession($request, $classId, $sessionId);
            if ($session->locked_at !== null) return $this->detail($session);
            $this->checkVersion($session, (int) $data['version']);
            abort_unless(
                $session->status === 'open' && $session->roster_initialized_at,
                422,
                'Start this meeting before locking it.'
            );
            abort_if(DB::table('attendance_records')->where('attendance_session_id', $sessionId)
                ->whereNull('status')->exists(), 422, 'Mark every student before locking this meeting.');
            $this->bumpVersion($session, [
                'status' => 'closed',
                'locked_at' => now(),
                'locked_by' => $request->user()->id,
            ]);
            return $this->detail($session);
        }, 3);
        return response()->json($result);
    }

    public function exportData(Request $request, int $classId): JsonResponse
    {
        $data = $request->validate([
            'date' => [
                'sometimes',
                'required',
                'date_format:Y-m-d',
            ],
            'period' => [
                'sometimes',
                'required',
                'in:all,midterm,final',
            ],
        ]);

        $result = DB::transaction(function () use ($request, $classId, $data) {
            // Existing attendance writes use this same class lock.
            $class = $this->ownedClass($request, $classId, true);

            $date = $data['date'] ?? null;
            $period = $data['period'] ?? 'all';

            $sessions = DB::table('attendance_sessions')
                ->where('year_section_subject_id', $classId)
                ->when(
                    $date !== null,
                    fn($query) => $query->where('attendance_date', $date)
                )
                ->when(
                    $period !== 'all',
                    fn($query) => $query->where('period', $period)
                )
                ->orderBy('attendance_date')
                ->orderBy('session_number')
                ->get([
                    'id',
                    'attendance_date',
                    'session_number',
                    'period',
                    'status',
                    'locked_at',
                    'roster_initialized_at',
                ]);

            $profiles = DB::table('user_information')
                ->select('user_id')
                ->selectRaw('MAX(id) AS id')
                ->groupBy('user_id');

            $records = DB::table('attendance_records as r')
                ->join(
                    'student_subjects as ss',
                    'ss.id',
                    '=',
                    'r.student_subject_id'
                )
                ->leftJoin(
                    'enrolled_students as e',
                    'e.id',
                    '=',
                    'ss.enrolled_students_id'
                )
                ->leftJoin('users as u', 'u.id', '=', 'e.student_id')
                ->leftJoinSub(
                    $profiles,
                    'profile',
                    'profile.user_id',
                    '=',
                    'u.id'
                )
                ->leftJoin(
                    'user_information as ui',
                    'ui.id',
                    '=',
                    'profile.id'
                )
                ->whereIn('r.attendance_session_id', $sessions->pluck('id'))
                ->where('ss.year_section_subjects_id', $classId)
                ->orderBy('r.attendance_session_id')
                ->orderBy('ui.last_name')
                ->orderBy('ui.first_name')
                ->orderBy('r.student_subject_id')
                ->get([
                    'r.attendance_session_id',
                    'r.student_subject_id',
                    'r.status',
                    'r.remarks',
                    'e.student_id',
                    'u.user_id_no',
                    'ui.first_name',
                    'ui.last_name',
                    'ui.middle_name',
                    'ui.suffix',
                ]);

            return [
                'class_id' => $classId,
                'actor_id' => $request->user()->id,
                'class_label' => $class->class_code ?: "Class {$classId}",
                'date' => $date,
                'generated_at' => now(self::TIME_ZONE)->toIso8601String(),
                'time_zone' => self::TIME_ZONE,
                'sessions' => $sessions,
                'records' => $records,
                'period' => $period,
            ];
        }, 3);

        return response()
            ->json($result)
            ->header('Cache-Control', 'private, no-store');
    }
}
