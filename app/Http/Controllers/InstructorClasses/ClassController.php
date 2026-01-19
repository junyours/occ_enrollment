<?php

namespace App\Http\Controllers\InstructorClasses;

use App\Http\Controllers\Controller;
use App\Models\EnrolledStudent;
use App\Models\GradeEditRequest;
use App\Models\GradeSubmission;
use App\Models\NstpComponent;
use App\Models\NstpSection;
use App\Models\NstpSectionSchedule;
use App\Models\SchoolYear;
use App\Models\StudentAnswer;
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
        $validated = $request->validate([
            'data' => 'required|array',
            'data.*.id_number' => 'required|string',
            'data.*.midterm_grade' => 'nullable|numeric',
            'data.*.final_grade' => 'nullable|numeric',
        ]);

        $schoolYearId = YearSectionSubjects::select('school_year_id')
            ->where('year_section_subjects.id', '=', $yearSectionSubjectsId)
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->first()->school_year_id;

        $schoolYear = SchoolYear::find($schoolYearId);

        foreach ($validated['data'] as $entry) {
            $student = User::where('user_id_no', '=', $entry['id_number'])->first();

            StudentSubject::join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
                ->where('student_id', '=', $student->id)
                ->where('year_section_subjects_id', '=', $yearSectionSubjectsId)
                ->update([
                    'midterm_grade' => $schoolYear->allow_upload_midterm ? $entry['midterm_grade'] : null,
                    'final_grade' => $schoolYear->allow_upload_final ? $entry['final_grade'] : null,
                ]);
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

        $classes = YearSectionSubjects::where('enrolled_students_id', '=', $enrolledStudent->id)
            ->select(
                'enrolled_students_id',
                'student_subjects.id as student_subject_id',
                'year_section_subjects.id',
                'user_information.first_name',
                'user_information.last_name',
                'user_information.middle_name',
                'rooms.room_name',
                'type',
                'descriptive_title',
                'year_section_subjects.start_time',
                'year_section_subjects.end_time',
                'year_section_subjects.day',
                'subjects.type',
                'nstp_section_schedules.start_time as nstp_start_time',
                'nstp_section_schedules.end_time as nstp_end_time',
                'nstp_section_schedules.day as nstp_day',
                'nstp_rooms.room_name as nstp_room_name',
                'nstp_schedule.id as nstp_student_schedule_id',
                'nstp_faculty_information.first_name as nstp_faculty_first_name',
                'nstp_faculty_information.last_name as nstp_faculty_last_name',
                'nstp_faculty_information.middle_name as nstp_faculty_middle_name',
            )
            ->join('student_subjects', 'year_section_subjects.id', '=', 'student_subjects.year_section_subjects_id')
            ->leftJoin('subject_secondary_schedule', 'year_section_subjects.id', '=', 'subject_secondary_schedule.year_section_subjects_id')
            ->leftJoin('rooms', 'rooms.id', '=', 'year_section_subjects.room_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')

            ->leftJoin('student_subject_nstp_schedule as nstp_schedule', 'nstp_schedule.student_subject_id', '=', 'student_subjects.id')
            ->leftJoin('nstp_section_schedules', 'nstp_section_schedules.id', '=', 'nstp_schedule.nstp_section_schedule_id')
            ->leftJoin('rooms as nstp_rooms', 'nstp_rooms.id', '=', 'nstp_section_schedules.room_id')

            ->leftJoin('users as nstp_faculty', 'nstp_faculty.id', '=', 'nstp_section_schedules.faculty_id')
            ->leftJoin('user_information as nstp_faculty_information', 'nstp_faculty.id', '=', 'nstp_faculty_information.user_id')


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

    public function getStudentEnrollmentRecord()
    {
        $studentId = Auth::id();

        $answers = StudentAnswer::where('student_id', '=', $studentId)
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
            ->where('student_id', '=', $studentId)
            ->with([
                'Subjects' => function ($query) use ($answeredSubjectIds) {
                    // Handle empty array case
                    $hasAnswers = !empty($answeredSubjectIds);
                    $idsString = $hasAnswers ? implode(',', array_map('intval', $answeredSubjectIds)) : '0';

                    $query->select([
                        'student_subjects.id',
                        'enrolled_students_id',
                        'first_name',
                        'last_name',
                        'middle_name',
                        'subject_code',
                        'descriptive_title',
                        DB::raw("IF(
                (student_subjects.id IN (" . $idsString . ") 
                AND (grade_submissions.is_deployed = 1 OR grade_submissions.midterm_status = 'deployed'))
                OR (year_section.school_year_id < 3), 
                midterm_grade, 
                NULL
            ) as midterm_grade"),
                        DB::raw("IF(
                (student_subjects.id IN (" . $idsString . ") 
                AND (grade_submissions.is_deployed = 1 OR grade_submissions.final_status = 'deployed'))
                OR (year_section.school_year_id < 3), 
                final_grade, 
                NULL
            ) as final_grade"),
                        DB::raw("IF(
                student_subjects.id IN (" . $idsString . ")
                OR year_section.school_year_id < 3, 
                1, 
                0
            ) as evaluated"),
                        'remarks',
                        'student_subjects.year_section_subjects_id',
                    ])
                        ->join('year_section_subjects', 'year_section_subjects.id', '=', 'student_subjects.year_section_subjects_id')
                        ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
                        ->leftJoin('grade_submissions', 'year_section_subjects.id', '=', 'grade_submissions.year_section_subjects_id')
                        ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
                        ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
                        ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
                        ->get();
                }
            ])
            ->orderBy('id', 'DESC')
            ->get();

        if (!$record) {
            return response()->json([
                'error' => 'You have no enrollment record.',
            ], 403);
        }

        return response()->json(['record' => $record], 200);
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
