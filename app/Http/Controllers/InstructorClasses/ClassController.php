<?php

namespace App\Http\Controllers\InstructorClasses;

use App\Http\Controllers\Controller;
use App\Models\EnrolledStudent;
use App\Models\GradeSubmission;
use App\Models\SchoolYear;
use App\Models\StudentSubject;
use App\Models\Subject;
use App\Models\User;
use App\Models\YearSection;
use App\Models\YearSectionSubjects;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

        $schoolYears = SchoolYear::select('school_years.id', 'start_year', 'end_year', 'semester_id', 'semester_name', 'is_current', )
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

        return Inertia::render('InstructorClasses/OpenClass', [
            'id' => $yearSectionSubjects->id,
            'subjectCode' => $subject->subject_code,
            'descriptiveTitle' => $subject->descriptive_title,
            'courseSection' => $courseSection->course_name_abbreviation . '-' . $courseSection->year_level_id . $courseSection->section,
            'gradeStatus' => $gradeStatus
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

        foreach ($validated['data'] as $entry) {
            $student = User::where('user_id_no', '=', $entry['id_number'])->first();

            StudentSubject::join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
                ->where('student_id', '=', $student->id)
                ->where('year_section_subjects_id', '=', $yearSectionSubjectsId)
                ->update([
                    'midterm_grade' => $entry['midterm_grade'],
                    'final_grade' => $entry['final_grade'],
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
            ]);
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

    public function recordView()
    {
        return Inertia::render('StudentClasses/EnrollmentRecord');
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
}
