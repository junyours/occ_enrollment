<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ActivityLogController extends Controller
{
    private const ROLE_PRIORITY = [
        'super_admin', 'president', 'vpaa', 'academic_dean', 'program_head', 'registrar',
        'nstp_director', 'mis', 'gened_coordinator', 'research_coordinator', 'ojt_coordinator',
        'guidance', 'librarian', 'billing', 'cashier', 'announcement_admin', 'evaluator',
        'cwts_evaluator', 'rotc_evaluator', 'lts_evaluator', 'faculty', 'nstp_faculty', 'student',
    ];

    public function index(Request $request): Response
    {
        $inspector = $request->user()->activityLogIdentity();
        log_activity(
            'activity_logs.viewed',
            $request->user(),
            $this->identityLabel($inspector).' opened the activity log inspector.',
            ['inspector' => $inspector],
        );

        return Inertia::render('SuperAdmin/ActivityLogs/Index');
    }

    public function recent(Request $request): JsonResponse
    {
        $filters = $this->filters($request);

        return response()->json($this->logsQuery($filters['search'])
            ->orderByDesc('activity_logs.created_at')->orderByDesc('activity_logs.id')
            ->paginate($filters['per_page'])->withQueryString());
    }

    public function users(Request $request): JsonResponse
    {
        $filters = $this->filters($request);
        $activity = DB::table('activity_logs')
            ->select('user_id')->selectRaw('COUNT(*) as activity_count, MAX(created_at) as last_activity_at')
            ->groupBy('user_id');

        $query = User::query()
            ->select('users.id', 'users.user_id_no', 'users.user_role', 'info.first_name', 'info.middle_name', 'info.last_name')
            ->leftJoin('user_information as info', 'info.user_id', '=', 'users.id')
            ->leftJoinSub($activity, 'activity', 'activity.user_id', '=', 'users.id')
            ->selectRaw('COALESCE(activity.activity_count, 0) as activity_count, activity.last_activity_at');

        $this->applySearch($query, $filters['search'], [
            'users.user_id_no', 'users.user_role', 'info.first_name', 'info.middle_name', 'info.last_name',
        ]);

        $priority = 'CASE users.user_role';
        foreach (self::ROLE_PRIORITY as $rank => $role) {
            $priority .= ' WHEN ? THEN '.$rank;
        }

        $users = $query->orderByRaw($priority.' ELSE 1000 END', self::ROLE_PRIORITY)
            ->orderByRaw("LOWER(COALESCE(NULLIF(info.last_name, ''), users.user_id_no))")
            ->orderByRaw("LOWER(COALESCE(info.first_name, ''))")
            ->orderBy('users.id')
            ->paginate($filters['per_page'])->withQueryString();

        $users->through(function (User $user) {
            $row = $user->toArray();
            $row['activity_count'] = (int) $row['activity_count'];
            $row['last_activity_at'] = $user->last_activity_at
                ? Carbon::parse($user->last_activity_at, config('app.timezone'))->toISOString()
                : null;

            return $row;
        });

        return response()->json($users);
    }

    public function userLogs(Request $request, User $user): JsonResponse
    {
        $filters = $this->filters($request);
        $logs = $this->logsQuery($filters['search'])
            ->where('activity_logs.user_id', $user->id)
            ->orderByDesc('activity_logs.created_at')->orderByDesc('activity_logs.id')
            ->paginate($filters['per_page'])->withQueryString();

        $inspector = $request->user()->activityLogIdentity();
        $inspectedUser = $user->activityLogIdentity();
        log_activity(
            'activity_logs.user_inspected',
            $user,
            $this->identityLabel($inspector).' inspected '.$this->identityLabel($inspectedUser)
                .'\'s activity history, showing '.$logs->total().' matching activities.',
            [
                'inspected_user_id' => $user->id,
                'inspected_user' => $inspectedUser,
                'inspector' => $inspector,
                'search' => $filters['search'],
                'page' => $logs->currentPage(),
                'per_page' => $logs->perPage(),
                'result_count' => $logs->total(),
            ],
        );

        return response()->json($logs);
    }

    public function show(Request $request, ActivityLog $activityLog): JsonResponse
    {
        $log = $this->logsQuery('')
            ->addSelect('activity_logs.properties', 'activity_logs.user_agent')
            ->findOrFail($activityLog->id);
        $log->setAttribute('subject_user', $this->subjectUserIdentity($log));

        $inspector = $request->user()->activityLogIdentity();
        log_activity(
            'activity_logs.inspected',
            $activityLog,
            $this->identityLabel($inspector).' inspected activity #'.$activityLog->id.' ('.$log->action.').',
            ['inspected_log_id' => $activityLog->id, 'inspector' => $inspector],
        );

        return response()->json($log);
    }

    private function identityLabel(array $identity): string
    {
        return $identity['name'].($identity['user_id_no'] && $identity['name'] !== $identity['user_id_no']
            ? ' ('.$identity['user_id_no'].')' : '');
    }

    private function subjectUserIdentity(ActivityLog $log): ?array
    {
        // Resolve only the known User type; log metadata must never instantiate arbitrary morph classes.
        if ($log->subject_type !== User::class || $log->subject_id === null) {
            return null;
        }

        foreach (['teacher', 'inspected_user'] as $key) {
            $snapshot = $log->properties[$key] ?? null;
            if (! is_array($snapshot) || ! is_scalar($snapshot['id'] ?? null)
                || (string) $snapshot['id'] !== (string) $log->subject_id) {
                continue;
            }
            $name = is_string($snapshot['name'] ?? null) ? trim($snapshot['name']) : '';
            $number = is_string($snapshot['user_id_no'] ?? null) ? $snapshot['user_id_no'] : null;
            if ($name === '' && ! $number) {
                continue;
            }

            return [
                'id' => $log->subject_id,
                'name' => $name ?: $number,
                'user_id_no' => $number,
                'user_role' => is_string($snapshot['user_role'] ?? null) ? $snapshot['user_role'] : null,
            ];
        }

        return User::select('id', 'user_id_no', 'user_role')->find($log->subject_id)?->activityLogIdentity();
    }

    private function filters(Request $request): array
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:200'],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
        ]);

        return [
            'search' => trim($validated['search'] ?? ''),
            'per_page' => (int) ($validated['per_page'] ?? 10),
        ];
    }

    private function logsQuery(string $search): Builder
    {
        $query = ActivityLog::query()
            ->select(
                'activity_logs.id', 'activity_logs.user_id', 'activity_logs.action',
                'activity_logs.description', 'activity_logs.subject_type', 'activity_logs.subject_id',
                'activity_logs.target_type', 'activity_logs.target_id', 'activity_logs.ip_address',
                'activity_logs.created_at', 'users.user_id_no', 'users.user_role',
                'info.first_name', 'info.middle_name', 'info.last_name',
            )
            ->leftJoin('users', 'users.id', '=', 'activity_logs.user_id')
            ->leftJoin('user_information as info', 'info.user_id', '=', 'users.id');

        $this->applySearch($query, $search, [
            'activity_logs.action', 'activity_logs.description', 'activity_logs.ip_address',
            'activity_logs.subject_type', 'activity_logs.target_type',
            'users.user_id_no', 'users.user_role', 'info.first_name', 'info.middle_name', 'info.last_name',
        ]);

        return $query;
    }

    private function applySearch(Builder $query, string $search, array $columns): void
    {
        foreach (preg_split('/\s+/', mb_strtolower($search), -1, PREG_SPLIT_NO_EMPTY) as $term) {
            $query->where(function (Builder $query) use ($term, $columns) {
                foreach ($columns as $column) {
                    $query->orWhereRaw('LOWER('.$column.') LIKE ?', ['%'.$term.'%']);
                }
            });
        }
    }
}
