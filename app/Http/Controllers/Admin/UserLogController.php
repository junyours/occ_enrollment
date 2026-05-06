<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\UserLog;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class UserLogController extends Controller
{
    /**
     * Display a listing of the user activity logs.
     */
    public function index(Request $request): Response
    {
        $logs = UserLog::select('user_logs.*', 'users.user_id_no', 'users.email', 'users.user_role', 'user_information.first_name', 'user_information.last_name')
            ->leftJoin('users', 'user_logs.user_id', '=', 'users.id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->when($request->role && $request->role !== 'all', function ($query, $role) use ($request) {
                $query->where('users.user_role', $request->role);
            })
            ->when($request->search, function ($query, $search) use ($request) {
                $searchField = $request->searchField ?? 'all';

                if ($searchField === 'all') {
                    $query->where(function ($q) use ($search) {
                        $q->where('users.user_id_no', 'like', '%' . $search . '%')
                            ->orWhere('user_logs.created_at', 'like', '%' . $search . '%')
                            ->orWhere('user_information.first_name', 'like', '%' . $search . '%')
                            ->orWhere('user_information.last_name', 'like', '%' . $search . '%')
                            ->orWhere('user_information.middle_name', 'like', '%' . $search . '%')
                            ->orWhere('user_information.email_address', 'like', '%' . $search . '%')
                            ->orWhere('users.user_role', 'like', '%' . $search . '%')
                            ->orWhere('endpoint', 'like', '%' . $search . '%')
                            ->orWhere('ip_address', 'like', '%' . $search . '%')
                            ->orWhere('payload', 'like', '%' . $search . '%')
                            ->orWhereRaw("CONCAT(user_information.first_name, ' ', user_information.last_name) LIKE ?", ["%{$search}%"])
                            ->orWhereRaw("CONCAT(user_information.first_name, ' ', SUBSTRING(user_information.middle_name, 1, 1), '. ', user_information.last_name) LIKE ?", ["%{$search}%"]);;
                    });
                } else {
                    // Map field names to their table columns
                    $fieldMap = [
                        'created_at' => 'user_logs.created_at',
                        'user_id_no' => 'users.user_id_no',
                        'first_name' => 'user_information.first_name',
                        'last_name' => 'user_information.last_name',
                        'user_role' => 'users.user_role',
                        'endpoint' => 'user_logs.endpoint',
                        'ip_address' => 'user_logs.ip_address',
                        'payload' => 'user_logs.payload',
                    ];

                    if (isset($fieldMap[$searchField])) {
                        $query->where($fieldMap[$searchField], 'like', '%' . $search . '%');
                    }
                }
            })
            ->latest()
            ->paginate(10);

        return Inertia::render('SuperAdmin/Logs/Index', [
            'logs' => $logs,
            'filters' => $request->only(['search', 'searchField', 'role'])
        ]);
    }
}
