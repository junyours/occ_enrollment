<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use Illuminate\Support\Facades\DB;
use App\Models\Course;
use Carbon\Carbon;
use App\Models\SchoolYear;
use App\Models\User;
use App\Models\UserInformation;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = Auth::user();

        // Always share errors for ALL users (including guests)
        $baseSharedData = [
            ...parent::share($request)
        ];

        // Return only errors if there's no authenticated user
        if (!$user) {
            return $baseSharedData;
        }

        // Only returns role - information not needed
        if (in_array($user->user_role, ['super_admin', 'mis', 'president', 'announcement_admin', 'guidance'])) {
            return [
                ...$baseSharedData,
                'auth' => [
                    'user' => $user,
                    'impersonating' => Session::has('impersonator_id'),
                ],
            ];
        }

        // User data
        $user = User::with('information')->find($user->id);
        $userPayload = $this->mapUser($user);

        // Base for the rest users and if it's impersonated
        $baseData = [
            ...$baseSharedData,
            'auth' => [
                'user' => $userPayload,
                'impersonating' => Session::has('impersonator_id'),
            ],
        ];

        // Student and faculty only need basedata
        if (in_array($userPayload, ['student', 'faculty'])) {
            return $baseData;
        }

        // Important data for ongoing enrollment
        $enrollmentMeta = $this->getEnrollmentMeta();

        // Return base data if there's no enrollment
        if (!$enrollmentMeta) {
            return $baseData;
        }

        // Return necessary data during enrollment
        return [
            ...$baseSharedData,
            'auth' => [
                ...$baseData['auth'],
                ...$enrollmentMeta,
            ],
        ];
    }

    // Function for checking ongoing enrollment
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

        // Determine the status and set the school year accordingly
        if ($enrollmentOngoing) {
            return [
                'status' => 'ongoing',
                'preparation' => false,
                'school_year' => $enrollmentOngoing
            ];
        }
        // If enrollment is in preparation, set status to preparing
        if ($enrollmentPreparation) {
            return [
                'status' => 'preparing',
                'preparation' => true,
                'school_year' => $enrollmentPreparation
            ];
        }
        // No enrollment preparation or ongoing, set status to false
        return [
            'status' => false,
            'preparation' => false,
            'school_year' => null
        ];
    }

    // List of programs/courses
    private function courses()
    {
        $user = Auth::user();

        $courses = [];

        if ($user->user_role == 'program_head' || $user->user_role == 'evaluator') {
            $courses = DB::table('course')
                ->select(DB::raw("MD5(course.id) as hashed_course_id, course_name, course_name_abbreviation"))
                ->join('department', 'course.department_id', '=', 'department.id')
                ->join('faculty', 'faculty.department_id', '=', 'department.id')
                ->join('users', 'faculty.faculty_id', '=', 'users.id')
                ->where('users.id', '=', $user->id)
                ->get();
        } elseif ($user->user_role == 'registrar') {
            $courses = Course::select(DB::raw("MD5(course.id) as hashed_course_id, course_name, course_name_abbreviation"))
                ->get();
        }

        return $courses;
    }

    protected function mapUser(User $user): array
    {
        return [
            'id' => $user->id,
            'user_id_no' => $user->user_id_no,
            'user_role' => $user->user_role,
            'first_name' => $user->information?->first_name,
            'middle_name' => $user->information?->middle_name,
            'last_name' => $user->information?->last_name,
            'email_address' => $user->email,
            'password_change' => $user->password_change,
        ];
    }

    // Function to getting userinformation
    protected function getUserWithInfo(int $id): User|null
    {
        return User::leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->where('users.id', $id)
            ->select(
                'users.id',
                'password_change',
                'user_id_no',
                'user_role',
                'first_name',
                'middle_name',
                'last_name',
                'email_address'
            )
            ->first();
    }

    // Necessary data for ongoing enrollment
    protected function getEnrollmentMeta()
    {
        $schoolYearStatus = $this->getPreparingOrOngoingSchoolYear();

        if (!$schoolYearStatus['status'] || !$schoolYearStatus['school_year']) {
            return null;
        }

        $schoolYear = SchoolYear::with('Semester')->find($schoolYearStatus['school_year']->id);

        return [
            'enrollment_status' => $schoolYearStatus['status'],
            'courses' => $this->courses(),
            'schoolYear' => $schoolYear,
        ];
    }
}
