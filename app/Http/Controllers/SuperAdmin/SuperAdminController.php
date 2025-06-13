<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Auth;

class SuperAdminController extends Controller
{
    public function view(Request $request)
    {
        $users = User::query()
            ->select('users.id', 'first_name', 'middle_name', 'last_name', 'email', 'user_role')
            ->when($request->search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', '%' . $search . '%')
                        ->orWhere('last_name', 'like', '%' . $search . '%')
                        ->orWhere('email', 'like', '%' . $search . '%');
                });
            })
            ->when($request->role, function ($query, $role) {
                $query->where('user_role', $role);
            })
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->orderByRaw("CASE
            WHEN user_role = 'program_head' THEN 1
            WHEN user_role = 'registrar' THEN 2
            WHEN user_role = 'evaluator' THEN 3
            WHEN user_role = 'faculty' THEN 4
            WHEN user_role = 'student' THEN 5
            ELSE 6
            END")
            ->paginate(10);

        $users->appends($request->query());

        return Inertia::render('SuperAdmin/Users', [
            'users' => $users,
            'filters' => $request->only(['search', 'role'])
        ]);
    }

    public function impersonate($id)
    {
        // Ensure you're getting a single user, not a collection
        $userToImpersonate = User::findOrFail($id); // ✅ returns a single model

        if (Auth::id() === $userToImpersonate->id) {
            return back()->with('error', 'You cannot impersonate yourself.');
        }

        Session::put('impersonator_id', Auth::id());

        Auth::login($userToImpersonate); // ✅ This expects a single Authenticatable model

        return redirect('/'); // or wherever the impersonated user should land
    }

    public function stopImpersonate()
    {
        if (Session::has('impersonator_id')) {
            $originalId = Session::pull('impersonator_id');
            Auth::loginUsingId($originalId);
        }
    }
}
