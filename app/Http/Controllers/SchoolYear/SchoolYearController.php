<?php

namespace App\Http\Controllers\SchoolYear;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Department;
use App\Models\EnrolledStudent;
use App\Models\Faculty;
use App\Models\SchoolYear;
use App\Models\Semester;
use App\Models\StudentType;
use App\Models\YearLevel;
use App\Models\YearSection;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SchoolYearController extends Controller
{
    public function view()
    {
        return Inertia::render('SchoolYear/SchoolYear');
    }

    public function schoolYears()
    {
        $today = Carbon::now();

        $today = Carbon::now()->toDateString();
        $twoWeeksAfterToday = Carbon::now()->addWeeks(2)->toDateString();

        $schoolYear = SchoolYear::select(
            'school_years.id',
            'semester_id',
            'start_year',
            'end_year',
            'start_date',
            'end_date',
            'is_current',
            'semester_name',
            DB::raw("CASE
            WHEN '$today' BETWEEN start_date AND end_date
            THEN true
            ELSE false
         END as enrollment_ongoing"),
            DB::raw("CASE
            WHEN '$today' >= start_date AND '$today' <= '$twoWeeksAfterToday'
            THEN true
            ELSE false
         END as preparation")
        )
            ->join('semesters', 'school_years.semester_id', '=', 'semesters.id')
            ->orderBy('school_years.created_at', 'desc')
            ->get();

        return response()->json($schoolYear, 200);
    }

    public function addSchoolYear(Request $request)
    {
        $schoolYear = SchoolYear::create([
            'semester_id' => $request->semester_id,
            'start_year' => $request->start_year,
            'end_year' => $request->end_year,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'is_current' => $request->is_current,
        ]);

        if ($schoolYear->is_current) {
            SchoolYear::whereNot('id', '=', $schoolYear->id)
                ->update(['is_current' => 0]);
        }

        return response()->json(['message' => 'success'], 200);
    }

    public function editSchoolYear(Request $request, $id)
    {
        if ($request->is_current) {
            SchoolYear::whereNot('id', '=', $id)
                ->update(['is_current' => 0]);
        }

        SchoolYear::where('id', $id)->update([
            'semester_id' => $request->semester_id,
            'start_year' => $request->start_year,
            'end_year' => $request->end_year,
            'start_date' => $request->start_date,
            'end_date' => $request->end_date,
            'is_current' => $request->is_current,
        ]);

        return response()->json(['message' => 'success'], 200);
    }

    public function viewSchoolYear($schoolyear, $semester)
    {
        $schoolYear = $this->schoolYear($schoolyear, $semester);

        return Inertia::render(
            'SchoolYear/SchoolYearLayout',
            [
                'courses' => $this->courses(),
                'schoolYear' => $schoolYear,
                'semester' => $semester
            ]
        );
    }

    public function viewCourse($schoolyear, $semester)
    {
        $schoolYear = $this->schoolYear($schoolyear, $semester);

        return Inertia::render(
            'SchoolYear/SchoolYearLayout',
            [
                'courses' => $this->courses(),
                'schoolYear' => $schoolYear,
                'semester' => $semester,
            ]
        );
    }

    public function viewClass($schoolyear, $semester, $hashedCourseId, $yearlevel, Request $request)
    {
        $schoolYear = $this->schoolYear($schoolyear, $semester);

        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseId)
            ->first();

        $section = $request->query('section');

        $yearLevels = [
            'First-Year' => '1',
            'Second-Year' => '2',
            'Third-Year' => '3',
            'Fourth-Year' => '4'
        ];

        $yearLevelNumber = $yearLevels[$yearlevel] ?? '';

        $yearSection = YearSection::where('school_year_id', '=', $schoolYear->id)
            ->where('course_id', '=', $course->id)
            ->where('year_level_id', '=', $yearLevelNumber)
            ->where('section', '=', $section)
            ->first();

        return Inertia::render(
            'SchoolYear/SchoolYearLayout',
            [
                'schoolYear' => $schoolYear,
                'semester' => $semester,
                'courses' => $this->courses(),
                'courseId' => $course->id,
                'yearlevel' => $yearLevelNumber,
                'section' => $section,
                'yearSectionId' => $yearSection->id,
                'courseName' => $course->course_name_abbreviation,
            ]
        );
    }

    public function viewStudents($schoolyear, $semester, $hashedCourseId, $yearlevel, Request $request)
    {
        $schoolYear = $this->schoolYear($schoolyear, $semester);

        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseId)
            ->first();

        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseId)
            ->first();

        $section = $request->query('section');

        $yearLevels = [
            'First-Year' => '1',
            'Second-Year' => '2',
            'Third-Year' => '3',
            'Fourth-Year' => '4'
        ];

        $yearLevelNumber = $yearLevels[$yearlevel] ?? '';

        $yearSection = YearSection::where('school_year_id', '=', $schoolYear->id)
            ->where('course_id', '=', $course->id)
            ->where('year_level_id', '=', $yearLevelNumber)
            ->where('section', '=', $section)
            ->first();

        return Inertia::render('SchoolYear/SchoolYearLayout', [
            'schoolYear' => $schoolYear,
            'semester' => $semester,
            'courses' => $this->courses(),
            'courseId' => $course->id,
            'yearlevel' => $yearLevelNumber,
            'section' => $section,
            'yearSectionId' => $yearSection->id,
            'courseName' => $course->course_name_abbreviation,
            'hashedCourseId' => $hashedCourseId,
        ]);
    }

    public function viewStudentSubjects()
    {
        return Inertia::render('SchoolYear/SchoolYearLayout');
    }

    public function viewStudentCor($schoolyear, $semester, $hashedCourseId, $yearlevel, Request $request)
    {
        $schoolYear = $this->schoolYear($schoolyear, $semester);

        $section = $request->query('section');
        $studentIdNo = $request->query('id-no');

        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseId)
            ->first();

        return Inertia::render('SchoolYear/SchoolYearLayout', [
            'schoolYear' => $schoolYear,
            'semester' => $semester,
            'courses' => $this->courses(),
            'courseId' => $course->id,
            'section' => $section,
            'yearlevel' => $yearlevel,
            'studentIdNo' => $studentIdNo,
        ]);
    }

    public function roomsSchedules($schoolyear, $semester)
    {
        $user = Auth::user();

        $departmentId = Faculty::where('faculty_id', '=', $user->id)->first()->department_id;

        $schoolYear = $this->schoolYear($schoolyear, $semester);

        return Inertia::render('SchoolYear/SchoolYearLayout', [
            'schoolYear' => $schoolYear,
            'semester' => $semester,
            'courses' => $this->courses(),
            'departmentId' => $departmentId,
        ]);
    }

    public function facultiesSchedules($schoolyear, $semester)
    {
        $user = Auth::user();

        $departmentId = Faculty::where('faculty_id', '=', $user->id)->first()->department_id;
        $schoolYear = $this->schoolYear($schoolyear, $semester);

        return Inertia::render('SchoolYear/SchoolYearLayout', [
            'schoolYear' => $schoolYear,
            'semester' => $semester,
            'courses' => $this->courses(),
            'departmentId' => $departmentId,
        ]);
    }

    public function subjectsSchedules($schoolyear, $semester)
    {
        $user = Auth::user();

        $departmentId = Faculty::where('faculty_id', '=', $user->id)->first()->department_id;
        $schoolYear = $this->schoolYear($schoolyear, $semester);

        return Inertia::render('SchoolYear/SchoolYearLayout', [
            'schoolYear' => $schoolYear,
            'semester' => $semester,
            'courses' => $this->courses(),
            'departmentId' => $departmentId,
        ]);
    }

    public function subjectsList($schoolyear, $semester)
    {
        $schoolYear = $this->schoolYear($schoolyear, $semester);

        return Inertia::render('SchoolYear/SchoolYearLayout', [
            'schoolYear' => $schoolYear,
            'semester' => $semester,
            'courses' => $this->courses(),
        ]);
    }

    private function courses()
    {
        $user = Auth::user();

        $courses = [];

        if ($user->user_role == 'program_head') {
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

    private function schoolYear($schoolyear, $semester)
    {
        $years = explode('-', $schoolyear);

        $semesterInfo = Semester::where('semester_name', '=', $semester)->first();

        $schoolYear = SchoolYear::where('start_year', '=', $years[0])
            ->where('end_year', '=', $years[1])
            ->where('semester_id', '=', $semesterInfo->id)
            ->with('Semester')
            ->first();

        return $schoolYear;
    }


    public function viewOngoingEnrollment()
    {
        $user = Auth::user();

        $schoolYear = SchoolYear::where('is_current', '=', 1)
            ->with('Semester')
            ->first();

        if (!$user) {
            return Inertia::render('Guest/OngoingEnrollment', [
                'schoolYear' => $schoolYear
            ]);
        }

        if ($user->user_role == 'president') {
            return Inertia::render('President/OngoingEnrollment', [
                'schoolYear' => $schoolYear
            ]);
        }

        return Inertia::render('Guest/OngoingEnrollment', [
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

        $courses = Course::withCount([
            'enrolledStudents as enrolled_students_count' => function ($query) use ($schoolYearId) {
                $query->whereHas('yearSection', function ($q) use ($schoolYearId) {
                    $q->where('school_year_id', $schoolYearId);
                });
            }
        ])
            ->orderBy('department_id', 'ASC')
            ->get();

        return response()->json([
            'departmenCounts' => $departmentCounts,
            'totalEnrolled' => $totalAllDepartments,
            'yearLevelCounts' => $yearLevelCounts,
            'genderCounts' => $genderCounts,
            'studentTypeCounts' => $studentTypeCounts,
            'enrollmentsPerDate' => $enrollmentsPerDate,
            'peakDays' => $peakDays,
            'courses' => $courses,
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

    public function enrollmentRecordView()
    {
        $schoolYears = SchoolYear::select('school_years.id', 'start_year', 'end_year', 'semester_id', 'semester_name', 'is_current', )
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->orderBy('school_years.start_date', 'DESC')
            ->orderBy('school_years.end_date', 'DESC')
            ->orderBy('school_years.semester_id', 'DESC')
            ->get();

        $userRole = Auth::user()->user_role;
        if ($userRole == 'registrar') {
            return Inertia::render('SchoolYear/EnrollmentRecord', [
                'schoolYears' => $schoolYears,
            ]);
        } else if ($userRole == 'student') {
            return Inertia::render('StudentClasses/EnrollmentRecord');
        } else {
            return redirect('/login');
        }
    }

    public function recordStudentList($schoolYearId, Request $request)
    {
        return response()->json(
            EnrolledStudent::select(
                'first_name',
                'middle_name',
                'last_name',
                'user_id_no',
                'year_level_id',
                'course_name_abbreviation',
                'date_enrolled',
                'section'
            )
                ->when($request->search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('first_name', 'like', '%' . $search . '%')
                            ->orWhere('last_name', 'like', '%' . $search . '%');
                    });
                })
                ->withCount('Subjects as total_subjects')
                ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
                ->join('year_level', 'year_level.id', '=', 'year_section.year_level_id')
                ->join('course', 'course.id', '=', 'year_section.course_id')
                ->join('users', 'users.id', '=', 'enrolled_students.student_id')
                ->join('user_information', 'users.id', '=', 'user_information.user_id')
                ->where('year_section.school_year_id', $schoolYearId)
                ->orderBy('enrolled_students.date_enrolled', 'DESC')
                ->paginate(10)
        );
    }

    public function promotionalReport()
    {
        return Inertia::render('SchoolYear/PromotionalReport');
    }
}
