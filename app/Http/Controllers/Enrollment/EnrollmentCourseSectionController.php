<?php

namespace App\Http\Controllers\Enrollment;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CurriculumTerm;
use App\Models\CurriculumTermSubject;
use App\Models\EnrolledStudent;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\SchoolYear;
use App\Models\Semester;
use App\Models\StudentSubject;
use App\Models\SubjectSecondarySchedule;
use App\Models\User;
use App\Models\UserInformation;
use App\Models\YearLevel;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use App\Models\YearSection;
use App\Models\YearSectionSubjects;
use Illuminate\Support\Facades\Redirect;
use function Symfony\Component\Clock\now;

class EnrollmentCourseSectionController extends Controller
{
    public function view($hashedCourseId)
    {
        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseId)
            ->first();

        if (!$course) {
            return Inertia::render('Enrollment/EnrollmentCourseSection', ['error' => true]);
        }

        return Inertia::render(
            'Enrollment/EnrollmentCourseSection',
            [
                'courseId' => $hashedCourseId,
                'course' => $course,
            ]
        );
    }

    public function addNewSection(Request $request)
    {
        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $request->course_id)
            ->first();

        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        $activeCurr = YearLevel::select(
            'year_level.year_level',
            'curriculum.id as curriculum_id'
        )
            ->leftJoin('curriculum_term', function ($join) {
                $join->on('curriculum_term.year_level_id', '=', 'year_level.id')
                    ->where('curriculum_term.active', 1);
            })
            ->leftJoin('curriculum', 'curriculum.id', '=', 'curriculum_term.curriculum_id')
            ->where('year_level.id', '=', $request->year_level_id)
            ->where(function ($query) use ($course) {
                $query->where('curriculum.course_id', '=', $course->id)
                    ->orWhereNull('curriculum.course_id');
            })
            ->first();

        // 🚨 If no curriculum is found, return an Inertia error response
        if (!$activeCurr || $activeCurr->curriculum_id === null) {
            return Redirect::back()->withErrors([
                'curriculum_id' => 'No active curriculum found for the selected year level.'
            ]);
        }

        $curriculumTerm = CurriculumTerm::where('semester_id', '=', $schoolYear->semester_id)
            ->where('curriculum_id', '=', $activeCurr->curriculum_id)
            ->where('active', '=', 1)
            ->where('year_level_id', '=', $request->year_level_id)
            ->first();

        // Get the semester name properly
        $semester = Semester::where('id', '=', $schoolYear->semester_id)->first();
        $semesterName = $semester ? $semester->semester_name . ' ' : ''; // Add space for readability

        // 🚨 If no curriculum is found, return an Inertia error response
        if (!$curriculumTerm) {
            return Redirect::back()->withErrors([
                'curriculum_id' => "Didn't find " . $semesterName . "semester with the active curriculum"
            ]);
        }

        $yearSection = YearSection::create([
            'school_year_id' => $schoolYear->id,
            'course_id' => $course->id,
            'year_level_id' => $request->year_level_id,
            'section' => $request->section,
            'max_students' => $request->max_students,
        ]);

        $subjects = CurriculumTermSubject::where('curriculum_term_id', '=', $curriculumTerm->id)->get();

        foreach ($subjects as $index => $subject) {
            YearSectionSubjects::create([
                'year_section_id' => $yearSection->id,
                'faculty_id' => null,
                'room_id' => null,
                'subject_id' => $subject->subject_id,
                'class_code' =>  $course->course_name_abbreviation . '-' . $request->year_level_id . $request->section,
                'day' => 'TBA',
                'start_time' => 'TBA',
                'end_time' => 'TBA',
            ]);
        }
    }

    public function getEnrollmentCourseSections($hashedCourseId)
    {
        $course = DB::table('course')
            ->select('id')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseId)
            ->first();

        if (!$course) {
            return Inertia::render('Enrollment/EnrollmentCourseSection', ['error' => true]);
        }

        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        return YearLevel::select('year_level.id', 'year_level_name')
            ->with([
                'YearSection' => function ($query) use ($schoolYear, $course) {
                    $query->select(
                        'year_section.id',
                        'year_section.school_year_id',
                        'year_section.course_id',
                        'year_section.year_level_id',
                        'year_section.section',
                        'year_section.max_students'
                    )
                        ->where('school_year_id', '=', $schoolYear->id)
                        ->where('course_id', '=', $course->id)
                        ->leftJoin('enrolled_students', 'year_section.id', '=', 'enrolled_students.year_section_id')
                        ->groupBy(
                            'year_section.id',
                            'year_section.school_year_id',
                            'year_section.course_id',
                            'year_section.year_level_id',
                            'year_section.section',
                            'year_section.max_students'
                        )
                        ->selectRaw('COUNT(enrolled_students.id) as student_count');
                }
            ])
            ->get();
    }

    public function viewClass($hashedCourseId, $yearlevel, Request $request)
    {
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

        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        $yearSection = YearSection::where('school_year_id', '=', $schoolYear->id)
            ->where('course_id', '=', $course->id)
            ->where('year_level_id', '=', $yearLevelNumber)
            ->where('section', '=', $section)
            ->first();

        return Inertia::render(
            'Enrollment/ClassScheduling/ClassScheduling',
            [
                'courseId' => $course->id,
                'yearlevel' => $yearLevelNumber,
                'section' => $section,
                'yearSectionId' =>  $yearSection->id,
                'courseName' => $course->course_name_abbreviation,
            ]
        );
    }

    public function studentInfo($schoolYearId, $studentID)
    {
        $studentId = User::select('id')
            ->orWhere('user_id_no', 'like', '%' . $studentID)
            ->first();

        if (!$studentId) {
            return response()->json(['message' => 'no student found'], 400);
        }

        $student = UserInformation::select('users.id', 'user_id_no', 'user_id', 'first_name', 'middle_name', 'last_name')
            ->join('users', 'users.id', '=', 'user_information.user_id')
            ->where('user_id', '=', $studentId->id)
            ->first();

        $enrolledAlready = false;

        $enrolled = EnrolledStudent::where('school_year_id', $schoolYearId)
            ->where('student_id', $student->id)
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->first();

        // if (EnrolledStudent::select('student_id', 'year_section_id', 'school_year_id')
        //     ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
        //     ->where('student_id', '=', $studentId)
        //     ->where('school_year_id', '=', $schoolYearId)
        //     ->exists()
        // ) {
        //     return response(['message' => 'student already enrolled']);
        // }
        if ($enrolled) {
            $enrolledAlready = true;
        }

        return response()->json([
            'student' => $student,
            'enrolled' => $enrolledAlready,
            'message' => 'success'
        ], 200);
    }

    public function viewStudents($hashedCourseId, $yearlevel, Request $request)
    {
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

        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        $yearSection = YearSection::where('school_year_id', '=', $schoolYear->id)
            ->where('course_id', '=', $course->id)
            ->where('year_level_id', '=', $yearLevelNumber)
            ->where('section', '=', $section)
            ->first();

        return Inertia::render('Enrollment/EnrolledStudentList', [
            'courseId' => $course->id,
            'yearlevel' => $yearLevelNumber,
            'section' => $section,
            'yearSectionId' =>  $yearSection->id,
            'courseName' => $course->course_name_abbreviation,
            'hashedCourseId' => $hashedCourseId,
        ]);
    }

    public function getEnrolledStudentList(Request $request)
    {
        $students = EnrolledStudent::select('enrolled_students.id', 'enrolled_students.student_id', 'first_name', 'middle_name', 'last_name', 'user_id_no', 'email_address')
            ->where('year_section_id', '=', $request->yearSectionId)
            ->join('users', 'enrolled_students.student_id', '=', 'users.id') // Join with the 'users' table
            ->join('user_information', 'users.id', '=', 'user_information.user_id') // Join with the 'user_informations' table
            ->orderBy('user_information.last_name', 'asc')
            ->get();

        return response()->json($students);
    }

    public function viewEnrollStudent($hashedCourseId, $yearlevel, Request $request)
    {
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

        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        $yearSection = YearSection::where('school_year_id', '=', $schoolYear->id)
            ->where('course_id', '=', $course->id)
            ->where('year_level_id', '=', $yearLevelNumber)
            ->where('section', '=', $section)
            ->first();

        return Inertia::render(
            'Enrollment/EnrollStudent',
            [
                'schoolYear' => $schoolYear,
                'courseId' => $course->id,
                'yearlevel' => $yearLevelNumber,
                'section' => $section,
                'yearSectionId' =>  $yearSection->id,
                'courseName' => $course->course_name_abbreviation,
            ]
        );
    }

    public function viewStudentSubjects($id, $yearlevel, Request $request)
    {

        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $id)
            ->first();

        if (!$course) {
            return Inertia::render('Errors/ErrorPage', [
                'status' => 404,
                'title' => 'URL Error',
                'message' => 'Did you change the URL? Please contact admin if not.',
            ])->toResponse($request)->setStatusCode(404);
        }

        $section = $request->query('section');

        $studentIdNo = $request->query('id-no');

        $student = User::select('first_name', 'last_name', 'middle_name', 'user_id_no')
            ->where('user_id_no', '=', $studentIdNo)
            ->join('user_information', 'users.id', 'user_information.user_id')
            ->first();

        if (!$student) {
            return Inertia::render('Errors/ErrorPage', [
                'status' => 404,
                'title' => 'Student Not Found',
                'message' => 'Did you change the URL? Please contact admin if not.',
            ])->toResponse($request)->setStatusCode(404);
        }

        $yearLevels = [
            'First-Year' => '1',
            'Second-Year' => '2',
            'Third-Year' => '3',
            'Fourth-Year' => '4'
        ];

        $yearLevelNumber = $yearLevels[$yearlevel] ?? '';

        return Inertia::render(
            'Enrollment/StudentSubjects',
            [
                'yearlevel' => $yearLevelNumber,
                'section' => $section,
                'schoolYear' => $schoolYear,
                'student' => $student,
                'courseName' => $course->course_name_abbreviation,
            ]
        );
    }

    public function viewStudentCor($courseId, $yearlevel, Request $request)
    {
        $section = $request->query('section');

        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $courseId)
            ->first();

        $studentIdNo = $request->query('id-no');

        return Inertia::render(
            'Enrollment/StudentCor',
            [
                'courseId' => $course->id,
                'section' => $section,
                'yearlevel' => $yearlevel,
                'studentIdNo' => $studentIdNo,
            ]
        );
    }

    public function getStudentEnrollmentInfo($courseId, $section, $yearlevel, $studentIdNo)
    {
        $yearLevels = [
            'First-Year' => '1',
            'Second-Year' => '2',
            'Third-Year' => '3',
            'Fourth-Year' => '4'
        ];

        $yearLevelNumber = $yearLevels[$yearlevel] ?? '';

        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        $yearSectionId = YearSection::where('course_id', '=', $courseId)
            ->where('year_level_id', '=', $yearLevelNumber)
            ->where('school_year_id', '=', $schoolYear->id)
            ->where('section', '=', $section)
            ->first()->id;

        $studentId = User::where('user_id_no', '=', $studentIdNo)->first()->id;

        $studentInfo = EnrolledStudent::where('year_section_id', '=', $yearSectionId)
            ->with(
                'Evaluator.EvaluatorInformation',
                'StudentType',
                'YearSection.Course',
                'YearSection.YearLevel',
                'YearSection.SchoolYear.Semester',
                'StudentSubject.YearSectionSubjects.Subject',
                'StudentSubject.YearSectionSubjects.Instructor.InstructorInformation',
                'StudentSubject.YearSectionSubjects.Room',
                'StudentSubject.YearSectionSubjects.SubjectSecondarySchedule.Room',
                'Student.StudentInformation'
            )
            ->where('student_id', '=', $studentId)
            ->first();

        return response()->json($studentInfo, 200);
    }

    public function getStudentSubjects(Request $request)
    {
        $student = User::where('user_id_no', '=', $request->studentId)
            ->first();

        if (!$student) {
            return Inertia::render('Errors/ErrorPage', [
                'status' => 404,
                'title' => 'Student Not Found',
                'message' => 'Did you change the URL? Please contact admin if not.',
            ])->toResponse($request)->setStatusCode(404);
        }

        $enrolledStudent = EnrolledStudent::select(('enrolled_students.id'))
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->where('school_year_id', '=', $request->schoolYearId)
            ->where('student_id', '=', $student->id)
            ->first();

        $classes = YearSectionSubjects::select(
            'year_section_subjects.id',
            'student_subjects.id as student_subject_id',
            'subject_code',
            'descriptive_title',
            'day',
            'start_time',
            'end_time',
            'credit_units'
        )
            ->where("enrolled_students_id", '=',  $enrolledStudent->id)
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('student_subjects', 'year_section_subjects.id', '=', 'student_subjects.year_section_subjects_id')
            ->with('SecondarySchedule')
            ->get();

        return response()->json($classes);
    }

    public function subjectClasses(Request $request)
    {
        $request->validate([
            'subjectCode' => 'required|string',
            'schoolYearId' => 'required|integer',
        ]);

        $subjects = YearSectionSubjects::select('year_section_subjects.id', 'class_code', 'subject_code', 'descriptive_title', 'day', 'start_time', 'end_time', 'credit_units')
            ->where('subject_code', $request->subjectCode)
            ->where('school_year_id', $request->schoolYearId)
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->with('SecondarySchedule')
            ->get();

        if ($subjects->isEmpty()) {
            return response()->json(['message' => 'no classes found'], 404);
        }

        return response()->json($subjects, 200);
    }

    public function addSubject($schoolyearId, $studentId, $classId)
    {

        $student = User::where('user_id_no', '=', $studentId)
            ->first();

        $enrolledStudent = EnrolledStudent::select('enrolled_students.id')
            ->where('student_id', '=', $student->id)
            ->where('school_year_id', '=', $schoolyearId)
            ->join('year_section', 'year_section.id', 'enrolled_students.year_section_id')
            ->first();

        $addedClass = StudentSubject::create([
            'enrolled_students_id' => $enrolledStudent->id,
            'year_section_subjects_id' => $classId,
        ]);

        $class = YearSectionSubjects::select(
            'year_section_subjects.id',
            'student_subjects.id as student_subject_id',
            'subject_code',
            'descriptive_title',
            'day',
            'start_time',
            'end_time',
            'credit_units'
        )
            ->where("student_subjects.id", '=',  $addedClass->id)
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('student_subjects', 'year_section_subjects.id', '=', 'student_subjects.year_section_subjects_id')
            ->with('SecondarySchedule')
            ->get();

        return response()->json([
            'message' => 'success',
            'class' => $class,
        ], 200);
    }

    public function deleteSubject($studentSubjectId)
    {
        StudentSubject::where('id', '=', $studentSubjectId)
            ->delete();

        return response()->json(['message' => 'success'], 200);
    }

    public function deleteMainSchedule($id)
    {
        StudentSubject::where('year_section_subjects_id', '=', $id)->delete();
        YearSectionSubjects::where('id', '=', $id)
            ->delete();

        return response()->json(['message' => 'success'], 200);
    }

    public function deleteSecondSchedule($id)
    {
        SubjectSecondarySchedule::where('id', '=', $id)
            ->delete();

        return response()->json(['message' => 'success'], 200);
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

        $schoolYear = null;
        $status = null;
        $preparation = false;

        // Determine the status and set the school year accordingly
        if ($enrollmentOngoing) {
            // If enrollment is ongoing, set preparation to false
            $status = 'ongoing';
            $schoolYear = $enrollmentOngoing;
            $preparation = false;
        } elseif ($enrollmentPreparation) {
            // If enrollment is in preparation, set status to preparing
            $status = 'preparing';
            $schoolYear = $enrollmentPreparation;
            $preparation = true;
        } else {
            // No enrollment preparation or ongoing, set status to false
            $status = false;
        }

        // Return status, preparation, and school year
        return [
            'status' => $status,
            'preparation' => $preparation,
            'school_year' => $schoolYear
        ];
    }

    public function enrollStudent($studID, $yearSectionID, $typeID, $startDate, Request $request)
    {
        $studentInfo = UserInformation::select('first_name', 'middle_name', 'last_name')
            ->where('id', '=', $studID)
            ->first();

        $firstInitial = $studentInfo->first_name[0] ?? '';
        $middleInitial = $studentInfo->middle_name[0] ?? '';
        $lastInitial = $studentInfo->last_name[0] ?? '';
        $yearLastTwoDigits = substr($startDate, 2, 2);

        $regNo = $firstInitial . $middleInitial . $lastInitial . $yearLastTwoDigits . rand(100, 999);

        $evaluatorId = $request->user()->id;

        $enrolledStudent = EnrolledStudent::create([
            'student_id' => $studID,
            'year_section_id' => $yearSectionID,
            'enroll_type' => 'on-time',
            'student_type_id' => $typeID,
            'evaluator_id' => $evaluatorId,
            'registration_number' => $regNo,
            'date_enrolled' => now()
        ]);

        foreach ($request->classID as $subjectID) {
            StudentSubject::create([
                'enrolled_students_id' => $enrolledStudent->id,
                'year_section_subjects_id' => $subjectID,
            ]);
        }

        $yearSection = YearSection::where('id', '=', $yearSectionID)->first();

        $course = Course::addSelect(DB::raw("MD5(course.id) as hashed_course_id"))
            ->where('id', '=', $yearSection->course_id)
            ->first();

        $yearLevel = str_replace(' ', '-', YearLevel::where('year_level', '=', $yearSection->year_level_id)->first()->year_level_name);

        $studIdNo = User::where('id', '=', $studID)->first()->user_id_no;

        return response()->json([
            'message' => 'success',
            'redirect' => "/enrollment/{$course->hashed_course_id}/students/{$yearLevel}/cor?id-no={$studIdNo}&section=" . urlencode($yearSection->section),
        ]);
    }

    public function unenroll($id)
    {
        StudentSubject::where('enrolled_students_id', '=', $id)->delete();
        EnrolledStudent::where('id', '=', $id)->delete();

        return back()->with('message', 'Student unenrolled successfully.');
    }

    public function getSections($yearSectionId)
    {
        $yearSection = YearSection::where('id', '=', $yearSectionId)->first();

        return YearSection::select('id', 'year_level_id', 'section')
            ->where('course_id', '=', $yearSection->course_id)
            ->where('school_year_id', '=', $yearSection->school_year_id)
            ->orderBy('year_level_id', 'ASC')
            ->orderBy('section', 'ASC')
            ->get();
    }

    // Option 1: Only enroll in subjects that match between old and new sections
    public function moveStudent($enrolledStudentId, $newYearSectionId)
    {
        try {
            DB::beginTransaction();

            // 1. Get the student's current year section
            $enrolledStudent = EnrolledStudent::findOrFail($enrolledStudentId);
            $currentYearSectionId = $enrolledStudent->year_section_id;

            // 2. Get ALL student's current subjects
            $allStudentSubjects = StudentSubject::with('yearSectionSubjects')
                ->where('enrolled_students_id', '=', $enrolledStudentId)
                ->get();

            // 3. Separate subjects by section
            $subjectsFromCurrentSection = $allStudentSubjects->where('yearSectionSubjects.year_section_id', $currentYearSectionId);
            $subjectsFromOtherSections = $allStudentSubjects->where('yearSectionSubjects.year_section_id', '!=', $currentYearSectionId);

            // 4. Get subject IDs from current section only
            $currentSectionSubjectIds = $subjectsFromCurrentSection->pluck('yearSectionSubjects.subject_id')->toArray();

            // 5. Get available subjects in the new section
            $newSectionSubjects = YearSectionSubjects::where('year_section_id', '=', $newYearSectionId)->get();
            $newSectionSubjectIds = $newSectionSubjects->pluck('subject_id')->toArray();

            // 6. Find matching subjects between current section and new section
            $matchingSubjectIds = array_intersect($currentSectionSubjectIds, $newSectionSubjectIds);
            $matchingNewSectionSubjects = $newSectionSubjects->whereIn('subject_id', $matchingSubjectIds);

            // 7. Create grades map for preservation (only from current section subjects)
            $subjectGrades = [];
            foreach ($subjectsFromCurrentSection as $studentSubject) {
                $subjectId = $studentSubject->yearSectionSubjects->subject_id;
                $subjectGrades[$subjectId] = [
                    'dropped' => $studentSubject->dropped,
                    'midterm_grade' => $studentSubject->midterm_grade,
                    'final_grade' => $studentSubject->final_grade,
                    'remarks' => $studentSubject->remarks,
                ];
            }

            // 8. Update student's year section
            $enrolledStudent->update(['year_section_id' => $newYearSectionId]);

            // 9. Remove ONLY subjects from the current section (keep subjects from other sections)
            StudentSubject::where('enrolled_students_id', '=', $enrolledStudentId)
                ->whereHas('yearSectionSubjects', function ($query) use ($currentYearSectionId) {
                    $query->where('year_section_id', $currentYearSectionId);
                })
                ->delete();

            // 10. Enroll student in matching subjects from new section
            foreach ($matchingNewSectionSubjects as $yearSectionSubject) {
                $subjectId = $yearSectionSubject->subject_id;
                $preservedGrades = $subjectGrades[$subjectId];

                StudentSubject::create([
                    'enrolled_students_id' => $enrolledStudentId,
                    'year_section_subjects_id' => $yearSectionSubject->id,
                    'dropped' => $preservedGrades['dropped'],
                    'midterm_grade' => $preservedGrades['midterm_grade'],
                    'final_grade' => $preservedGrades['final_grade'],
                    'remarks' => $preservedGrades['remarks'],
                ]);
            }

            DB::commit();

            // Calculate what happened
            $currentSectionSubjectsNotMoved = array_diff($currentSectionSubjectIds, $matchingSubjectIds);

            return response()->json([
                'message' => 'success'
            ], 200);
        } catch (\Exception $e) {
            DB::rollback();

            return response()->json([
                'message' => 'Failed to move student',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
