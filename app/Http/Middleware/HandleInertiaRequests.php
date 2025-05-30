<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;
use Illuminate\Support\Facades\DB;
use App\Models\Course;
use Carbon\Carbon;
use App\Models\SchoolYear;

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
        $user = $request->user();

        // Perform a JOIN to get first_name and last_name
        $userData = $user ? DB::table('users')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->where('users.id', $user->id)
            ->select('users.id', 'password_change', 'user_id_no', 'user_role', 'first_name', 'middle_name', 'last_name', 'email_address')
            ->first() : null;

        if (!$userData || $userData->user_role == 'student' || $userData->user_role == 'faculty') {
            return [
                ...parent::share($request),
                'auth' => [
                    'user' => $userData,
                ],
            ];
        }

        // Get preparing or ongoing school year status and school year
        $schoolYearStatus = $this->getPreparingOrOngoingSchoolYear();

        $schoolYear = [];
        $enrollmentPreparation = false;
        $enrollmentOngoing = false;

        if ($schoolYearStatus['status'] && $schoolYearStatus['school_year']) {
            // If the status is true (either preparing or ongoing), assign the school year
            $schoolYear = $schoolYearStatus['school_year'];

            // Set flags for enrollment preparation and ongoing based on the status
            if ($schoolYearStatus['status'] == 'preparing') {
                $enrollmentPreparation = true;
            } elseif ($schoolYearStatus['status'] == 'ongoing') {
                $enrollmentOngoing = true;
            }
        }

        $courses = [];

        if (($user->user_role == 'program_head' || $user->user_role == 'evaluator') && ($enrollmentOngoing || $enrollmentPreparation)) {
            // Fetch courses for program_head or evaluator role when enrollment is preparing or ongoing
            $courses = DB::table('course')
                ->select(DB::raw("MD5(course.id) as hashed_course_id, course_name, course_name_abbreviation"))
                ->join('department', 'course.department_id', '=', 'department.id')
                ->join('faculty', 'faculty.department_id', '=', 'department.id')
                ->join('users', 'faculty.faculty_id', '=', 'users.id')
                ->where('users.id', '=', $user->id)
                ->get();
        } elseif ($user->user_role == 'registrar' && ($enrollmentPreparation || $enrollmentOngoing)) {
            // Fetch all courses for registrar when enrollment is preparing or ongoing
            $courses = Course::select(DB::raw("MD5(course.id) as hashed_course_id, course_name, course_name_abbreviation"))
                ->get();
        }

        $schoolYear = SchoolYear::where('id', '=', $schoolYear->id)
            ->with('Semester')
            ->first();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $userData,
                'enrollment_status' => $schoolYearStatus['status'],
                'courses' => $courses,
                'schoolYear' => $schoolYear,
            ],
        ];
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
