<?php

namespace App\Http\Controllers\SchoolYear;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\SchoolYear;
use App\Models\Semester;
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
            SchoolYear::whereNot('id', '=',  $schoolYear->id)
                ->update(['is_current' => 0]);
        }

        return response()->json(['message' => 'success'], 200);
    }

    public function editSchoolYear(Request $request, $id)
    {
        if ($request->is_current) {
            SchoolYear::whereNot('id', '=',  $id)
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
        $user = Auth::user();

        $years = explode('-', $schoolyear);

        $semesterInfo = Semester::where('semester_name', '=', $semester)->first();

        $schoolYear = SchoolYear::where('start_year', '=', $years[0])
            ->where('end_year', '=', $years[1])
            ->where('semester_id', '=', $semesterInfo->id)
            ->first();

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

        return Inertia::render(
            'SchoolYear/SchoolYearLayout',
            [
                'courses' => $courses,
                'schoolYear' => $schoolYear,
                'semester' => $semester
            ]
        );
    }

    public function viewCourse($schoolyear, $semester)
    {
        $user = Auth::user();

        $years = explode('-', $schoolyear);

        $semesterInfo = Semester::where('semester_name', '=', $semester)->first();

        $schoolYear = SchoolYear::where('start_year', '=', $years[0])
            ->where('end_year', '=', $years[1])
            ->where('semester_id', '=', $semesterInfo->id)
            ->first();

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

        return Inertia::render(
            'SchoolYear/SchoolYearLayout',
            [
                'courses' => $courses,
                'schoolYear' => $schoolYear,
                'semester' => $semester,
            ]
        );
    }

    public function viewClass($schoolyear, $semester, $hashedCourseId, $yearlevel, Request $request)
    {
        $user = Auth::user();

        $years = explode('-', $schoolyear);

        $semesterInfo = Semester::where('semester_name', '=', $semester)->first();

        $schoolYear = SchoolYear::where('start_year', '=', $years[0])
            ->where('end_year', '=', $years[1])
            ->where('semester_id', '=', $semesterInfo->id)
            ->first();

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
                'courses' => $courses,
                'courseId' => $course->id,
                'yearlevel' => $yearLevelNumber,
                'section' => $section,
                'yearSectionId' =>  $yearSection->id,
                'courseName' => $course->course_name_abbreviation,
            ]
        );
    }

    public function viewStudents($schoolyear, $semester, $hashedCourseId, $yearlevel, Request $request)
    {

        $user = Auth::user();

        $years = explode('-', $schoolyear);

        $semesterInfo = Semester::where('semester_name', '=', $semester)->first();

        $schoolYear = SchoolYear::where('start_year', '=', $years[0])
            ->where('end_year', '=', $years[1])
            ->where('semester_id', '=', $semesterInfo->id)
            ->first();

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
            'courses' => $courses,
            'courseId' => $course->id,
            'yearlevel' => $yearLevelNumber,
            'section' => $section,
            'yearSectionId' =>  $yearSection->id,
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
        $user = Auth::user();

        $years = explode('-', $schoolyear);

        $semesterInfo = Semester::where('semester_name', '=', $semester)->first();

        $schoolYear = SchoolYear::where('start_year', '=', $years[0])
            ->where('end_year', '=', $years[1])
            ->where('semester_id', '=', $semesterInfo->id)
            ->first();

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

        $section = $request->query('section');
        $studentIdNo = $request->query('id-no');


        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseId)
            ->first();

        return Inertia::render('SchoolYear/SchoolYearLayout', [
            'schoolYear' => $schoolYear,
            'semester' => $semester,
            'courses' => $courses,
            'courseId' => $course->id,
            'section' => $section,
            'yearlevel' => $yearlevel,
            'studentIdNo' => $studentIdNo,
        ]);
    }
}
