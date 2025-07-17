<?php

namespace App\Http\Controllers\President;

use App\Http\Controllers\Controller;
use App\Models\Department;
use App\Models\EnrolledStudent;
use App\Models\SchoolYear;
use App\Models\StudentType;
use App\Models\YearLevel;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PresidentController extends Controller
{
    public function OngoingEnrollment()
    {
        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        $schoolYear = SchoolYear::with('Semester')->find($schoolYear->id);

        return Inertia::render('President/OngoingEnrollment', [
            'schoolYear' => $schoolYear
        ]);
    }

    public function enrollmentData(Request $request)
    {
        $schoolYearId = $request->schoolYearId;

        $departmentCounts = Department::select('department.*')
            ->selectSub(function ($query) use ($schoolYearId) {
                $query->from('enrolled_students')
                    ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
                    ->join('course', 'course.id', '=', 'year_section.course_id')
                    ->whereColumn('course.department_id', 'department.id')
                    ->where('year_section.school_year_id', $schoolYearId)
                    ->selectRaw('COUNT(*)');
            }, 'totalEnrolled')
            ->get();

        $totalAllDepartments = EnrolledStudent::join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->where('year_section.school_year_id', $schoolYearId)
            ->count();

        $yearLevelCounts = YearLevel::leftJoin('year_section', function ($join) use ($schoolYearId) {
            $join->on('year_section.year_level_id', '=', 'year_level.id')
                ->where('year_section.school_year_id', $schoolYearId);
        })
            ->leftJoin('enrolled_students', 'enrolled_students.year_section_id', '=', 'year_section.id')
            ->select(
                'year_level.id',
                'year_level.year_level_name',
                DB::raw('COUNT(enrolled_students.id) as total')
            )
            ->groupBy('year_level.id', 'year_level.year_level_name')
            ->orderBy('year_level.id')
            ->get();

        $genderCounts = EnrolledStudent::join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->join('user_information', 'user_information.user_id', '=', 'users.id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->where('year_section.school_year_id', $schoolYearId)
            ->select('user_information.gender', DB::raw('count(*) as total'))
            ->groupBy('user_information.gender')
            ->get();

        $studentTypeCounts = StudentType::select(
            'student_type.id',
            'student_type.student_type_name',
            DB::raw("
            COUNT(
                CASE
                    WHEN year_section.school_year_id = $schoolYearId THEN 1
                    ELSE NULL
                END
            ) as total
        ")
        )
            ->leftJoin('enrolled_students', 'enrolled_students.student_type_id', '=', 'student_type.id')
            ->leftJoin('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->groupBy('student_type.id', 'student_type.student_type_name')
            ->get();

        $enrollmentsPerDate = EnrolledStudent::select('enrolled_students.date_enrolled', DB::raw('COUNT(*) as total'))
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->where('year_section.school_year_id', $schoolYearId)
            ->groupBy('enrolled_students.date_enrolled')
            ->orderBy('enrolled_students.date_enrolled', 'asc')
            ->get();

        $peakDays = DB::table('enrolled_students')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->selectRaw('
            WEEKDAY(date_enrolled) as weekday,
            COUNT(*) as total,
            COUNT(DISTINCT DATE(date_enrolled)) as day_count,
            ROUND(COUNT(*) / COUNT(DISTINCT DATE(date_enrolled)), 2) as avg_per_day
        ')
            ->where('year_section.school_year_id', $schoolYearId)
            ->groupBy(DB::raw('WEEKDAY(date_enrolled)'))
            ->orderBy(DB::raw('WEEKDAY(date_enrolled)'))
            ->get()
            ->map(function ($item) {
                $dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                $item->day = $dayNames[$item->weekday];
                return $item;
            });

        return response()->json([
            'departmenCounts' => $departmentCounts,
            'totalEnrolled' => $totalAllDepartments,
            'yearLevelCounts' => $yearLevelCounts,
            'genderCounts' => $genderCounts,
            'studentTypeCounts' => $studentTypeCounts,
            'enrollmentsPerDate' => $enrollmentsPerDate,
            'peakDays' => $peakDays,
        ], 200);
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
}
