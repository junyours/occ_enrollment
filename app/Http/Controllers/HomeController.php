<?php

namespace App\Http\Controllers;

use App\Models\SchoolYear;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index()
    {
        $ongoingEnrollment = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        $user = Auth::user();

        if(!$user){
            return redirect()->route('login');
        }

        if ($ongoingEnrollment && ($user->user_role == 'registrar' || $user->user_role == 'program_head' || $user->user_role == 'evaluator')) {
            return redirect()->intended(route('dashboard', absolute: false));
        } else if ($user->user_role == 'super_admin') {
            return redirect()->intended(route('users', absolute: false));
        } else if ($user->user_role == 'mis') {
            return redirect()->intended(route('mis-users', absolute: false));
        } else if ($user->user_role == 'president') {
            return redirect()->intended(route('ongoing-enrollment', absolute: false));
        } else if ($user->user_role == 'guidance') {
            return redirect()->intended(route('guidance.dashboard', absolute: false));
        } else if ($user->user_role == 'nstp_director') {
            return redirect()->intended(route('nstp-director.dashboard', absolute: false));
        } else {
            return redirect()->intended(route('classes', absolute: false));
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
