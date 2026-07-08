<?php

namespace App\Http\Controllers\InstructorClasses;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\EnrolledStudent;
use App\Models\GradeEditRequest;
use App\Models\GradeSubmission;
use App\Models\NstpComponent;
use App\Models\NstpGradeSubmission;
use App\Models\NstpSection;
use App\Models\NstpSectionSchedule;
use App\Models\SchoolYear;
use App\Models\StudentAnswer;
use App\Models\StudentGrade;
use App\Models\StudentSubject;
use App\Models\StudentSubjectNstpSchedule;
use App\Models\Subject;
use App\Models\User;
use App\Models\YearSection;
use App\Models\YearSectionSubjects;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use ReturnTypeWillChange;

class ClassController extends Controller
{
    public function view()
    {
        $userRole = Auth::user()->user_role;

        $currentSchoolYear = SchoolYear::select('school_years.id', 'start_year', 'end_year', 'semester_id', 'semester_name')
            ->where('is_current', '=', 1)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->first();

        $schoolYears = SchoolYear::select('school_years.id', 'start_year', 'end_year', 'semester_id', 'semester_name', 'is_current',)
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->orderBy('school_years.start_date', 'DESC')
            ->orderBy('school_years.end_date', 'DESC')
            ->orderBy('school_years.semester_id', 'DESC')
            ->get();

        if ($userRole == 'program_head' || $userRole == 'faculty' || $userRole == 'evaluator' || $userRole == 'registrar') {
            return Inertia::render('InstructorClasses/ViewClasses', [
                'schoolYears' => $schoolYears,
            ]);
        } else if ($userRole == 'student') {
            return Inertia::render('StudentClasses/ViewClasses', [
                'currentSchoolYear' => $currentSchoolYear,
            ]);
        }
    }

    public function viewClass($id, Request $request)
    {
        $user = Auth::user();

        $yearSectionSubjects = YearSectionSubjects::whereRaw("SHA2(year_section_subjects.id, 256) = ?", [$id])
            // ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->first();

        if (!$yearSectionSubjects) {
            return Inertia::render('Errors/ErrorPage', [
                'status' => 404,
            ])->toResponse($request)->setStatusCode(404);
        }

        $courseSection = YearSection::join('course', 'course.id', '=', 'year_section.course_id')
            ->where('year_section.id', $yearSectionSubjects->year_section_id)
            ->first();

        if ($user->id != $yearSectionSubjects->faculty_id) {
            return Inertia::render('Errors/ErrorPage', [
                'status' => 403,
            ])->toResponse($request)->setStatusCode(403);
        }

        $subject = Subject::where('id', '=', $yearSectionSubjects->subject_id)->first();

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

        return Inertia::render('InstructorClasses/OpenClass', [
            'id' => $yearSectionSubjects->id,
            'subjectCode' => $subject->subject_code,
            'descriptiveTitle' => $subject->descriptive_title,
            'courseSection' => $courseSection->course_name_abbreviation . '-' . $courseSection->year_level_id . $courseSection->section,
            'gradeStatus' => $gradeStatus,
            'schoolYear' => $schoolYear,
        ]);
    }

    public function viewNstpClass($id, Request $request)
    {
        $user = Auth::user();

        $nstpSection = NstpSectionSchedule::whereRaw("SHA2(nstp_section_schedules.id, 256) = ?", [$id])
            ->first();

        if (!$nstpSection) {
            return Inertia::render('Errors/ErrorPage', [
                'status' => 404,
            ])->toResponse($request)->setStatusCode(404);
        }

        if ($user->id != $nstpSection->faculty_id) {
            return Inertia::render('Errors/ErrorPage', [
                'status' => 403,
            ])->toResponse($request)->setStatusCode(403);
        }

        $section = NstpSection::where('nstp_sections.id', '=', $nstpSection->nstp_section_id)
            ->with(['Component', 'schedule'])
            ->first();

        $gradeSubmissionStatus = NstpGradeSubmission::where('nstp_section_id', '=', $nstpSection->id)->first();

        if (!$gradeSubmissionStatus) {
            $gradeSubmissionStatus = NstpGradeSubmission::create([
                'nstp_section_id' => $nstpSection->id
            ]);
        }

        $faculty = User::where('users.id', '=', $section->schedule->faculty_id)
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->select('first_name', 'middle_name', 'last_name')
            ->first();

        $students = NstpSection::where('nstp_sections.id', '=', $nstpSection->id)
            ->select('users.id', 'user_id_no', 'first_name', 'middle_name', 'last_name', 'email_address', 'contact_number', 'gender', 'midterm_grade', 'final_grade')
            ->join('nstp_section_schedules', 'nstp_section_schedules.nstp_section_id', '=', 'nstp_sections.id')
            ->join('student_subject_nstp_schedule', 'student_subject_nstp_schedule.nstp_section_schedule_id', '=', 'nstp_section_schedules.id')
            ->join('student_subjects', 'student_subjects.id', '=', 'student_subject_nstp_schedule.student_subject_id')
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->leftJoin('user_information', 'user_information.user_id', '=', 'users.id')
            ->orderBy('last_name', 'ASC')
            ->get();

        $schoolYear = SchoolYear::where('school_years.id', '=', $section->school_year_id)
            ->select(
                'allow_upload_final',
                'allow_upload_midterm',
                'start_year',
                'end_year',
                'semester_name'
            )
            ->join('semesters', 'semesters.id', '=', 'school_years.semester_id')
            ->first();

        return Inertia::render('InstructorClasses/OpenNstpClass', [
            'id' => $nstpSection->id,
            'componentName' => $section->component->component_name,
            'sectionName' => $section->section,
            'gradeSubmissionStatus' => $gradeSubmissionStatus,
            'studentsList' => $students,
            'schoolYear' => $schoolYear,
            'faculty' => $faculty,
        ]);
    }

    public function nstpSectionGradeSubmissionStatus(int $id)
    {
        $gradeSubmissionStatus = NstpGradeSubmission::where('nstp_section_id', $id)->first();

        if (!$gradeSubmissionStatus) {
            $gradeSubmissionStatus = NstpGradeSubmission::create([
                'nstp_section_id' => $id,
            ]);
        }

        return response()->json($gradeSubmissionStatus);
    }

    public function nstpStudents($id)
    {
        return NstpSection::where('nstp_sections.id', '=', $id)
            ->select('users.id', 'user_id_no', 'first_name', 'middle_name', 'last_name', 'email_address', 'contact_number', 'gender', 'midterm_grade', 'final_grade')
            ->join('nstp_section_schedules', 'nstp_section_schedules.nstp_section_id', '=', 'nstp_sections.id')
            ->join('student_subject_nstp_schedule', 'student_subject_nstp_schedule.nstp_section_schedule_id', '=', 'nstp_section_schedules.id')
            ->join('student_subjects', 'student_subjects.id', '=', 'student_subject_nstp_schedule.student_subject_id')
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->leftJoin('user_information', 'user_information.user_id', '=', 'users.id')
            ->orderBy('last_name', 'ASC')
            ->get();
    }

    public function nstpGradeSubmissionDetails($id)
    {
        $gradeSubmissionStatus = NstpGradeSubmission::where('nstp_section_id', '=', $id)->first();

        if (!$gradeSubmissionStatus) {
            $gradeSubmissionStatus = NstpGradeSubmission::create([
                'nstp_section_id' => $id
            ]);
        }

        return response()->json($gradeSubmissionStatus);
    }

    public function nstpStudentsGrades($id)
    {
        return NstpSection::where('nstp_sections.id', '=', $id)
            ->select('student_subjects.id', 'user_id_no', 'first_name', 'middle_name', 'last_name', 'midterm_grade', 'final_grade')
            ->join('nstp_section_schedules', 'nstp_section_schedules.nstp_section_id', '=', 'nstp_sections.id')
            ->join('student_subject_nstp_schedule', 'student_subject_nstp_schedule.nstp_section_schedule_id', '=', 'nstp_section_schedules.id')
            ->join('student_subjects', 'student_subjects.id', '=', 'student_subject_nstp_schedule.student_subject_id')
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->leftJoin('user_information', 'user_information.user_id', '=', 'users.id')
            ->orderBy('last_name', 'ASC')
            ->get();
    }

    public function nstpStudentUpdateGrade($field, $id, Request $request)
    {
        $schoolYearSubmissionDetails = StudentSubjectNstpSchedule::where('student_subject_id', '=', $id)
            ->select('school_years.*')
            ->join('nstp_section_schedules', 'nstp_section_schedules.id', '=', 'student_subject_nstp_schedule.nstp_section_schedule_id')
            ->join('nstp_sections', 'nstp_sections.id', '=', 'student_subject_nstp_schedule.nstp_section_schedule_id')
            ->join('school_years', 'school_years.id', '=', 'nstp_sections.school_year_id')
            ->first();

        if ($field == 'midterm_grade') {
            if (!$schoolYearSubmissionDetails->allow_upload_midterm) {
                return response()->json([
                    'message' => 'Changing of midterm grade is not allowed.'
                ], 403);
            }
        } else if ($field == 'final_grade') {
            if (!$schoolYearSubmissionDetails->allow_upload_final) {
                return response()->json([
                    'message' => 'Changing of final grade is not allowed.'
                ], 403);
            }
        }

        $allowedFields = ['midterm_grade', 'final_grade'];

        if (!in_array($field, $allowedFields)) {
            abort(400, 'Invalid field');
        }

        $studentSubject = StudentSubject::findOrFail($id);

        $oldValue = $studentSubject->$field;
        $newValue = $request->$field;

        $studentSubject->update([
            $field => $newValue
        ]);

        $user = Auth::user();

        $fullName = $user->userInformation->first_name . ' ' .
            $user->userInformation->last_name;

        ActivityLog::create([
            'user_id' => Auth::id(),

            'action' => 'grade_updated',

            'subject_type' => StudentSubject::class,
            'subject_id' => $studentSubject->id,

            'description' => $fullName .
                " updated {$field} from {$oldValue} to {$newValue}",

            'properties' => [
                'field' => $field,
                'old_value' => $oldValue,
                'new_value' => $newValue,
                'student_subject_id' => $studentSubject->id,
            ],

            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }

    public function submitNstpStudentGrades($period, $nstpSectionId)
    {
        $gradeSubmission = NstpGradeSubmission::where('nstp_section_id', '=', $nstpSectionId)->first();

        if (!$gradeSubmission) {
            return response()->json([
                'message' => 'Grade submission record not found.',
            ], 404);
        }

        if ($period == 'midterm') {
            $gradeSubmission->update([
                'midterm_status' => 'submitted',
                'midterm_submitted_at' => now(),
                'midterm_rejection_message' => null,
            ]);
        } else if ($period == 'final') {
            $gradeSubmission->update([
                'final_status' => 'submitted',
                'final_submitted_at' => now(),
                'final_rejection_message' => null,
            ]);
        }
    }

    public function cancelSubmission($period, $nstpSectionId)
    {
        $gradeSubmission = NstpGradeSubmission::where('nstp_section_id', '=', $nstpSectionId)->first();

        if (!$gradeSubmission) {
            return response()->json([
                'message' => 'Grade submission record not found.',
            ], 404);
        }

        if ($period == 'midterm') {
            $gradeSubmission->update([
                'midterm_status' => 'draft',
                'midterm_submitted_at' => null,
                'midterm_rejection_message' => null,
            ]);
        } else if ($period == 'final') {
            $gradeSubmission->update([
                'final_status' => 'draft',
                'final_submitted_at' => null,
                'final_rejection_message' => null,
            ]);
        }
    }

    public function getStudents($id)
    {
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

    public function updateStudentsGrades($yearSectionSubjectsId, Request $request)
    {
        $schoolYearId = YearSectionSubjects::select('school_year_id')
            ->where('year_section_subjects.id', '=', $yearSectionSubjectsId)
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->first()->school_year_id;

        $schoolYear = SchoolYear::find($schoolYearId);

        $allowMidterm = $schoolYear->allow_upload_midterm;
        $allowFinal = $schoolYear->allow_upload_final;

        $data = $request->input('data', []);

        foreach ($data as $entry) {
            if (empty($entry['id_number'])) continue;

            $student = User::where('user_id_no', '=', $entry['id_number'])->first();

            if (!$student) continue;

            $updateData = [];

            if ($allowMidterm && isset($entry['midterm_grade'])) {
                $mGrade = $entry['midterm_grade'];
                if ($mGrade >= 1 && $mGrade <= 5) {
                    $updateData['student_subjects.midterm_grade'] = $mGrade;
                }
            }

            if ($allowFinal && isset($entry['final_grade'])) {
                $fGrade = $entry['final_grade'];
                if ($fGrade >= 1 && $fGrade <= 5) {
                    $updateData['student_subjects.final_grade'] = $fGrade;
                }
            }

            if (!empty($updateData)) {
                StudentSubject::join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
                    ->where('enrolled_students.student_id', '=', $student->id)
                    ->where('student_subjects.year_section_subjects_id', '=', $yearSectionSubjectsId)
                    ->update($updateData);
            }
        }

        return response()->json(['message' => 'Grades updated successfully.']);
    }

    public function updateStudentMidtermGrade($yearSectionSubjectsId, $studentId, Request $request)
    {
        $student = User::where('user_id_no', '=', $studentId)->first();

        StudentSubject::join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->where('student_id', '=', $student->id)
            ->where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'midterm_grade' => $request->midterm_grade
            ]);

        return response()->json(['message' => $request->midterm_grade]);
    }

    public function updateStudentFinalGrade($yearSectionSubjectsId, $studentId, Request $request)
    {
        $student = User::where('user_id_no', '=', $studentId)->first();

        StudentSubject::join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->where('student_id', '=', $student->id)
            ->where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'final_grade' => $request->final_grade
            ]);
    }

    public function submitGrade($yearSectionSubjectsId)
    {
        $noGrades = StudentSubject::where('year_section_subjects_id', $yearSectionSubjectsId)
            ->where(function ($query) {
                $query->whereNull('midterm_grade')
                    ->orWhereNull('final_grade');
            })->first();

        if ($noGrades) {
            return back()->withErrors([
                'grades' => 'Some students have missing grades.',
            ]);
        }

        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'submitted_at' => now(),
                'is_submitted' => 1,
                'is_rejected' => 0,
                'rejection_message' => null,
            ]);
    }

    public function cancelMidtermSubmission($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'midterm_status' => 'draft',
                'midterm_submitted_at' => null,
                'midterm_rejection_message' => null,
            ]);
    }

    public function cancelFinalSubmission($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'final_status' => 'draft',
                'final_submitted_at' => null,
                'final_rejection_message' => null,
            ]);
    }

    public function submitMidtermGrade($yearSectionSubjectsId)
    {
        $noGrades = StudentSubject::where('year_section_subjects_id', $yearSectionSubjectsId)
            ->where(function ($query) {
                $query->whereNull('midterm_grade');
            })->first();

        if ($noGrades) {
            return back()->withErrors([
                'grades' => 'Some students have missing grades.',
            ]);
        }

        GradeSubmission::where('year_section_subjects_id', $yearSectionSubjectsId)
            ->update([
                'midterm_status' => 'submitted',
                'midterm_submitted_at' => now(),
                'midterm_rejection_message' => null,
            ]);
    }

    public function submitFinalGrade($yearSectionSubjectsId)
    {
        $noGrades = StudentSubject::where('year_section_subjects_id', $yearSectionSubjectsId)
            ->where(function ($query) {
                $query->orWhereNull('final_grade');
            })->first();

        if ($noGrades) {
            return back()->withErrors([
                'grades' => 'Some students have missing grades.',
            ]);
        }

        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'final_status' => 'submitted',
                'final_submitted_at' => now(),
                'final_rejection_message' => null,
            ]);
    }

    public function submitNstpSectionGrade($yearSectionSubjectsId)
    {
        $noGrades = StudentSubject::where('year_section_subjects_id', $yearSectionSubjectsId)
            ->where(function ($query) {
                $query->orWhereNull('final_grade');
            })->first();

        if ($noGrades) {
            return back()->withErrors([
                'grades' => 'Some students have missing grades.',
            ]);
        }

        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'final_status' => 'submitted',
                'final_submitted_at' => now(),
                'final_rejection_message' => null,
            ]);
    }

    public function gradeSubmissionSettings($id)
    {
        return GradeSubmission::select(
            'id',
            'year_section_subjects_id',
            'midterm_status',
            'midterm_submitted_at',
            'midterm_verified_at',
            'midterm_rejection_message',
            'midterm_deployed_at',
            'final_status',
            'final_submitted_at',
            'final_verified_at',
            'final_rejection_message',
            'final_deployed_at',
        )
            ->where('year_section_subjects_id', '=', $id)->first();
    }

    public function cancelGrade($yearSectionSubjectsId)
    {
        GradeSubmission::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->update([
                'submitted_at' => null,
                'is_submitted' => 0,
            ]);
    }

    public function getFacultyClasses($schoolYearId)
    {
        $facultyId = Auth::user()->id;

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
            DB::raw('"yearSectionSubject" as class_type'),
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
            ->where('school_year_id', '=', $schoolYearId)
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

        $nstpSched = NstpSectionSchedule::select(
            'nstp_sections.id as nstp_section_id',
            'nstp_section_schedules.id',
            'day',
            'end_time',
            'faculty_id',
            'start_time',
            'room_id',
            'school_year_id',
            'section',
            'room_name',
            'component_name',
            DB::raw('null as secondary_schedule'),
            DB::raw('"nstp" as class_type'),
        )
            ->selectRaw(
                "SHA2(nstp_sections.id, 256) as hashed_nstp_sections_id"
            )
            ->join('nstp_sections', 'nstp_sections.id', '=', 'nstp_section_schedules.nstp_section_id')
            ->join('nstp_components', 'nstp_components.id', '=', 'nstp_sections.nstp_component_id')
            ->leftJoin('rooms', 'rooms.id', '=', 'nstp_section_schedules.room_id')
            ->where('faculty_id', '=', $facultyId)
            ->where('school_year_id', $schoolYearId)
            ->get();

        return response()->json(['yearSectionsSched' => $classes, 'nstpSched' => $nstpSched]);
    }

    public function getStudentClasses(Request $request)
    {
        $studentId = Auth::id();

        $enrolledStudent = EnrolledStudent::select('enrolled_students.id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->where('school_year_id', '=', $request->schoolYearId)
            ->where('student_id', '=', $studentId)
            ->first();

        if (!$enrolledStudent) {
            return response()->json([
                'error' => 'You are not currently enrolled in this school year.',
            ], 403);
        }

        $classes = YearSectionSubjects::where('enrolled_students_id', $enrolledStudent->id)
            ->join('student_subjects', 'year_section_subjects.id', '=', 'student_subjects.year_section_subjects_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('rooms', 'rooms.id', '=', 'year_section_subjects.room_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')

            // NSTP joins
            ->leftJoin('student_subject_nstp_schedule as nstp_schedule', 'nstp_schedule.student_subject_id', '=', 'student_subjects.id')
            ->leftJoin('nstp_section_schedules', 'nstp_section_schedules.id', '=', 'nstp_schedule.nstp_section_schedule_id')
            ->leftJoin('nstp_sections', 'nstp_sections.id', '=', 'nstp_section_schedules.nstp_section_id')
            ->leftJoin('nstp_components', 'nstp_components.id', '=', 'nstp_sections.nstp_component_id')
            ->leftJoin('rooms as nstp_rooms', 'nstp_rooms.id', '=', 'nstp_section_schedules.room_id')
            ->leftJoin('users as nstp_faculty', 'nstp_faculty.id', '=', 'nstp_section_schedules.faculty_id')
            ->leftJoin('user_information as nstp_faculty_information', 'nstp_faculty.id', '=', 'nstp_faculty_information.user_id')
            ->selectRaw('
                        nstp_schedule.id as nstp_student_schedule_id,
                        enrolled_students_id,
                        student_subjects.id as student_subject_id,
                        year_section_subjects.id,
                        descriptive_title,
                        subjects.type,
                        component_name,
                    
                        CASE 
                            WHEN subjects.type = "nstp" 
                                THEN nstp_faculty_information.first_name
                            ELSE user_information.first_name
                        END as first_name,
                    
                        CASE 
                            WHEN subjects.type = "nstp" 
                                THEN nstp_faculty_information.last_name
                            ELSE user_information.last_name
                        END as last_name,
                    
                        CASE 
                            WHEN subjects.type = "nstp" 
                                THEN nstp_faculty_information.middle_name
                            ELSE user_information.middle_name
                        END as middle_name,
                    
                        CASE 
                            WHEN subjects.type = "nstp" 
                                THEN COALESCE(nstp_rooms.room_name, rooms.room_name)
                            ELSE rooms.room_name
                        END as room_name,
                    
                        CASE 
                            WHEN subjects.type = "nstp" 
                                THEN COALESCE(nstp_section_schedules.start_time, year_section_subjects.start_time)
                            ELSE year_section_subjects.start_time
                        END as start_time,
                    
                        CASE 
                            WHEN subjects.type = "nstp" 
                                THEN COALESCE(nstp_section_schedules.end_time, year_section_subjects.end_time)
                            ELSE year_section_subjects.end_time
                        END as end_time,
                    
                        CASE 
                            WHEN subjects.type = "nstp" 
                                THEN COALESCE(nstp_section_schedules.day, year_section_subjects.day)
                            ELSE year_section_subjects.day
                        END as day
                    ')

            ->with(['SecondarySchedule' => function ($query) {
                $query->select(
                    'subject_secondary_schedule.id',
                    'year_section_subjects_id',
                    'faculty_id',
                    'room_id',
                    'day',
                    'start_time',
                    'end_time',
                    'rooms.room_name'
                )->leftJoin('rooms', 'rooms.id', '=', 'subject_secondary_schedule.room_id');
            }])
            ->get();

        return response()->json($classes);
    }

    public function getStudentEnrollmentRecord()
    {
        $student = Auth::user();

        $answers = StudentAnswer::where('student_id', '=', $student->id)
            ->select('student_id', 'student_subject_id')
            ->groupBy('student_id', 'student_subject_id')
            ->get();

        // Extract student_subject_ids into an array for easier checking
        $answeredSubjectIds = $answers->pluck('student_subject_id')->toArray();

        $record = EnrolledStudent::select(
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
            ->where('student_id', '=', $student->id)
            ->with([
                'Subjects' => function ($query) use ($answeredSubjectIds) {
                    $hasAnswers = !empty($answeredSubjectIds);
                    $idsString = $hasAnswers ? implode(',', array_map('intval', $answeredSubjectIds)) : '0';

                    $query->select([
                        'student_subjects.id',
                        'enrolled_students_id',
                        'user_information.first_name',
                        'user_information.last_name',
                        'user_information.middle_name',
                        'user_nstp_faculty_information.first_name as nstp_faculty_first_name',
                        'user_nstp_faculty_information.last_name as nstp_faculty_last_name',
                        'user_nstp_faculty_information.middle_name as nstp_faculty_middle_name',
                        'subject_code',
                        'descriptive_title',
                        'credit_units',

                        // MIDTERM GRADE (Kept exactly as you had it)
                        DB::raw("IF(
                                    (student_subjects.id IN (" . $idsString . ") AND (grade_submissions.is_deployed = 1 OR grade_submissions.midterm_status = 'deployed'))
                                    OR (year_section.school_year_id < 3)
                                    OR (LOWER(subjects.type) = 'nstp' AND nstp_grade_submissions.midterm_status = 'deployed'), 
                                    midterm_grade, 
                                    NULL
                                ) as midterm_grade"),

                        // FINAL GRADE (Kept exactly as you had it)
                        DB::raw("IF(
                                    (student_subjects.id IN (" . $idsString . ") AND (grade_submissions.is_deployed = 1 OR grade_submissions.final_status = 'deployed'))
                                    OR (year_section.school_year_id < 3)
                                    OR (LOWER(subjects.type) = 'nstp' AND nstp_grade_submissions.final_status = 'deployed'), 
                                    final_grade, 
                                    NULL
                                ) as final_grade"),

                        // NEW: Added a null 'grade' column so it matches the old record structure
                        DB::raw("NULL as grade"),

                        // EVALUATED STATUS
                        DB::raw("IF(
                                    student_subjects.id IN (" . $idsString . ")
                                    OR year_section.school_year_id < 3
                                    OR LOWER(subjects.type) = 'nstp', 
                                    1, 
                                    0
                                ) as evaluated"),

                        'remarks',
                        'student_subjects.year_section_subjects_id',
                    ])
                        ->join('year_section_subjects', 'year_section_subjects.id', '=', 'student_subjects.year_section_subjects_id')
                        ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
                        ->leftJoin('grade_submissions', 'year_section_subjects.id', '=', 'grade_submissions.year_section_subjects_id')
                        ->leftJoin('student_subject_nstp_schedule', 'student_subject_nstp_schedule.student_subject_id', '=', 'student_subjects.id')
                        ->leftJoin('nstp_section_schedules', 'nstp_section_schedules.id',   '=', 'student_subject_nstp_schedule.nstp_section_schedule_id')
                        ->leftJoin('nstp_sections', 'nstp_sections.id', '=', 'nstp_section_schedules.nstp_section_id')
                        ->leftJoin('nstp_grade_submissions', 'nstp_sections.id', '=', 'nstp_grade_submissions.nstp_section_id')
                        ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
                        ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
                        ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
                        ->leftJoin('users as user_nstp_faculty', 'user_nstp_faculty.id', '=', 'nstp_section_schedules.faculty_id')
                        ->leftJoin('user_information as user_nstp_faculty_information', 'user_nstp_faculty.id', '=', 'user_nstp_faculty_information.user_id')
                        ->get();
                }
            ])
            ->orderBy('id', 'DESC')
            ->get();

        $semesterWeights = [
            'First' => 1,
            '1st' => 1,
            'Second' => 2,
            '2nd' => 2,
            'Summer' => 3,
        ];

        $oldData = StudentGrade::where('id_no', $student->user_id_no)
            ->select('student_grades.*', 'units as credit_units')
            ->get()
            ->sort(function ($a, $b) use ($semesterWeights) {
                // Compare school year (latest first)
                $yearA = (int) explode('-', $a->school_year)[0];
                $yearB = (int) explode('-', $b->school_year)[0];

                $yearComparison = $yearB <=> $yearA;

                if ($yearComparison === 0) {
                    $semA = $semesterWeights[$a->semester] ?? 99;
                    $semB = $semesterWeights[$b->semester] ?? 99;

                    // Latest semester first: Summer > Second > First
                    return $semB <=> $semA;
                }

                return $yearComparison;
            })
            ->values();

        if ($record->isEmpty() && $oldData->isEmpty()) {
            return response()->json([
                'error' => 'You have no enrollment record.',
            ], 403);
        }

        // Group the old data by school year, semester, and year level
        $groupedOldData = $oldData->groupBy(function ($item) {
            return $item->school_year . '|' . $item->semester . '|' . $item->year_level;
        });

        $formattedOldData = [];

        // Loop through grouped data and format it
        foreach ($groupedOldData as $groupKey => $subjects) {
            $firstItem = $subjects->first();

            $years = explode('-', $firstItem->school_year);
            $startYear = isset($years[0]) ? (int)$years[0] : null;
            $endYear = isset($years[1]) ? (int)$years[1] : null;

            $formattedYearLevel = ucwords(strtolower($firstItem->year_level));
            if (!str_contains($formattedYearLevel, 'Year')) {
                $formattedYearLevel .= ' Year';
            }

            $formattedOldData[] = [
                'id' => 'old_' . $firstItem->id,
                'year_level_name' => $formattedYearLevel,
                'section' => 'N/A',
                'semester_name' => ucfirst(strtolower($firstItem->semester)),
                'start_year' => $startYear,
                'end_year' => $endYear,
                'subjects' => $subjects->map(function ($sub) use ($firstItem) {
                    return [
                        'id' => $sub->id,
                        'enrolled_students_id' => 'old_' . $firstItem->id,
                        'first_name' => null,
                        'last_name' => null,
                        'middle_name' => null,
                        'nstp_faculty_first_name' => null,
                        'nstp_faculty_last_name' => null,
                        'nstp_faculty_middle_name' => null,
                        'subject_code' => $sub->subject_code,
                        'descriptive_title' => $sub->subject,
                        'midterm_grade' => null, // Left null since old records don't have this
                        'final_grade' => null,   // Left null since old records don't have this
                        'grade' => $sub->grade,  // Added the grade specifically here
                        'evaluated' => 1,
                        'remarks' => null,
                        'year_section_subjects_id' => null,
                        'credit_units' => $sub->credit_units,
                    ];
                })->values()->toArray(),
            ];
        }

        // Merge the active records with the formatted old records
        $mergedRecords = array_merge($record->toArray(), $formattedOldData);

        $sortedCombinedData = collect($mergedRecords)->sort(function ($a, $b) {
            $semesterWeights = [
                'First' => 1,
                '1st' => 1,
                'Second' => 2,
                '2nd' => 2,
                'Summer' => 3,
            ];

            // Descending School Year
            $yearComparison = strcmp(
                $b['start_year'] . '-' . $b['end_year'],
                $a['start_year'] . '-' . $a['end_year']
            );

            if ($yearComparison === 0) {
                $semA = $semesterWeights[ucfirst(strtolower($a['semester_name']))] ?? 4;
                $semB = $semesterWeights[ucfirst(strtolower($b['semester_name']))] ?? 4;

                // Descending Semester
                return $semB <=> $semA;
            }

            return $yearComparison;
        })->values()->toArray();

        return response()->json(['record' => $sortedCombinedData], 200);
    }

    public function requestEditMidtermSubmission($yearSectionSubjectsId)
    {
        GradeEditRequest::create([
            'year_section_subjects_id' => $yearSectionSubjectsId,
            'period' => 'midterm',
            'status' => 'pending',
            'request_date' => now(),
        ]);
    }

    public function cancelRequestEditMidtermSubmission($requestId)
    {
        GradeEditRequest::where('id', $requestId)->delete();
    }

    public function requestEditFinalSubmission($yearSectionSubjectsId)
    {
        GradeEditRequest::create([
            'year_section_subjects_id' => $yearSectionSubjectsId,
            'period' => 'final',
            'status' => 'pending',
            'request_date' => now(),
        ]);
    }

    public function cancelRequestEditFinalSubmission($requestId)
    {
        GradeEditRequest::where('id', $requestId)->delete();
    }

    public function getGradeRequestStatus($yearSectionSubjectsId)
    {
        $midtermRequestStatus = GradeEditRequest::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->where('period', 'midterm')
            ->whereNot('status', '=', 'submitted')
            ->first();

        $finalRequestStatus = GradeEditRequest::where('year_section_subjects_id', '=', $yearSectionSubjectsId)
            ->where('period', 'final')
            ->whereNot('status', '=', 'submitted')
            ->first();

        return response()->json([
            'midtermRequestStatus' => $midtermRequestStatus,
            'finalRequestStatus' => $finalRequestStatus,
        ], 200);
    }

    public function downloadStudentsExcel($id)
    {
        $section = YearSectionSubjects::with('yearSection')->findOrFail($id)->yearSection;

        $students = YearSectionSubjects::query()
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('student_subjects', 'year_section_subjects.id', '=', 'student_subjects.year_section_subjects_id')
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->where('year_section_subjects.id', $id)
            ->select(
                'user_id_no',
                'last_name',
                'first_name',
                'middle_name',
                'email_address',
                'contact_number',
                'gender'
            )
            ->orderBy('last_name')
            ->orderBy('first_name')
            ->distinct()
            ->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        // Set headers
        $headers = ['ID Number', 'Name', 'Email', 'Contact Number', 'Gender'];
        $sheet->fromArray([$headers], null, 'A1');

        // Set column widths
        foreach (range('A', 'E') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        // Fill rows
        $row = 2;
        foreach ($students as $student) {
            // Ensure proper casing
            $lastName = Str::ucfirst(Str::lower($student->last_name));
            $firstName = Str::ucfirst(Str::lower($student->first_name));
            $middleInitial = $student->middle_name
                ? Str::upper(Str::substr($student->middle_name, 0, 1)) . '.'
                : '';

            $fullName = "{$lastName}, {$firstName} {$middleInitial}";

            $sheet->setCellValue("A{$row}", $student->user_id_no);
            $sheet->setCellValue("B{$row}", $fullName);
            $sheet->setCellValue("C{$row}", $student->email_address);
            $sheet->setCellValue("D{$row}", $student->contact_number);
            $sheet->setCellValue("E{$row}", $student->gender);
            $row++;
        }

        $filename = "Enrolled Students - {$section->year_level}{$section->section_name}.xlsx";

        $tempPath = tempnam(sys_get_temp_dir(), 'students_');
        $writer = new Xlsx($spreadsheet);
        $writer->save($tempPath);

        return response()->download($tempPath, $filename)->deleteFileAfterSend(true);
    }

    public function viewNstpEnrollment($component, $id, Request $request)
    {
        $studentId = Auth::id();

        $studentSubject = StudentSubject::where('student_subjects.id', '=', $id)
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->first();

        // Not found
        if (!$studentSubject) {
            return Inertia::render('Errors/ErrorPage', [
                'status' => 404,
                'message' => "The enrollment record you're looking for does not exist. Please check the URL or your records."
            ])->toResponse($request)->setStatusCode(404);
        }

        // Unauthorized access
        if ($studentId != $studentSubject->student_id) {
            return Inertia::render('Errors/ErrorPage', [
                'status' => 403,
                'message' => "Access denied. You don't have permission to view this enrollment."
            ])->toResponse($request)->setStatusCode(403);
        }

        $hasSchedule = StudentSubjectNstpSchedule::where('student_subject_id', '=', $id)->first();
        // Already enrolled
        // if ($hasSchedule) {
        //     return Inertia::render('Errors/ErrorPage', [
        //         'status' => 403,
        //         'message' => "Looks like you’re already part of this NSTP component . Enrollment complete !"
        //     ])->toResponse($request)->setStatusCode(404);
        // }

        $schoolYear = SchoolYear::where('id', '=', $studentSubject->school_year_id)
            ->with('semester')
            ->first();

        return Inertia::render('StudentClasses/NstpEnrollment', [
            'component' => $component,
            'studentSubjectId' => $id,
            'schoolYear' => $schoolYear,
            'enrolled' => $hasSchedule ? true : false,
        ]);
    }

    public function getComponentSections($component, $id, Request $request)
    {
        $componentId = NstpComponent::where('component_name', $component)->first()->id;

        $sections = NstpSection::where('nstp_component_id', $componentId)
            ->where('school_year_id', $request->schoolYearId)
            ->with([
                'schedule.instructor.InstructorInfo',
                'schedule.room',
            ])
            ->withCount('students')
            ->get();

        return response()->json($sections);
    }

    public function enroll(Request $request)
    {
        $nstpSectionSchedule = NstpSectionSchedule::where('nstp_section_schedules.id', '=', $request->nstpSectionScheduleId)
            ->join('nstp_sections', 'nstp_sections.id', '=', 'nstp_section_schedules.nstp_section_id')
            ->first();

        $sections = NstpSection::where('id', '=', $nstpSectionSchedule->nstp_section_id)
            ->with([
                'schedule.instructor.InstructorInfo',
                'schedule.room',
            ])
            ->withCount('students')
            ->first();

        if ($nstpSectionSchedule->max_students == $sections->students_count || $sections->students_count > $nstpSectionSchedule->max_students) {
            return response()->json(
                ['message' => 'The section is full'],
                409
            );
        }

        StudentSubjectNstpSchedule::create([
            'nstp_section_schedule_id' =>  $request->nstpSectionScheduleId,
            'student_subject_id' =>  $request->studentSubjectId,
        ]);

        return response()->json(
            ['message' => 'success'],
            202
        );
    }
}
