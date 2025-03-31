<?php

namespace App\Http\Controllers\Enrollment;

use App\Http\Controllers\Controller;
use App\Models\Faculty;
use App\Models\Course;
use App\Models\SchoolYear;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class EnrollmentDashboardController extends Controller
{
    public function view()
    {
        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        return Inertia::render('Enrollment/Dashboard', [
            'schoolYear' => $schoolYear
        ]);
    }

    public function getEnrollmentDashboardData(Request $request)
    {
        $user = Auth::user();

        $department = Faculty::select('department_id', 'faculty_id', 'department_name')
            ->where('faculty_id', '=', $user->id)
            ->join('department', 'department.id', '=', 'faculty.department_id')
            ->first();

        $schoolYearId = $request->schoolYearId;
        $schoolYearDetails = SchoolYear::findOrFail($schoolYearId)->with('Semester')->first();

        $coursesReports =  [];

        if ($user->user_role == "program_head" || $user->user_role == "evaluator") {
            $coursesReports =
                Faculty::where('faculty_id', $user->id)
                ->with([
                    'Department.Course' => function ($query) use ($schoolYearId) {
                        $query->withCount([
                            // Total Male Students in All First-Year
                            'YearSection as first_year_male_count' => function ($sectionQuery) use ($schoolYearId) {
                                $sectionQuery->where('school_year_id', $schoolYearId)
                                    ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                                    ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                                    ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                                    ->where('year_level_id', '=', 1)
                                    ->where('gender', 'Male');
                            },
                            // Total Female Students in All First-Year
                            'YearSection as first_year_female_count' => function ($sectionQuery) use ($schoolYearId) {
                                $sectionQuery->where('school_year_id', $schoolYearId)
                                    ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                                    ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                                    ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                                    ->where('year_level_id', '=', 1)
                                    ->where('gender', 'Female');
                            },
                            // Total Male Students in All Second-Year
                            'YearSection as second_year_male_count' => function ($sectionQuery) use ($schoolYearId) {
                                $sectionQuery->where('school_year_id', $schoolYearId)
                                    ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                                    ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                                    ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                                    ->where('year_level_id', '=', 2)
                                    ->where('gender', 'Male');
                            },
                            // Total Female Students in All Second-Year
                            'YearSection as second_year_female_count' => function ($sectionQuery) use ($schoolYearId) {
                                $sectionQuery->where('school_year_id', $schoolYearId)
                                    ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                                    ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                                    ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                                    ->where('year_level_id', '=', 2)
                                    ->where('gender', 'Female');
                            },
                            // Total Male Students in All Second-Year
                            'YearSection as third_year_male_count' => function ($sectionQuery) use ($schoolYearId) {
                                $sectionQuery->where('school_year_id', $schoolYearId)
                                    ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                                    ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                                    ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                                    ->where('year_level_id', '=', 3)
                                    ->where('gender', 'Male');
                            },
                            // Total Female Students in All Second-Year
                            'YearSection as third_year_female_count' => function ($sectionQuery) use ($schoolYearId) {
                                $sectionQuery->where('school_year_id', $schoolYearId)
                                    ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                                    ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                                    ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                                    ->where('year_level_id', '=', 3)
                                    ->where('gender', 'Female');
                            },
                            // Total Male Students in All Second-Year
                            'YearSection as fourth_year_male_count' => function ($sectionQuery) use ($schoolYearId) {
                                $sectionQuery->where('school_year_id', $schoolYearId)
                                    ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                                    ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                                    ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                                    ->where('year_level_id', '=', 4)
                                    ->where('gender', 'Male');
                            },
                            // Total Female Students in All Second-Year
                            'YearSection as fourth_year_female_count' => function ($sectionQuery) use ($schoolYearId) {
                                $sectionQuery->where('school_year_id', $schoolYearId)
                                    ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                                    ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                                    ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                                    ->where('year_level_id', '=', 4)
                                    ->where('gender', 'Female');
                            },
                            // Total Freshman
                            'YearSection as freshman_count' => function ($sectionQuery) use ($schoolYearId) {
                                $sectionQuery->where('school_year_id', $schoolYearId)
                                    ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                                    ->where('student_type_id', '=', 1);
                            },
                            // Total Transferee
                            'YearSection as transferee_count' => function ($sectionQuery) use ($schoolYearId) {
                                $sectionQuery->where('school_year_id', $schoolYearId)
                                    ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                                    ->where('student_type_id', '=', 2);
                            },
                            // Total Old
                            'YearSection as old_count' => function ($sectionQuery) use ($schoolYearId) {
                                $sectionQuery->where('school_year_id', $schoolYearId)
                                    ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                                    ->where('student_type_id', '=', 3);
                            },
                            // Total Returnee
                            'YearSection as returnee_count' => function ($sectionQuery) use ($schoolYearId) {
                                $sectionQuery->where('school_year_id', $schoolYearId)
                                    ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                                    ->where('student_type_id', '=', 4);
                            },
                            // Total students enrolled
                            'YearSection as enrolled_student_count' => function ($sectionQuery) use ($schoolYearId) {
                                $sectionQuery->where('school_year_id', $schoolYearId)
                                    ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id');
                            },
                        ])->with(['YearSection' => function ($query) use ($schoolYearId) {
                            $query->join('enrolled_students', 'year_section.id', '=', 'enrolled_students.year_section_id')
                                ->join('course', 'course.id', '=', 'year_section.course_id')
                                ->select(
                                    'enrolled_students.date_enrolled',  // Only select the enrollment date
                                    'course_id',
                                    'course_name_abbreviation',
                                    DB::raw('COUNT(enrolled_students.id) as total_students')
                                )
                                ->where('school_year_id', '=', $schoolYearId)
                                ->groupBy('enrolled_students.date_enrolled', 'course_id', 'course_name_abbreviation'); // Group by date and course
                        }]);
                    },
                ])
                ->first();
        } else if ($user->user_role == "registrar") {
            $coursesReports =
                Course::withCount([
                    // Total Male Students in All First-Year
                    'YearSection as first_year_male_count' => function ($sectionQuery) use ($schoolYearId) {
                        $sectionQuery->where('school_year_id', $schoolYearId)
                            ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                            ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                            ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                            ->where('year_level_id', '=', 1)
                            ->where('gender', 'Male');
                    },
                    // Total Female Students in All First-Year
                    'YearSection as first_year_female_count' => function ($sectionQuery) use ($schoolYearId) {
                        $sectionQuery->where('school_year_id', $schoolYearId)
                            ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                            ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                            ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                            ->where('year_level_id', '=', 1)
                            ->where('gender', 'Female');
                    },
                    // Total Male Students in All Second-Year
                    'YearSection as second_year_male_count' => function ($sectionQuery) use ($schoolYearId) {
                        $sectionQuery->where('school_year_id', $schoolYearId)
                            ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                            ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                            ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                            ->where('year_level_id', '=', 2)
                            ->where('gender', 'Male');
                    },
                    // Total Female Students in All Second-Year
                    'YearSection as second_year_female_count' => function ($sectionQuery) use ($schoolYearId) {
                        $sectionQuery->where('school_year_id', $schoolYearId)
                            ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                            ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                            ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                            ->where('year_level_id', '=', 2)
                            ->where('gender', 'Female');
                    },
                    // Total Male Students in All Second-Year
                    'YearSection as third_year_male_count' => function ($sectionQuery) use ($schoolYearId) {
                        $sectionQuery->where('school_year_id', $schoolYearId)
                            ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                            ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                            ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                            ->where('year_level_id', '=', 3)
                            ->where('gender', 'Male');
                    },
                    // Total Female Students in All Second-Year
                    'YearSection as third_year_female_count' => function ($sectionQuery) use ($schoolYearId) {
                        $sectionQuery->where('school_year_id', $schoolYearId)
                            ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                            ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                            ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                            ->where('year_level_id', '=', 3)
                            ->where('gender', 'Female');
                    },
                    // Total Male Students in All Second-Year
                    'YearSection as fourth_year_male_count' => function ($sectionQuery) use ($schoolYearId) {
                        $sectionQuery->where('school_year_id', $schoolYearId)
                            ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                            ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                            ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                            ->where('year_level_id', '=', 4)
                            ->where('gender', 'Male');
                    },
                    // Total Female Students in All Second-Year
                    'YearSection as fourth_year_female_count' => function ($sectionQuery) use ($schoolYearId) {
                        $sectionQuery->where('school_year_id', $schoolYearId)
                            ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                            ->join('users', 'users.id',  '=',  'enrolled_students.student_id')
                            ->join('user_information', 'users.id',  '=',  'user_information.user_id')
                            ->where('year_level_id', '=', 4)
                            ->where('gender', 'Female');
                    },
                    // Total Freshman
                    'YearSection as freshman_count' => function ($sectionQuery) use ($schoolYearId) {
                        $sectionQuery->where('school_year_id', $schoolYearId)
                            ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                            ->where('student_type_id', '=', 1);
                    },
                    // Total Transferee
                    'YearSection as transferee_count' => function ($sectionQuery) use ($schoolYearId) {
                        $sectionQuery->where('school_year_id', $schoolYearId)
                            ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                            ->where('student_type_id', '=', 2);
                    },
                    // Total Old
                    'YearSection as old_count' => function ($sectionQuery) use ($schoolYearId) {
                        $sectionQuery->where('school_year_id', $schoolYearId)
                            ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                            ->where('student_type_id', '=', 3);
                    },
                    // Total Returnee
                    'YearSection as returnee_count' => function ($sectionQuery) use ($schoolYearId) {
                        $sectionQuery->where('school_year_id', $schoolYearId)
                            ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id')
                            ->where('student_type_id', '=', 4);
                    },
                    // Total students enrolled
                    'YearSection as enrolled_student_count' => function ($sectionQuery) use ($schoolYearId) {
                        $sectionQuery->where('school_year_id', $schoolYearId)
                            ->join('enrolled_students', 'year_section.id',  '=',  'enrolled_students.year_section_id');
                    },
                ])
                ->with(['YearSection' => function ($query) {
                    $query->join('enrolled_students', 'year_section.id', '=', 'enrolled_students.year_section_id')
                        ->join('course', 'course.id', '=', 'year_section.course_id')
                        ->select(
                            'enrolled_students.date_enrolled',  // Only select the enrollment date
                            'course_id',
                            'course_name_abbreviation',
                            DB::raw('COUNT(enrolled_students.id) as total_students')
                        )
                        ->groupBy('enrolled_students.date_enrolled', 'course_id', 'course_name_abbreviation'); // Group by date and course
                }])
                ->get();
        }

        return response([
            "message" => "success",
            "coursesReports" => $coursesReports,
            'department' => $department,
            'schoolYearDetails' => $schoolYearDetails,
        ]);
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
