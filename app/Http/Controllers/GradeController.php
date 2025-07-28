<?php

namespace App\Http\Controllers;

use App\Models\Faculty;
use App\Models\GradeSubmission;
use App\Models\SchoolYear;
use App\Models\Semester;
use App\Models\StudentSubject;
use App\Models\User;
use App\Models\YearSectionSubjects;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class GradeController extends Controller
{
    public function viewSubmittedGrades()
    {

        $schoolYears = SchoolYear::select('school_years.id', 'start_year', 'end_year', 'semester_id', 'semester_name', 'is_current', )
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->orderBy('school_years.start_date', 'DESC')
            ->orderBy('school_years.end_date', 'DESC')
            ->orderBy('school_years.semester_id', 'DESC')
            ->get();

        $user = Auth::user();

        $departmentId = Faculty::where('faculty_id', '=', $user->id)->first()->department_id;

        return Inertia::render('Grades/SubmittedGrades', [
            'schoolYears' => $schoolYears,
            'departmentId' => $departmentId,
        ]);
    }

    public function getFacultyListSubmittedGrades(Request $request)
    {
        $instructors = Faculty::where('faculty.department_id', '=', $request->departmentId)
            ->select(
                'users.user_id_no',
                DB::raw("CONCAT(user_information.last_name, ', ', user_information.first_name, ' ',
            IF(user_information.middle_name IS NOT NULL AND user_information.middle_name != '',
                CONCAT(SUBSTRING(user_information.middle_name, 1, 1), '.'),
                '')
        ) AS name"),
                DB::raw('COUNT(CASE WHEN grade_submissions.is_submitted = 1
                            AND (grade_submissions.is_verified IS NULL OR grade_submissions.is_verified = 0)
                            AND (grade_submissions.is_rejected IS NULL OR grade_submissions.is_rejected = 0)
                            AND (grade_submissions.is_deployed IS NULL OR grade_submissions.is_deployed = 0)
                       THEN 1 END) AS submitted_count')
            )
            ->join('users', 'users.id', '=', 'faculty.faculty_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->join('year_section_subjects', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->leftJoin('grade_submissions', 'year_section_subjects.id', '=', 'grade_submissions.year_section_subjects_id')
            ->where('year_section.school_year_id', '=', $request->schoolYearId)
            ->groupBy(
                'users.user_id_no',
                'user_information.last_name',
                'user_information.first_name',
                'user_information.middle_name'
            )
            ->orderBy('last_name', 'ASC')
            ->get();

        return response()->json($instructors, 200);
    }

    public function viewFacultySubjects($schoolYear, $semester, $facultyId)
    {
        $years = explode('-', $schoolYear);

        $semesterInfo = Semester::where('semester_name', '=', $semester)->first();

        $schoolYear = SchoolYear::where('start_year', '=', $years[0])
            ->select('school_years.id', 'start_year', 'end_year', 'semester_name')
            ->where('end_year', '=', $years[1])
            ->where('semester_id', '=', $semesterInfo->id)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->first();

        $faculty = User::where('user_id_no', '=', $facultyId)
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->select(
                'users.id',
                'users.user_id_no',
                DB::raw(
                    "CONCAT(
                    first_name, ' ',
                    IF(middle_name IS NOT NULL AND middle_name != '', CONCAT(middle_name, ' '), ''),
                    last_name
                    ) AS name"
                )
            )
            ->first();

        $subjects = YearSectionSubjects::select('year_section_subjects.id', 'descriptive_title', 'submitted_at', 'verified_at', 'is_submitted', 'is_verified', 'is_rejected', 'is_deployed', 'deployed_at')
            ->selectRaw(
                "SHA2(year_section_subjects.id, 256) as hashed_year_section_subject_id"
            )
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->where('faculty_id', '=', $faculty->id)
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('grade_submissions', 'year_section_subjects.id', '=', 'grade_submissions.year_section_subjects_id')
            ->where('school_year_id', '=', $schoolYear->id)
            ->get();


        return Inertia::render('Grades/FacultySubjects', [
            'schoolYear' => $schoolYear,
            'faculty' => $faculty,
            'subjects' => $subjects,
        ]);

    }

    public function viewSubjectStudents($schoolYear, $semester, $facultyId, $yearSectionSubjectsId)
    {
        $subject = YearSectionSubjects::select('course_name_abbreviation', 'section', 'year_level_id', 'year_section_subjects.id', 'descriptive_title', 'submitted_at', 'verified_at', 'is_submitted', 'is_verified', 'is_rejected', 'is_deployed', 'deployed_at')
            ->whereRaw("SHA2(year_section_subjects.id, 256) = ?", [$yearSectionSubjectsId])
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->join('grade_submissions', 'year_section_subjects.id', '=', 'grade_submissions.year_section_subjects_id')
            ->first();

        $faculty = User::where('user_id_no', '=', $facultyId)
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->select(
                DB::raw(
                    "CONCAT(
                    first_name, ' ',
                    IF(middle_name IS NOT NULL AND middle_name != '', CONCAT(middle_name, ' '), ''),
                    last_name
                    ) AS name"
                )
            )
            ->first();

        return Inertia::render(
            'Grades/SubjectStudentLIst',
            [
                'subject' => $subject,
                'faculty' => $faculty,
            ]
        );
    }

    public function viewFacultySubjectStudents(Request $request)
    {
        $students = StudentSubject::select(
            'users.id',
            'user_id_no',
            'first_name',
            'middle_name',
            'last_name',
            'midterm_grade',
            'final_grade',
        )
            ->where('year_section_subjects_id', '=', $request->yearSectionSubjectsId)
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->orderBy('last_name', 'ASC')
            ->get();

        return response()->json($students, 200);
    }

    public function verifyGrades($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'is_verified' => 1,
                'verified_at' => now(),
            ]);
    }

    public function rejectGrades($yearSectionSubjectsId, Request $request)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'is_rejected' => 1,
                'rejection_message' => $request->message,
            ]);
    }


    public function cancelVerifyGrade($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'verified_at' => null,
                'is_verified' => 0,
            ]);
    }

    public function instructorListSubmittion()
    {
        $schoolYears = SchoolYear::select('school_years.id', 'start_year', 'end_year', 'semester_id', 'semester_name', 'is_current', )
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->orderBy('school_years.start_date', 'DESC')
            ->orderBy('school_years.end_date', 'DESC')
            ->orderBy('school_years.semester_id', 'DESC')
            ->get();

        return Inertia::render('Grades/SubmittedGrades', [
            'schoolYears' => $schoolYears,
        ]);
    }

    public function viewVerifiedGrades()
    {
        $schoolYears = SchoolYear::select('school_years.id', 'start_year', 'end_year', 'semester_id', 'semester_name', 'is_current', )
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->orderBy('school_years.start_date', 'DESC')
            ->orderBy('school_years.end_date', 'DESC')
            ->orderBy('school_years.semester_id', 'DESC')
            ->get();

        return Inertia::render('Grades/VerifiedGrades', [
            'schoolYears' => $schoolYears,
        ]);
    }

    public function getFacultyListVerifiedGrades(Request $request)
    {
        $instructors = Faculty::select(
            'users.user_id_no',
            DB::raw("CONCAT(user_information.last_name, ', ', user_information.first_name, ' ',
        IF(user_information.middle_name IS NOT NULL AND user_information.middle_name != '',
            CONCAT(SUBSTRING(user_information.middle_name, 1, 1), '.'),
            '')
    ) AS name"),
            DB::raw('COUNT(CASE
        WHEN grade_submissions.is_verified = 1
             AND (grade_submissions.is_rejected IS NULL OR grade_submissions.is_rejected = 0)
             AND (grade_submissions.is_deployed IS NULL OR grade_submissions.is_deployed = 0)
        THEN 1 END) AS verified_count')
        )
            ->join('users', 'users.id', '=', 'faculty.faculty_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->join('year_section_subjects', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->leftJoin('grade_submissions', 'year_section_subjects.id', '=', 'grade_submissions.year_section_subjects_id')
            ->where('year_section.school_year_id', '=', $request->schoolYearId)
            ->groupBy(
                'users.user_id_no',
                'user_information.last_name',
                'user_information.first_name',
                'user_information.middle_name'
            )
            ->orderBy('last_name', 'ASC')
            ->get();

        return response()->json($instructors, 200);
    }

    public function viewFacultyVerifiedSubjects($schoolYear, $semester, $facultyId)
    {
        $years = explode('-', $schoolYear);

        $semesterInfo = Semester::where('semester_name', '=', $semester)->first();

        $schoolYear = SchoolYear::where('start_year', '=', $years[0])
            ->select('school_years.id', 'start_year', 'end_year', 'semester_name')
            ->where('end_year', '=', $years[1])
            ->where('semester_id', '=', $semesterInfo->id)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->first();

        $faculty = User::where('user_id_no', '=', $facultyId)
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->select(
                'users.id',
                'users.user_id_no',
                DB::raw(
                    "CONCAT(
                    first_name, ' ',
                    IF(middle_name IS NOT NULL AND middle_name != '', CONCAT(middle_name, ' '), ''),
                    last_name
                    ) AS name"
                )
            )
            ->first();

        $subjects = YearSectionSubjects::select('year_section_subjects.id', 'descriptive_title', 'submitted_at', 'verified_at', 'is_submitted', 'is_verified', 'is_rejected', 'is_deployed', 'deployed_at')
            ->selectRaw(
                "SHA2(year_section_subjects.id, 256) as hashed_year_section_subject_id"
            )
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->where('faculty_id', '=', $faculty->id)
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('grade_submissions', 'year_section_subjects.id', '=', 'grade_submissions.year_section_subjects_id')
            ->where('school_year_id', '=', $schoolYear->id)
            ->get();

        return Inertia::render('Grades/VerifiedFacultySubjects', [
            'schoolYear' => $schoolYear,
            'faculty' => $faculty,
            'subjects' => $subjects,
        ]);
    }

    public function viewVerifiedSubjectStudents($schoolYear, $semester, $facultyId, $yearSectionSubjectsId)
    {
        $subject = YearSectionSubjects::select(
            'course_name_abbreviation',
            'section',
            'year_level_id',
            'year_section_subjects.id',
            'descriptive_title',
            'submitted_at',
            'verified_at',
            'is_submitted',
            'is_verified',
            'is_rejected',
            'is_deployed',
            'deployed_at'
        )
            ->whereRaw("SHA2(year_section_subjects.id, 256) = ?", [$yearSectionSubjectsId])
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->join('grade_submissions', 'year_section_subjects.id', '=', 'grade_submissions.year_section_subjects_id')
            ->first();

        $faculty = User::where('user_id_no', '=', $facultyId)
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->select(
                DB::raw(
                    "CONCAT(
                    first_name, ' ',
                    IF(middle_name IS NOT NULL AND middle_name != '', CONCAT(middle_name, ' '), ''),
                    last_name
                    ) AS name"
                ),
            )
            ->first();

        return Inertia::render(
            'Grades/VerifiedSubjectStudentLIst',
            [
                'subject' => $subject,
                'faculty' => $faculty,
            ]
        );
    }

    public function viewFacultyVerifiedSubjectStudents(Request $request)
    {
        $students = StudentSubject::select(
            'users.id',
            'user_id_no',
            'first_name',
            'middle_name',
            'last_name',
            'midterm_grade',
            'final_grade',
        )
            ->where('year_section_subjects_id', '=', $request->yearSectionSubjectsId)
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->orderBy('last_name', 'ASC')
            ->get();

        return response()->json($students, 200);
    }

    public function deployGrades($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'is_deployed' => 1,
                'deployed_at' => now(),
            ]);
    }
}
