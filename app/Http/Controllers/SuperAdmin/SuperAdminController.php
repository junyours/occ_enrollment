<?php

namespace App\Http\Controllers\SuperAdmin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Auth;
use App\Models\SchoolYear;
use Carbon\Carbon;

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


        $user = Auth::user();
        $ongoingEnrollment = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        if ($ongoingEnrollment && ($user->user_role == 'registrar' || $user->user_role == 'program_head' || $user->user_role == 'evaluator')) {
            return redirect()->intended(route('dashboard', absolute: false));
        } else if ($user->user_role == 'super_admin' || $user->user_role == 'mis') {
            return redirect()->intended(route('users', absolute: false));
        } else if ($user->user_role == 'president') {
            return redirect()->intended(route('ongoing-enrollment', absolute: false));
        } else {
            return redirect()->intended(route('classes', absolute: false));
        }
    }

    public function stopImpersonate()
    {
        if (Session::has('impersonator_id')) {
            $originalId = Session::pull('impersonator_id');
            Auth::loginUsingId($originalId);
        }
    }

    private function getPreparingOrOngoingSchoolYear()
    {
        $today = Carbon::now(); // Get today's date
        $twoWeeksBeforeToday = $today->copy()->subWeeks(2); // 2 weeks before today, stored separately
        $twoWeeksAfterToday = $today->copy()->addWeeks(2); // 2 weeks after today, stored separately

        // Check if enrollment preparation is within 2 weeks before today and today
        $enrollmentPreparation = SchoolYear::whereDate('start_date', '>=', $today->toDateString())
            ->whereDate('start_date', '<=', $twoWeeksAfterToday->toDateString())
            ->first();

        // Check if enrollment is ongoing (start_date <= today <= end_date)
        $enrollmentOngoing = SchoolYear::whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->first();

        $schoolYear = null;
        $status = null;
        $preparation = false;

        // Determine the status and set the school year accordingly
        if ($enrollmentOngoing) {
            // If enrollment is ongoing, set preparation to false
            $status = 'ongoing';
            $schoolYear = $enrollmentOngoing;
            $preparation = false;
        } elseif ($enrollmentPreparation) {
            // If enrollment is in preparation, set status to preparing
            $status = 'preparing';
            $schoolYear = $enrollmentPreparation;
            $preparation = true;
        } else {
            // No enrollment preparation or ongoing, set status to false
            $status = false;
        }

        // Return status, preparation, and school year
        return [
            'status' => $status,
            'preparation' => $preparation,
            'school_year' => $schoolYear
        ];
    }
}
