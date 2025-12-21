<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Faculty;
use App\Models\GradeEditRequest;
use App\Models\GradeSubmission;
use App\Models\SchoolYear;
use App\Models\Semester;
use App\Models\StudentSubject;
use App\Models\Subject;
use App\Models\User;
use App\Models\YearSection;
use App\Models\YearSectionSubjects;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class GradeController extends Controller
{
    public function viewSubmittedGrades()
    {

        $schoolYears = SchoolYear::select('school_years.id', 'start_year', 'end_year', 'semester_id', 'semester_name', 'is_current',)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->orderBy('school_years.start_date', 'DESC')
            ->orderBy('school_years.end_date', 'DESC')
            ->orderBy('school_years.semester_id', 'DESC')
            ->get();

        $user = Auth::user();

        $departmentId = Faculty::where('faculty_id', '=', $user->id)->first()->department_id;

        return Inertia::render('Grades/SubmittedGrades', [
            'departmentId' => $departmentId,
        ]);
    }

    public function getFacultyListSubmittedGrades(Request $request)
    {
        $instructors = Faculty::where('faculty.department_id', '=', $request->departmentId)
            ->select(
                'faculty.faculty_id',
                'users.user_id_no',
                DB::raw("CONCAT(user_information.last_name, ', ', user_information.first_name, ' ',
            IF(user_information.middle_name IS NOT NULL AND user_information.middle_name != '',
                CONCAT(SUBSTRING(user_information.middle_name, 1, 1), '.'),
                '')
            ) AS name"),
                DB::raw('
                SUM(
                    (grade_submissions.midterm_status = "submitted")
                    + (grade_submissions.final_status = "submitted")
                    ) AS submitted_count
            ')
            )
            ->join('users', 'users.id', '=', 'faculty.faculty_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->join('year_section_subjects', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->leftJoin('grade_submissions', 'year_section_subjects.id', '=', 'grade_submissions.year_section_subjects_id')
            ->where('year_section.school_year_id', '=', $request->schoolYearId)
            ->groupBy(
                'faculty.faculty_id',
                'users.user_id_no',
                'user_information.last_name',
                'user_information.first_name',
                'user_information.middle_name'
            )
            ->orderBy('last_name', 'ASC')
            ->withCount([
                'yearSectionSubjects as subjects_count' => function ($q) use ($request) {
                    $q->whereHas('yearSection', function ($qs) use ($request) {
                        $qs->where('school_year_id', $request->schoolYearId);
                    });
                }
            ])
            ->withCount([
                'gradeSubmissions as midterm_valid_count' => function ($q) use ($request) {
                    $q->whereHas('yearSectionSubject.yearSection', function ($qs) use ($request) {
                        $qs->where('school_year_id', $request->schoolYearId);
                    })->whereIn('midterm_status', ['verified', 'deployed']);
                },

                'gradeSubmissions as final_valid_count' => function ($q) use ($request) {
                    $q->whereHas('yearSectionSubject.yearSection', function ($qs) use ($request) {
                        $qs->where('school_year_id', $request->schoolYearId);
                    })->whereIn('final_status', ['verified', 'deployed']);
                },
            ])
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

        return Inertia::render('Grades/FacultySubjects', [
            'schoolYear' => $schoolYear,
            'faculty' => $faculty,
        ]);
    }

    public function getFacultySubjects(Request $request)
    {
        $subjects = YearSectionSubjects::select(
            'class_code',
            'year_section_subjects.id',
            'descriptive_title',
            'submitted_at',
            'verified_at',
            'is_submitted',
            'is_verified',
            'is_rejected',
            'is_deployed',
            'deployed_at',
            'course_name_abbreviation',
            'year_level_id',
            'section',
            'midterm_status',
            'midterm_submitted_at',
            'midterm_verified_at',
            'final_status',
            'final_submitted_at',
            'final_verified_at',
        )
            ->selectRaw(
                "SHA2(year_section_subjects.id, 256) as hashed_year_section_subject_id"
            )
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->where('faculty_id', '=', $request->facultyId)
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->join('grade_submissions', 'year_section_subjects.id', '=', 'grade_submissions.year_section_subjects_id')
            ->where('school_year_id', '=', $request->schoolYearId)
            ->get();

        return response()->json($subjects, 200);
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

    // public function verifyGrades($yearSectionSubjectsId)
    // {
    //     GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
    //         ->update([
    //             'is_verified' => 1,
    //             'verified_at' => now(),
    //         ]);
    // }

    public function verifyMidtermGrades($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'midterm_status' => 'verified',
                'midterm_verified_at' => now(),
            ]);
    }

    public function verifyFinalGrades($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'final_status' => 'verified',
                'final_verified_at' => now(),
            ]);
    }

    // public function rejectGrades($yearSectionSubjectsId, Request $request)
    // {
    //     GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
    //         ->update([
    //             'is_rejected' => 1,
    //             'midterm_rejection_message' => $request->message,
    //         ]);
    // }

    public function rejectMidtermGrades($yearSectionSubjectsId, Request $request)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'midterm_status' => 'rejected',
                'midterm_rejection_message' => $request->message,
            ]);
    }

    public function rejectFinalGrades($yearSectionSubjectsId, Request $request)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'final_status' => 'rejected',
                'final_rejection_message' => $request->message,
            ]);
    }

    public function unrejectMidtermGrades($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'midterm_status' => 'submitted',
                'midterm_rejection_message' => null,
            ]);
    }

    public function unrejectFinalGrades($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'final_status' => 'submitted',
                'final_rejection_message' => null,
            ]);
    }

    // public function cancelVerifyGrade($yearSectionSubjectsId)
    // {
    //     GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
    //         ->update([
    //             'verified_at' => null,
    //             'is_verified' => 0,
    //         ]);
    // }

    public function unVerifyMidtermGrade($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'midterm_status' => 'submitted',
                'midterm_verified_at' => now(),
            ]);
    }
    public function unVerifyFinalGrade($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'final_status' => 'submitted',
                'final_verified_at' => now(),
            ]);
    }

    public function instructorListSubmittion()
    {
        $schoolYears = SchoolYear::select('school_years.id', 'start_year', 'end_year', 'semester_id', 'semester_name', 'is_current',)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->orderBy('school_years.start_date', 'DESC')
            ->orderBy('school_years.end_date', 'DESC')
            ->orderBy('school_years.semester_id', 'DESC')
            ->get();

        return Inertia::render('Grades/SubmittedGrades');
    }

    public function viewVerifiedGrades()
    {
        $schoolYears = SchoolYear::select('school_years.id', 'start_year', 'end_year', 'semester_id', 'semester_name', 'is_current',)
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
            DB::raw('
                SUM(
                    (grade_submissions.midterm_status = "verified")
                    + (grade_submissions.final_status = "verified")
                    ) AS verified_count
            ')
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

        $subjects = YearSectionSubjects::select(
            'year_section_subjects.id',
            'descriptive_title',
            'midterm_status',
            'midterm_submitted_at',
            'midterm_verified_at',
            'midterm_deployed_at',
            'final_status',
            'final_submitted_at',
            'final_verified_at',
            'final_rejection_message',
            'final_deployed_at',
        )
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

    public function changeRequestView()
    {
        return Inertia::render('Grades/ChangeRequests');
    }

    public function changeRequestList(Request $request)
    {

        $requestsList = GradeEditRequest::select(
            'grade_edit_requests.id',
            'year_section_subjects_id',
            'period',
            'status',
            'request_date',
            'rejection_date',
            'approval_date',
            'submission_date',
            'rejection_message',
            'changes',
            'course_name_abbreviation',
            'year_level_id',
            'section',
            'descriptive_title',
            'first_name',
            'middle_name',
            'last_name',
        )
            ->where('school_year_id', '=', $request->schoolYearId)
            ->join('year_section_subjects', 'year_section_subjects.id', '=', 'grade_edit_requests.year_section_subjects_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->join('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->orderBy('request_date', 'ASC')
            ->get();

        return response()->json($requestsList);
    }

    // public function deployGrades($yearSectionSubjectsId)
    // {
    //     GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
    //         ->update([
    //             'is_deployed' => 1,
    //             'deployed_at' => now(),
    //         ]);
    // }

    public function deployMidtermGrades($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'midterm_status' => 'deployed',
                'midterm_deployed_at' => now(),
            ]);
    }


    public function deployFinalGrades($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'final_status' => 'deployed',
                'final_deployed_at' => now(),
            ]);
    }

    public function undeployMidtermGrades($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'midterm_status' => 'verified',
                'midterm_deployed_at' => null,
            ]);
    }


    public function undeployFinalGrades($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'final_status' => 'verified',
                'final_deployed_at' => null,
            ]);
    }

    public function programHeadName($yearSectionSubjectsId)
    {
        $deptId = YearSectionSubjects::where('year_section_subjects.id', '=', $yearSectionSubjectsId)
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->first()->department_id;

        $programHead = User::select('first_name', 'middle_name', 'last_name')
            ->where('user_role', '=', 'program_head')
            ->join('faculty', 'users.id', '=', 'faculty.faculty_id')
            ->where('department_id', '=', $deptId)
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->first();

        return response()->json($programHead);
    }

    public function gradesSubjectsList()
    {
        return Inertia::render('Grades/InstructorSubejctsList');
    }

    public function gradesInstructorRequests()
    {
        return Inertia::render('Grades/InstructorRequests');
    }

    public function viewEditRequest($hashedGradeEditRequestsId)
    {
        $gradeEditRequest = GradeEditRequest::whereRaw('MD5(id) = ?', [$hashedGradeEditRequestsId])->first();

        if (!$gradeEditRequest) {
            return Inertia::render('Grades/EditGrade/Error', [
                'error' => [
                    'type' => 'not_found',
                    'message' => 'Grade edit request not found or may have been deleted.',
                ]
            ]);
        }

        $yearSectionSubject = YearSectionSubjects::find($gradeEditRequest->year_section_subjects_id);

        if (!$yearSectionSubject) {
            return Inertia::render('Grades/EditGrade/Error', [
                'error' => [
                    'type' => 'not_found',
                    'message' => 'Related subject record not found.',
                ]
            ]);
        }

        if (Auth::id() !== $yearSectionSubject->faculty_id) {
            return Inertia::render('Grades/EditGrade/Error', [
                'error' => [
                    'type' => 'unauthorized',
                    'message' => 'You are not authorized to view this grade edit request.',
                ]
            ]);
        }

        $classInfo = YearSectionSubjects::select(
            'course_name_abbreviation',
            'year_level_id',
            'section',
            'descriptive_title',
        )
            ->where('year_section_subjects.id', '=', $gradeEditRequest->year_section_subjects_id)
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->first();

        return Inertia::render('Grades/EditGrade/EditGrade', [
            'gradeEditRequest' => $gradeEditRequest,
            'classInfo' => $classInfo,
        ]);
    }

    public function getEditRequestGrades(Request $request)
    {
        $gradeRequest = GradeEditRequest::where('id', '=', $request->editRequestId)
            ->first();

        if ($gradeRequest->period == 'midterm') {
            $grades = StudentSubject::where('year_section_subjects_id', '=', $gradeRequest->year_section_subjects_id)
                ->select(
                    'student_subjects.id',
                    'users.user_id_no',
                    'first_name',
                    'middle_name',
                    'last_name',
                    'midterm_grade as grade',
                )
                ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
                ->join('users', 'users.id', '=', 'enrolled_students.student_id')
                ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
                ->orderBy('last_name', 'ASC')
                ->orderBy('first_name', 'ASC')
                ->get();
        } else {
            $grades = StudentSubject::where('year_section_subjects_id', '=', $gradeRequest->year_section_subjects_id)
                ->select(
                    'student_subjects.id',
                    'users.user_id_no',
                    'first_name',
                    'middle_name',
                    'last_name',
                    'final_grade as grade',
                )
                ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
                ->join('users', 'users.id', '=', 'enrolled_students.student_id')
                ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
                ->orderBy('last_name', 'ASC')
                ->get();
        }

        return response()->json($grades);
    }

    public function requestsList(Request $request)
    {
        $requestsList = GradeEditRequest::where('school_year_id', '=', $request->schoolYearId)
            ->select(
                'descriptive_title',
                'course_name_abbreviation',
                'year_level_id',
                'request_date',
                'grade_edit_requests.status',
                'rejection_message',
                'section',
            )
            ->addSelect(DB::raw("MD5(grade_edit_requests.id) as hashed_grade_edit_requests_id"))
            ->join('year_section_subjects', 'year_section_subjects.id', '=', 'grade_edit_requests.year_section_subjects_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->orderBy('request_date', 'DESC')
            ->where('year_section_subjects.faculty_id', '=', Auth::id())
            ->get();

        return response()->json($requestsList);
    }

    public function submitEditRequestChanges(Request $request)
    {
        $gradeEditRequest = GradeEditRequest::find($request->editRequestId);

        foreach ($request->changes as $change) {
            $newGrade = $change['newGrade']; // important

            if ($gradeEditRequest->period === 'midterm') {
                StudentSubject::where('id', $change['id'])
                    ->update([
                        'midterm_grade' => $newGrade,
                    ]);
            }

            if ($gradeEditRequest->period === 'final') {
                StudentSubject::where('id', $change['id'])
                    ->update([
                        'final_grade' => $newGrade,
                    ]);
            }
        }

        $gradeEditRequest->update([
            'changes' => $request->changes,
            'submission_date' => now(),
            'status' => 'submitted',
        ]);
    }


    public function approveRequest(Request $request)
    {
        GradeEditRequest::where('id', '=', $request->requestId)
            ->update([
                'status' => 'approved',
                'approval_date' => now(),
            ]);
    }

    public function rejectRequest(Request $request)
    {
        GradeEditRequest::where('id', '=', $request->requestId)
            ->update([
                'status' => 'rejected',
                'rejection_date' => now(),
                'rejection_message' => $request->rejectionMessage,
            ]);
    }

    public function instructorSubjects(Request $request)
    {
        $facultyId = Auth::id();

        $subjects = YearSectionSubjects::select(
            'year_section_subjects.id',
            'descriptive_title',
            'midterm_status',
            'midterm_submitted_at',
            'midterm_verified_at',
            'midterm_deployed_at',
            'final_status',
            'final_submitted_at',
            'final_verified_at',
            'final_rejection_message',
            'final_deployed_at',
            'section',
            'year_level_id',
            'course_name_abbreviation',
        )
            ->selectRaw(
                "SHA2(year_section_subjects.id, 256) as hashed_year_section_subject_id"
            )
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->where('faculty_id', '=', $facultyId)
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('year_level', 'year_level.id', '=', 'year_section.year_level_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->join('grade_submissions', 'year_section_subjects.id', '=', 'grade_submissions.year_section_subjects_id')
            ->where('school_year_id', '=', $request->schoolYearId)
            ->get();

        return response()->json($subjects, 200);
    }

    public function instructorSubjectsViewSubject($id)
    {
        $yearSectionSubjects = YearSectionSubjects::whereRaw("SHA2(year_section_subjects.id, 256) = ?", [$id])
            ->first();

        $subject = Subject::where('id', '=', $yearSectionSubjects->subject_id)->first();

        $courseSection = YearSection::join('course', 'course.id', '=', 'year_section.course_id')
            ->where('year_section.id', $yearSectionSubjects->year_section_id)
            ->first();

        $gradeStatus = GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjects->id)->first();

        if (!$gradeStatus) {
            $gradeStatus = GradeSubmission::create([
                'year_section_subjects_id' => $yearSectionSubjects->id
            ]);
        }

        $schoolYear = SchoolYear::where('school_years.id', '=', $courseSection->school_year_id)
            ->select(
                'allow_upload_final',
                'allow_upload_midterm',
                'start_year',
                'end_year',
                'semester_name'
            )
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->first();

        return Inertia::render('Grades/InstructorSubjectView', [
            'id' => $yearSectionSubjects->id,
            'subjectCode' => $subject->subject_code,
            'descriptiveTitle' => $subject->descriptive_title,
            'courseSection' => $courseSection->course_name_abbreviation . '-' . $courseSection->year_level_id . $courseSection->section,
            'gradeStatus' => $gradeStatus,
            'schoolYear' => $schoolYear,
        ]);
    }
}
