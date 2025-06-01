<?php

namespace App\Http\Controllers\InstructorClasses;

use App\Http\Controllers\Controller;
use App\Models\EnrolledStudent;
use App\Models\SchoolYear;
use App\Models\StudentSubject;
use App\Models\YearSectionSubjects;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ClassController extends Controller
{
    public function view()
    {
        $userRole = Auth::user()->user_role;

        $currentSchoolYear = SchoolYear::select('school_years.id',  'start_year', 'end_year', 'semester_id', 'semester_name')
            ->where('is_current', '=', 1)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->first();

        if ($userRole == 'program_head' || $userRole == 'faculty' || $userRole == 'evaluator' || $userRole == 'registrar') {
            return Inertia::render('InstructorClasses/ViewClasses', [
                'currentSchoolYear' => $currentSchoolYear,
            ]);
        } else if ($userRole == 'student') {
            return Inertia::render('StudentClasses/ViewClasses', [
                'currentSchoolYear' => $currentSchoolYear,
            ]);
        }
    }

    public function getFacultyClasses()
    {
        $facultyId = Auth::user()->id;

        $currentSchoolYear = SchoolYear::select('school_years.id',  'start_year', 'end_year', 'semester_id', 'semester_name')
            ->where('is_current', '=', 1)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->first();

        if (!$currentSchoolYear) {
            return response([
                'message' => 'no school year',
            ]);
        }

        $classes = YearSectionSubjects::select(
            'day',
            'start_time',
            'end_time',
            'descriptive_title',
            'room_name',
        )
            ->selectRaw(
                "SHA2(year_section_subjects.id, 256) as hashed_year_section_subject_id"
            )
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftjoin('rooms', 'rooms.id', '=', 'year_section_subjects.room_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('year_level', 'year_level.id', '=', 'year_section.year_level_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->where('faculty_id', '=', $facultyId)
            ->where('school_year_id', '=', $currentSchoolYear->id)
            ->get();

        return response()->json($classes);
    }

    public function getStudentClasses(Request $request)
    {
        $studentId = Auth::id(); // cleaner than Auth::user()->id


        $enrolledStudent = EnrolledStudent::select(('enrolled_students.id'))
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->where('school_year_id', '=', $request->schoolYearId)
            ->where('student_id', '=', $studentId)
            ->first();


        if (!$enrolledStudent) {
            return response()->json([
                'error' => 'You are not currently enrolled in this school year.',
            ], 403);
        }

        $classes = StudentSubject::where('enrolled_students_id', '=', $enrolledStudent->id)
            ->select(
                'first_name',
                'last_name',
                'middle_name',
                'room_name',
                'descriptive_title',
                'year_section_subjects.start_time',
                'year_section_subjects.end_time',
                'year_section_subjects.day',
                'subject_secondary_schedule.start_time as secondstart_time',
                'subject_secondary_schedule.end_time as secondend_time',
                'subject_secondary_schedule.day as secondday',
            )
            ->join('year_section_subjects', 'year_section_subjects.id', '=', 'student_subjects.year_section_subjects_id')
            ->leftJoin('subject_secondary_schedule', 'year_section_subjects.id', '=', 'subject_secondary_schedule.year_section_subjects_id')
            ->leftJoin('rooms', 'rooms.id', '=', 'year_section_subjects.room_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->get();

        return response()->json($classes);
    }


    public function recordView()
    {
        return Inertia::render('StudentClasses/EnrollmentRecord');
    }

    public function getStudentEnrollmentRecord()
    {
        return response()->json(['message' => 'success'], 200);
    }
}
