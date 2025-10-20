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
use App\Models\User;
use App\Models\YearLevel;
use App\Models\YearSection;
use App\Models\YearSectionSubjects;
use Carbon\Carbon;
use DateTime;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;

class SchoolYearController extends Controller
{
    public function view()
    {
        return Inertia::render('SchoolYear/SchoolYear');
    }

    public function getSchoolYear($id)
    {
        $schoolYear = SchoolYear::select(
            'school_years.id',
            "start_year",
            "end_year",
            "start_date",
            "end_date",
            "is_current",
            "allow_enrollment",
            "allowed_enrollment_roles",
            "evaluating",
            "allow_upload_midterm",
            "allow_upload_final",
            "semester_name"
        )
            ->where('school_years.id', '=', $id)
            ->join('semesters', 'school_years.semester_id', '=', 'semesters.id')
            ->first();

        return response()->json($schoolYear);
    }

    public function updateIsCurrent($schoolYearId, Request $request)
    {
        if ($request->value) {
            SchoolYear::whereNot('id', '=', $schoolYearId)
                ->update(['is_current' => 0]);
        }

        $schoolYear = SchoolYear::findOrFail($schoolYearId);

        $schoolYear->update(([
            'is_current' => $request->value,
        ]));

        return response()->json(['message' => 'Updated successfully']);
    }

    public function updateAllowEnrollment($schoolYearId, Request $request)
    {
        $schoolYear = SchoolYear::findOrFail($schoolYearId);

        $schoolYear->update(([
            'allow_enrollment' => $request->value,
        ]));

        return response()->json(['message' => 'Updated successfully']);
    }

    public function updateEvaluating($schoolYearId, Request $request)
    {
        $schoolYear = SchoolYear::findOrFail($schoolYearId);

        $schoolYear->update(([
            'evaluating' => $request->value,
        ]));

        return response()->json(['message' => 'Updated successfully']);
    }

    public function updateAllowUploadMidterm($schoolYearId, Request $request)
    {
        $schoolYear = SchoolYear::findOrFail($schoolYearId);

        $schoolYear->update(([
            'allow_upload_midterm' => $request->value,
        ]));

        return response()->json(['message' => 'Updated successfully']);
    }

    public function updateAllowUploadFinal($schoolYearId, Request $request)
    {
        $schoolYear = SchoolYear::findOrFail($schoolYearId);

        $schoolYear->update(([
            'allow_upload_final' => $request->value,
        ]));

        return response()->json(['message' => 'Updated successfully']);
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
        $userRole = Auth::user()->user_role;
        if ($userRole == 'registrar') {
            return Inertia::render('SchoolYear/EnrollmentRecord', [
                'schoolYears' => $this->schoolYearsList(),
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

    public function getStudentSubjects($schoolYearId, $studentId)
    {
        $studentId = User::where('user_id_no', '=', $studentId)->first()->id;

        $enrolledStudent = EnrolledStudent::select('enrolled_students.id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->where('school_year_id', '=', $schoolYearId)
            ->where('student_id', '=', $studentId)
            ->first();

        if (!$enrolledStudent) {
            return response()->json([
                'error' => 'You are not currently enrolled in this school year.',
            ], 403);
        }

        $classes = YearSectionSubjects::where('enrolled_students_id', '=', $enrolledStudent->id)
            ->select(
                'enrolled_students_id',
                'year_section_subjects.id',
                'first_name',
                'last_name',
                'middle_name',
                'room_name',
                'descriptive_title',
                'year_section_subjects.start_time',
                'year_section_subjects.end_time',
                'year_section_subjects.day',
            )
            ->join('student_subjects', 'year_section_subjects.id', '=', 'student_subjects.year_section_subjects_id')
            ->leftJoin('subject_secondary_schedule', 'year_section_subjects.id', '=', 'subject_secondary_schedule.year_section_subjects_id')
            ->leftJoin('rooms', 'rooms.id', '=', 'year_section_subjects.room_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->with([
                'SecondarySchedule' => function ($query) {
                    $query->select(
                        'rooms.room_name',
                        'subject_secondary_schedule.id',
                        'year_section_subjects_id',
                        'faculty_id',
                        'room_id',
                        'day',
                        'start_time',
                        'end_time',
                        'room_name'
                    )
                        ->leftjoin('rooms', 'rooms.id', '=', 'subject_secondary_schedule.room_id');
                }
            ])
            ->get();

        return response()->json($classes);
    }

    public function getStudentSubjectsGrades($schoolYearId, $studentId)
    {
        $studentId = User::where('user_id_no', '=', $studentId)->first()->id;

        $enrolledStudent = EnrolledStudent::select('enrolled_students.id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->where('school_year_id', '=', $schoolYearId)
            ->where('student_id', '=', $studentId)
            ->first();

        if (!$enrolledStudent) {
            return response()->json([
                'error' => 'You are not currently enrolled in this school year.',
            ], 403);
        }

        $classes = YearSectionSubjects::where('enrolled_students_id', '=', $enrolledStudent->id)
            ->select(
                'enrolled_students_id',
                'year_section_subjects.id',
                'first_name',
                'last_name',
                'middle_name',
                'descriptive_title',
                'midterm_grade',
                'final_grade',
            )
            ->join('student_subjects', 'year_section_subjects.id', '=', 'student_subjects.year_section_subjects_id')
            ->leftJoin('subject_secondary_schedule', 'year_section_subjects.id', '=', 'subject_secondary_schedule.year_section_subjects_id')
            ->leftJoin('rooms', 'rooms.id', '=', 'year_section_subjects.room_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->get();

        return response()->json($classes);
    }

    public function promotionalReportStudentList($schoolYearId, Request $request)
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
                ->orderBy('last_name', 'ASC')
                ->paginate(10)
        );
    }

    public function promotionalReport()
    {
        return Inertia::render('SchoolYear/PromotionalReport', [
            'schoolYears' => $this->schoolYearsList(),
        ]);
    }

    public function subjectsReport()
    {
        return Inertia::render('SchoolYear/SubjectsReport', [
            'schoolYears' => $this->schoolYearsList(),
        ]);
    }

    public function facultiesReport()
    {
        return Inertia::render('SchoolYear/FacultiesReport', [
            'schoolYears' => $this->schoolYearsList(),
        ]);
    }

    public function getFacultiesSubjects($schoolYearId, Request $request)
    {
        return response()->json(
            data: User::select('users.id', 'faculty.faculty_id', 'first_name', 'middle_name', 'last_name', 'active')
                ->with([
                    'Schedules' => function ($query) use ($schoolYearId) {
                        $query->select(
                            'room_name',
                            'day',
                            'descriptive_title',
                            'credit_units',
                            'end_time',
                            'faculty_id',
                            'year_section_subjects.id',
                            'room_id',
                            'start_time',
                            'subject_id',
                            'year_section_id',
                            'class_code',
                            'school_year_id',
                            'section',
                            'year_level_id',
                            'course_name_abbreviation'
                        )
                            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
                            ->leftJoin('rooms', 'rooms.id', '=', 'year_section_subjects.room_id')
                            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
                            ->join('course', 'course.id', '=', 'year_section.course_id')
                            ->with([
                                'SecondarySchedule' => function ($query) {
                                    $query->select(
                                        'rooms.room_name',
                                        'subject_secondary_schedule.id',
                                        'year_section_subjects_id',
                                        'faculty_id',
                                        'room_id',
                                        'day',
                                        'start_time',
                                        'end_time',
                                        'room_name'
                                    )
                                        ->leftJoin('rooms', 'rooms.id', '=', 'subject_secondary_schedule.room_id');
                                }
                            ])
                            ->withCount('SubjectEnrolledStudents as student_count')
                            ->where('school_year_id', $schoolYearId);
                    }
                ])->whereHas('Schedules', function ($query) use ($schoolYearId) {
                    $query->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
                        ->where('year_section.school_year_id', $schoolYearId);
                })
                ->join('faculty', 'users.id', '=', 'faculty.faculty_id')
                ->join('user_information', 'users.id', '=', 'user_information.user_id')
                ->orderBy('last_name', 'asc')
                ->when($request->search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('first_name', 'like', "%{$search}%")
                            ->orWhere('last_name', 'like', "%{$search}%");
                    });
                })
                ->paginate(10)
        );
    }

    public function downloadFacultiesSubjects($schoolYearId)
    {
        $schoolYear = SchoolYear::where('school_years.id', '=', $schoolYearId)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->first();

        $faculties = User::select('users.id', 'faculty.faculty_id', 'first_name', 'middle_name', 'last_name', 'active')
            ->with([
                'schedules' => function ($q) use ($schoolYearId) {
                    $q->with([
                        'subject:id,descriptive_title,credit_units',
                        'room:id,room_name',
                        'secondarySchedule.room:id,room_name',
                        'yearSection:id,school_year_id'
                    ])
                        ->whereHas('yearSection', function ($query) use ($schoolYearId) {
                            $query->where('school_year_id', $schoolYearId);
                        });
                },
            ])
            ->whereHas('schedules.yearSection', function ($query) use ($schoolYearId) {
                $query->where('school_year_id', $schoolYearId);
            })
            ->join('faculty', 'users.id', '=', 'faculty.faculty_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->orderBy('last_name', 'asc')
            ->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $sheet->setCellValue('A1', 'Name');
        $sheet->setCellValue('B1', 'Subject');
        $sheet->setCellValue('C1', 'Day');
        $sheet->setCellValue('D1', 'Time');
        $sheet->setCellValue('E1', 'Hours');
        $sheet->setCellValue('F1', 'Units');

        $sheet->getColumnDimension('A')->setWidth(25);
        $sheet->getColumnDimension('B')->setWidth(55);
        $sheet->getColumnDimension('C')->setWidth(25);
        $sheet->getColumnDimension('D')->setWidth(25);
        $sheet->getColumnDimension('E')->setWidth(10);
        $sheet->getColumnDimension('F')->setWidth(10);

        $row = 2;
        $number = 1;
        foreach ($faculties as $faculty) {
            $firstRow = true;

            $lastName = Str::ucfirst(Str::lower($faculty->last_name));
            $firstName = Str::ucfirst(Str::lower($faculty->first_name));
            $middleInitial = $faculty->middle_name
                ? Str::upper(Str::substr($faculty->middle_name, 0, 1)) . '.'
                : '';
            $fullName = "{$lastName}, {$firstName} {$middleInitial}";

            foreach ($faculty->schedules as $subject) {
                $sheet->setCellValue("A{$row}", $firstRow ? "{$number}. {$fullName}" : '');
                $sheet->setCellValue("B{$row}", optional($subject->subject)->descriptive_title);
                $sheet->setCellValue("C{$row}", $subject->day == 'TBA' ? '' : $subject->day);
                $sheet->setCellValue("D{$row}", $subject->start_time == 'TBA' ? '' : "{$this->convertToAMPM($subject->start_time)} - {$this->convertToAMPM($subject->end_time)}");
                $sheet->setCellValue("E{$row}", $this->calculateHours($subject->start_time, $subject->end_time));
                $sheet->setCellValue("F{$row}", optional($subject->subject)->credit_units);

                $firstRow = false;

                // Case: has secondary schedule
                if ($subject->secondarySchedule) {
                    $secondaryRow = $row + 1;

                    $sheet->setCellValue("C{$secondaryRow}", $subject->secondarySchedule->day);
                    $sheet->setCellValue("D{$secondaryRow}", "{$this->convertToAMPM($subject->secondarySchedule->start_time)} - {$this->convertToAMPM($subject->secondarySchedule->end_time)}");
                    $sheet->setCellValue("E{$secondaryRow}", $this->calculateHours($subject->secondarySchedule->start_time, $subject->secondarySchedule->end_time));

                    // Merge Subject and Credit Units across both rows
                    $sheet->mergeCells("B{$row}:B{$secondaryRow}");
                    $sheet->mergeCells("F{$row}:F{$secondaryRow}");

                    // Align merged cells vertically center
                    $sheet->getStyle("B{$row}:B{$secondaryRow}")
                        ->getAlignment()->setVertical(\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER);
                    $sheet->getStyle("F{$row}:F{$secondaryRow}")
                        ->getAlignment()->setVertical(\PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER);

                    $row = $secondaryRow + 1; // move pointer past the secondary row
                } else {
                    $row++;
                }
            };
            $number++;
        }

        // Sanitize filename
        $filename = ("Faculties Subjects - {$schoolYear->start_year}-{$schoolYear->end_year} {$schoolYear->semester_name} Semester") . '.xlsx';

        // Save to temporary path
        $tempPath = tempnam(sys_get_temp_dir(), 'subject_');
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);

        return response()->download($tempPath, $filename)->deleteFileAfterSend(true);
    }

    private function convertToAMPM($time)
    {
        if (!$time || !is_string($time) || strpos($time, ':') === false) {
            return ''; // or return 'N/A'
        }

        list($hour, $minute) = array_map('intval', explode(':', $time));
        $ampm = $hour >= 12 ? 'PM' : 'AM';
        $convertedHour = $hour % 12 ?: 12;

        return sprintf("%d:%02d %s", $convertedHour, $minute, $ampm);
    }

    private function calculateHours($start_time, $end_time)
    {
        // Guard: skip invalid placeholders like "TBA"
        if (!$start_time || !$end_time || strtoupper($start_time) === 'TBA' || strtoupper($end_time) === 'TBA') {
            return '';
        }

        try {
            $start = new DateTime($start_time);
            $end = new DateTime($end_time);

            // Handle cases where end time is past midnight
            if ($end < $start) {
                $end->modify('+1 day');
            }

            $diff = $start->diff($end);
            $hours = $diff->h + ($diff->days * 24);
            $minutes = $diff->i;

            // return rounded to 2 decimals, e.g. 1.5 hours
            return round($hours + ($minutes / 60), 2);
        } catch (Exception $e) {
            // Return empty instead of 0, so Excel doesn’t mislead
            return '';
        }
    }

    public function downloadStudentsSubjects($schoolYearId)
    {
        set_time_limit(120); // 2 minutes

        $schoolYear = SchoolYear::where('school_years.id', '=', $schoolYearId)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->first();

        $templatePath = storage_path('app/templates/EL_TEMPLATE.xlsx');
        $spreadsheet = IOFactory::load($templatePath);

        // Write data to cell B13
        $sheet = $spreadsheet->getActiveSheet();

        $students = EnrolledStudent::select(
            'enrolled_students.id',
            'user_id_no',
            'first_name',
            'middle_name',
            'last_name',
            'gender',
            'year_section_id',
        )
            ->with([
                'yearSection.course',
                'yearSection.YearLevel',
                'subjects.yearSectionSubjects.subject',
            ])
            ->whereHas('yearSection', function ($q) use ($schoolYearId) {
                $q->where('school_year_id', $schoolYearId);
            })
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->orderBy('last_name', 'asc')
            ->get();

        $row = 13;
        $number = 1;
        foreach ($students as $student) {
            $firstRow = true;
            $program = $student->yearSection->course->course_name;
            $major = $student->yearSection->course->major;
            $yearLevel = str_ireplace('Year', '', $student->yearSection->YearLevel->year_level_name);

            foreach ($student->subjects as $subject) {
                $sheet->setCellValue("A{$row}", $firstRow ? $number : '');
                $sheet->setCellValue("B{$row}", $firstRow ? $program : ''); // PROGRAM NAME
                $sheet->setCellValue("C{$row}", $firstRow ? $major : ''); // PROGRAM MAJOR
                $sheet->setCellValue("D{$row}", $firstRow ? $student->user_id_no : ''); // STUDENT ID NUMBER
                $sheet->setCellValue("E{$row}", $firstRow ? $yearLevel : ''); // YEAR LEVEL
                $sheet->setCellValue("F{$row}", $firstRow ? $student->last_name : ''); // LAST NAME
                $sheet->setCellValue("G{$row}", $firstRow ? $student->first_name : ''); // FIRST NAME
                $sheet->setCellValue("H{$row}", $firstRow ? $student->middle_name : ''); // MIDDLE NAME
                $sheet->setCellValue("I{$row}", ''); // EXT. NAME
                $sheet->setCellValue("J{$row}", $firstRow ? $student->gender : ''); // SEX
                $sheet->setCellValue("K{$row}", ''); // NATIONALITY
                $sheet->setCellValue("L{$row}", $subject->yearSectionSubjects->subject->subject_code); // COURSE CODE
                $sheet->setCellValue("M{$row}", $subject->yearSectionSubjects->subject->descriptive_title); // COURSE DESCRIPTION
                $sheet->setCellValue("N{$row}", $subject->yearSectionSubjects->subject->credit_units); // NO. OF UNITS
                $row++;
                $firstRow = false;
            }

            // now $row - 1 is the last row of this student
            $lastRow = $row - 1;

            // apply a black bottom border across columns A–N
            $sheet->getStyle("A{$lastRow}:N{$lastRow}")
                ->getBorders()->getBottom()
                ->setBorderStyle(Border::BORDER_THIN)
                ->setColor(new Color(Color::COLOR_BLACK));

            $number++;
        }

        $filename = ("Enrollment Record - {$schoolYear->start_year}-{$schoolYear->end_year} {$schoolYear->semester_name} Semester") . '.xlsx';

        // Save to temporary path
        $tempPath = tempnam(sys_get_temp_dir(), 'subject_');
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);

        return response()->download($tempPath, $filename)->deleteFileAfterSend(true);
    }

    public function downloadStudentsSubjectsGrades($schoolYearId)
    {
        set_time_limit(120); // 2 minutes

        $schoolYear = SchoolYear::where('school_years.id', '=', $schoolYearId)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->first();

        $templatePath = storage_path('app/templates/PR_TEMPLATE.xlsx');
        $spreadsheet = IOFactory::load($templatePath);

        // Write data to cell B13
        $sheet = $spreadsheet->getActiveSheet();

        $students = EnrolledStudent::select(
            'enrolled_students.id',
            'user_id_no',
            'first_name',
            'middle_name',
            'last_name',
            'gender',
            'year_section_id',
        )
            ->with([
                'yearSection.course',
                'yearSection.YearLevel',
                'subjects.yearSectionSubjects.subject',
            ])
            ->whereHas('yearSection', function ($q) use ($schoolYearId) {
                $q->where('school_year_id', $schoolYearId);
            })
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->orderBy('last_name', 'asc')
            ->get();

        $row = 13;
        $number = 1;
        foreach ($students as $student) {
            $firstRow = true;
            $program = $student->yearSection->course->course_name;
            $major = $student->yearSection->course->major;
            $yearLevel = str_ireplace('Year', '', $student->yearSection->YearLevel->year_level_name);

            foreach ($student->subjects as $subject) {
                $sheet->setCellValue("A{$row}", $firstRow ? $number : '');
                $sheet->setCellValue("B{$row}", $firstRow ? $program : ''); // PROGRAM NAME
                $sheet->setCellValue("C{$row}", $firstRow ? $major : ''); // PROGRAM MAJOR
                $sheet->setCellValue("D{$row}", $firstRow ? $student->user_id_no : ''); // STUDENT ID NUMBER
                $sheet->setCellValue("E{$row}", $firstRow ? $yearLevel : ''); // YEAR LEVEL
                $sheet->setCellValue("F{$row}", $firstRow ? $student->last_name : ''); // LAST NAME
                $sheet->setCellValue("G{$row}", $firstRow ? $student->first_name : ''); // FIRST NAME
                $sheet->setCellValue("H{$row}", $firstRow ? $student->middle_name : ''); // MIDDLE NAME
                $sheet->setCellValue("I{$row}", ''); // EXT. NAME
                $sheet->setCellValue("J{$row}", $firstRow ? $student->gender : ''); // SEX
                $sheet->setCellValue("K{$row}", ''); // NATIONALITY
                $sheet->setCellValue("L{$row}", $subject->yearSectionSubjects->subject->subject_code); // COURSE CODE
                $sheet->setCellValue("M{$row}", $subject->yearSectionSubjects->subject->descriptive_title); // COURSE DESCRIPTION
                $sheet->setCellValue("N{$row}", $subject->yearSectionSubjects->subject->credit_units); // NO. OF UNITS

                $midterm = $subject->midterm_grade;
                $final   = $subject->final_grade;

                if ($midterm === null || $final === null) {
                    // No grade yet → leave cell empty or mark as "N/A"
                    $sheet->setCellValue("O{$row}", '');
                    $sheet->setCellValue("P{$row}", '');
                } else {
                    $average = ($midterm + $final) / 2;

                    // Column O: numeric grade with 1 decimal place, clamp >= 3.05 to 5.0
                    $sheet->setCellValue("O{$row}", number_format($average >= 3.05 ? 5.0 : $average, 1));

                    // Column P: PASSED / FAILED
                    $sheet->setCellValue("P{$row}", $average >= 3.05 ? 'FAILED' : 'PASSED');
                    $sheet->setCellValue("Q{$row}", $midterm);
                    $sheet->setCellValue("R{$row}", $final);
                }

                $row++;
                $firstRow = false;
            }

            // now $row - 1 is the last row of this student
            $lastRow = $row - 1;

            // apply a black bottom border across columns A–N
            $sheet->getStyle("A{$lastRow}:P{$lastRow}")
                ->getBorders()->getBottom()
                ->setBorderStyle(Border::BORDER_THIN)
                ->setColor(new Color(Color::COLOR_BLACK));

            $number++;
        }

        $filename = ("Promotional Report - {$schoolYear->start_year}-{$schoolYear->end_year} {$schoolYear->semester_name} Semester") . '.xlsx';

        // Save to temporary path
        $tempPath = tempnam(sys_get_temp_dir(), 'subject_');
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);

        return response()->download($tempPath, $filename)->deleteFileAfterSend(true);
    }

    private function schoolYearsList()
    {
        return SchoolYear::select('school_years.id', 'start_year', 'end_year', 'semester_id', 'semester_name', 'is_current',)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->orderBy('school_years.start_date', 'DESC')
            ->orderBy('school_years.end_date', 'DESC')
            ->orderBy('school_years.semester_id', 'DESC')
            ->get();
    }
}
