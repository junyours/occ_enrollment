<?php

namespace App\Http\Controllers\Mobile;

use App\Http\Controllers\Controller;
use App\Models\EnrolledStudent;
use App\Models\SchoolYear;
use App\Models\StudentSubject;
use App\Models\YearSectionSubjects;
use Auth;
use Illuminate\Http\Request;

class ClassController extends Controller
{
    public function getCurrentSchoolYear()
    {
        $schoolYear = SchoolYear::where('is_current', '=', 1)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->select('school_years.id', 'start_year', 'end_year', 'semester_name')
            ->first();

        return response()->json($schoolYear);
    }

    public function getStudentCurrentClasses()
    {
        $schoolYear = SchoolYear::where('is_current', '=', 1)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->select('school_years.id', 'start_year', 'end_year', 'semester_name')
            ->first();

        if (!$schoolYear) {
            return response()->json(['message' => 'No current school year is set'], 404);
        }
        $studentId = Auth::id(); // cleaner than Auth::user()->id

        $enrolledStudent = EnrolledStudent::select(('enrolled_students.id'))
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->where('school_year_id', '=', $schoolYear->id)
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

        return response()->json([
            'schoolYear' => $schoolYear,
            'classes' => $classes
        ]);
    }

    public function getStudentEnrollmentRecord()
    {
        $studentId = Auth::id();

        $data = EnrolledStudent::select(
            'evaluated',
            'enrolled_students.id',
            'year_level_name',
            'section',
            'semester_name',
            'start_year',
            'end_year'
        )
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->join('year_level', 'year_level.id', '=', 'year_section.year_level_id')
            ->join('school_years', 'school_years.id', '=', 'year_section.school_year_id')
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->where('student_id', '=', $studentId)
            ->with([
                'Subjects' => function ($query) {
                    $query->select(
                        'student_subjects.id',
                        'enrolled_students_id',
                        'first_name',
                        'last_name',
                        'middle_name',
                        'subject_code',
                        'descriptive_title',
                        'midterm_grade',
                        'final_grade',
                        'remarks',
                        'is_deployed',
                        'student_subjects.year_section_subjects_id'
                    )
                        ->join('year_section_subjects', 'year_section_subjects.id', '=', 'student_subjects.year_section_subjects_id')
                        ->leftJoin('grade_submissions', 'year_section_subjects.id', '=', 'grade_submissions.year_section_subjects_id')
                        ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
                        ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
                        ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
                        ->get();
                }
            ])
            ->orderBy('id', 'DESC')
            ->get();

        if (!$data) {
            return response()->json([
                'error' => 'You have no enrollment record.',
            ], 403);
        }

        return response()->json($data, 200);
    }

    public function getFacultyCurrentClasses()
    {
        $schoolYear = SchoolYear::where('is_current', '=', 1)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->select('school_years.id', 'start_year', 'end_year', 'semester_name')
            ->first();

        if (!$schoolYear) {
            return response()->json(['message' => 'No current school year is set'], 404);
        }

        $facultyId = Auth::id();

        $classes = YearSectionSubjects::select(
            'year_section_subjects.id',
            'day',
            'start_time',
            'end_time',
            'descriptive_title',
            'room_name',
            'section',
            'year_level_id',
            'course_name_abbreviation',
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
            ->where('school_year_id', '=', $schoolYear->id)
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

    public function getStudents(Request $request)
    {
        $id = YearSectionSubjects::whereRaw("SHA2(year_section_subjects.id, 256) = ?", [$request->hashed_year_section_subject_id])
            ->first()->year_section_id;

        $students = StudentSubject::select(
            'users.id',
            'user_id_no',
            'first_name',
            'middle_name',
            'last_name',
            'email_address',
            'contact_number',
            'user_id',
            'gender',
            'midterm_grade',
            'final_grade',
        )
            ->where('year_section_subjects_id', '=', $id)
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->orderBy('last_name', 'ASC')
            ->get();

        return response()->json($students);
    }
}
