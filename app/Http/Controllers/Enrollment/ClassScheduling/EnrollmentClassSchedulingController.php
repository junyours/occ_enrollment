<?php

namespace App\Http\Controllers\Enrollment\ClassScheduling;

use App\Http\Controllers\Controller;
use App\Models\EnrolledStudent;
use App\Models\Faculty;
use App\Models\Room;
use App\Models\SchoolYear;
use App\Models\StudentGrade;
use App\Models\Subject;
use App\Models\SubjectSecondarySchedule;
use App\Models\User;
use App\Models\YearSection;
use App\Models\YearSectionSubjects;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Http\Request;

class EnrollmentClassSchedulingController extends Controller
{
    public function viewRoomSchedules()
    {
        $user = Auth::user();
        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];
        $departmentId = Faculty::where('faculty_id', '=', $user->id)->first()->department_id;

        return Inertia::render('Enrollment/ClassScheduling/RoomsSchedules', [
            'schoolYearId' => $schoolYear->id,
            'departmentId' => $departmentId,
        ]);
    }

    public function viewFacultySchedules()
    {
        $user = Auth::user();
        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];
        $departmentId = Faculty::where('faculty_id', '=', $user->id)->first()->department_id;

        return Inertia::render('Enrollment/ClassScheduling/FacultiesSchedules', [
            'schoolYearId' => $schoolYear->id,
            'departmentId' => $departmentId,
        ]);
    }

    public function viewSubjectSchedules()
    {
        $user = Auth::user();
        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];
        $departmentId = Faculty::where('faculty_id', '=', $user->id)->first()->department_id;

        return Inertia::render('Enrollment/ClassScheduling/SubjectsSchedules', [
            'schoolYearId' => $schoolYear->id,
            'departmentId' => $departmentId,
        ]);
    }

    public function enrollmentGetClasses(Request $request)
    {
        $classes = YearSectionSubjects::where('year_section_id', $request->yearSectionId)
            ->with([
                'Instructor.InstructorInfo',
                'Room',
                'Subject',
                'SecondarySchedule.Room'
            ])
            ->withCount('Students')
            ->get();

        return response()->json([
            'classes' => $classes
        ]);
    }

    public function enrollmentUpdateMainClass(Request $request)
    {
        // Find the record by ID
        $class = YearSectionSubjects::find($request->id);

        // Check if class exists
        if (!$class) {
            return response()->json(['message' => 'Class not found'], 404);
        }

        // Update the record
        $class->update([
            'day' => $request->day,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'room_id' => $request->room_id,
            'faculty_id' => $request->faculty_id,
        ]);
    }

    public function enrollmentUpdateSecondClass(Request $request)
    {
        $class = SubjectSecondarySchedule::find($request->id);
        // Check if class exists
        if (!$class) {
            return response()->json(['message' => 'Class not found'], 404);
        }

        // Update the record
        $class->update([
            'day' => $request->day,
            'start_time' => $request->start_time,
            'end_time' => $request->end_time,
            'room_id' => $request->room_id,
        ]);
    }

    public function getEnrollmentRoomsSchedules($schoolYearId, $departmentId)
    {
        $rooms = Room::select('rooms.id', 'room_name')
            ->where('department_id', '=', $departmentId)
            ->with([
                'Schedules' => function ($query) use ($schoolYearId) {
                    // Primary schedules query
                    $query->select(
                        'day',
                        'descriptive_title',
                        'end_time',
                        'year_section_subjects.faculty_id',
                        'year_section_subjects.id',
                        'room_id',
                        'start_time',
                        'subject_id',
                        'year_section_id',
                        'first_name',
                        'middle_name',
                        'last_name',
                        'class_code',
                        'school_year_id'
                    )
                        ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
                        ->leftjoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
                        ->leftjoin('user_information', 'users.id', '=', 'user_information.user_id')
                        ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
                        ->where('school_year_id', '=', $schoolYearId);

                    // Secondary schedules query
                    $secondarySchedules = DB::table('subject_secondary_schedule')
                        ->select(
                            'subject_secondary_schedule.day',
                            'descriptive_title',
                            'subject_secondary_schedule.end_time',
                            'year_section_subjects.faculty_id',
                            'year_section_subjects.id',
                            'subject_secondary_schedule.room_id', // Correct room_id for secondary schedules
                            'subject_secondary_schedule.start_time',
                            'subject_id',
                            'year_section_id',
                            'first_name',
                            'middle_name',
                            'last_name',
                            'class_code',
                            'school_year_id'
                        )
                        ->join('year_section_subjects', 'year_section_subjects.id', '=', 'subject_secondary_schedule.year_section_subjects_id') // Corrected join condition
                        ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
                        ->leftjoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
                        ->leftjoin('user_information', 'users.id', '=', 'user_information.user_id')
                        ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
                        ->where('school_year_id', '=', $schoolYearId);

                    // Combine primary and secondary schedules using union
                    $query->union($secondarySchedules);
                }
            ])
            ->orderBy('room_name', 'asc')
            ->get();

        return response()->json($rooms);
    }

    public function getEnrollmentRoomSchedules($roomId, $yearSectionId)
    {
        $schoolYearId = YearSection::find($yearSectionId)->school_year_id;

        // Primary Schedules (Main Schedule)
        $mainSched = YearSectionSubjects::select(
            'year_section_subjects.id',
            'day',
            'descriptive_title',
            'end_time',
            'year_section_subjects.faculty_id',
            'year_section_subjects.id',
            'room_id',
            'start_time',
            'subject_id',
            'year_section_id',
            'first_name',
            'middle_name',
            'last_name',
            'class_code',
            'school_year_id'
        )
            ->where('school_year_id', '=', $schoolYearId)
            ->where('room_id', '=', $roomId)
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->get();

        // Secondary Schedules
        $secondSched = SubjectSecondarySchedule::select(
            'subject_secondary_schedule.id',
            'subject_secondary_schedule.day',
            'subject_secondary_schedule.room_id',
            'subject_secondary_schedule.start_time',
            'subject_secondary_schedule.end_time',
            'subject_secondary_schedule.year_section_subjects_id',
            'year_section.school_year_id',
            'descriptive_title',
            'year_section_subjects.faculty_id',
            'subject_id',
            'year_section_id',
            'first_name',
            'middle_name',
            'last_name',
            'class_code',
        )
            ->where('school_year_id', '=', $schoolYearId)
            ->where('subject_secondary_schedule.room_id', '=', $roomId)
            ->join('year_section_subjects', 'year_section_subjects.id', '=', 'subject_secondary_schedule.year_section_subjects_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->get();

        return response()->json(['main' => $mainSched, 'second' => $secondSched]);
    }


    public function getEnrollmentFacultySchedules($instructorId, $yearSectionId)
    {
        $schoolYearId = YearSection::find($yearSectionId)->school_year_id;

        $instructor = YearSectionSubjects::select(
            'year_section_subjects.id',
            'day',
            'descriptive_title',
            'end_time',
            'year_section_subjects.faculty_id',
            'year_section_subjects.id',
            'room_id',
            'start_time',
            'subject_id',
            'year_section_id',
            'first_name',
            'middle_name',
            'last_name',
            'class_code',
            'school_year_id'
        )
            ->where('school_year_id', '=', $schoolYearId)
            ->where('faculty_id', '=', $instructorId)
            ->with('SecondarySchedule')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->get();

        return response()->json($instructor, 200);
    }

    public function getEnrollmentFacultiesSchedules($schoolYearId, $departmentId)
    {
        return User::select('users.id', 'faculty_id', 'first_name', 'middle_name', 'last_name', 'faculty.active')
            ->with([
                'Schedules' => function ($query) use ($schoolYearId) {
                    $query->select(
                        'room_name',
                        'day',
                        'descriptive_title',
                        'end_time',
                        'faculty_id',
                        'year_section_subjects.id',
                        'room_id',
                        'start_time',
                        'subject_id',
                        'year_section_id',
                        'class_code',
                        'school_year_id',
                        'lecture_hours',
                        'laboratory_hours',
                    )
                        ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
                        ->leftjoin('rooms', 'rooms.id', '=', 'year_section_subjects.room_id')
                        ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
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
                        ->withCount('SubjectEnrolledStudents as student_count')
                        ->where('school_year_id', '=', $schoolYearId);
                }
            ])
            ->join('faculty', 'users.id', '=', 'faculty.faculty_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->where('department_id', '=', $departmentId)
            ->where('faculty.active', '=', 1)
            ->orderBy('last_name', 'asc')
            ->get();
    }

    public function getEnrollmentSubjectsSchedules($schoolYearId, $departmentId)
    {
        $user = Auth::user();

        return Subject::select('subjects.id', 'subject_code', 'descriptive_title')
            ->with([
                'Schedules' => function ($query) use ($schoolYearId) {
                    $query->select(
                        'room_name',
                        'day',
                        'descriptive_title',
                        'end_time',
                        'faculty_id',
                        'year_section_subjects.id',
                        'room_id',
                        'start_time',
                        'subject_id',
                        'year_section_id',
                        'class_code',
                        'school_year_id',
                        'first_name',
                        'middle_name',
                        'last_name',
                    )
                        ->withCount('SubjectEnrolledStudents as student_count')
                        ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
                        ->leftJoin('rooms', 'rooms.id', '=', 'year_section_subjects.room_id')
                        ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
                        ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
                        ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
                        ->where('school_year_id', '=', $schoolYearId);

                    // Secondary schedules query
                    $secondarySchedules = SubjectSecondarySchedule::select(
                        'room_name',
                        'subject_secondary_schedule.day',
                        'descriptive_title',
                        'subject_secondary_schedule.end_time',
                        'year_section_subjects.faculty_id',
                        'year_section_subjects.id',
                        'subject_secondary_schedule.room_id',
                        'subject_secondary_schedule.start_time',
                        'subject_id',
                        'year_section_id',
                        'class_code',
                        'school_year_id',
                        'first_name',
                        'middle_name',
                        'last_name',
                        DB::raw('null as student_count') // pad student count
                    )
                        ->join('year_section_subjects', 'year_section_subjects.id', '=', 'subject_secondary_schedule.year_section_subjects_id') // Corrected join condition
                        ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
                        ->leftJoin('rooms', 'rooms.id', '=', 'subject_secondary_schedule.room_id')
                        ->leftjoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
                        ->leftjoin('user_information', 'users.id', '=', 'user_information.user_id')
                        ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
                        ->where('school_year_id', '=', $schoolYearId);

                    // Combine primary and secondary schedules using union
                    $query->union($secondarySchedules);
                }
            ])
            ->distinct()
            ->join('year_section_subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->where('course.department_id', '=', $departmentId)
            ->where('year_section.school_year_id', '=', $schoolYearId)
            ->orderBy('descriptive_title', 'asc')
            ->get();
    }

    public function getStudentType($id)
    {
        $student = EnrolledStudent::find($id);

        return response()->json($student->student_type_id);
    }

    public function setStudentType($id, Request $request)
    {
        EnrolledStudent::where('id', '=', $id)
            ->update(['student_type_id' => $request->studentTypeId]);
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

    public function viewStudentGrades()
    {
        return Inertia::render('Enrollment/StudentGrades',);
    }

    public function searchStudentGrades(Request $request)
    {
        $search = trim($request->id_no);

        $student = User::where('user_role', 'student')
            ->where('user_id_no', 'LIKE', "%{$search}%")->first();

        if (!$student) {
            return response()->json([]);
        }

        $info = User::where('id', $student->id)
            ->with([
                'Information' => function ($query) {
                    $query->select('id', 'user_id', 'first_name', 'middle_name', 'last_name', 'gender', 'birthday', 'civil_status', 'contact_number', 'present_address as address');
                },
                'Parent',
            ])
            ->select('id', 'user_id_no')
            ->first();

        // 1. Get and transform current enrollment records (Existing)
        $enrollmentRecord = EnrolledStudent::where('student_id', $student->id)
            ->with([
                'Subjects.YearSectionSubjects.Subject',
                'YearSection',
                'YearSection.SchoolYear.Semester',
                'YearSection.Course',
            ])
            ->select('enrolled_students.id', 'student_id', 'year_section_id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->whereNot('year_section.school_year_id', '=', 1)
            ->get();

        $transformedData = $enrollmentRecord->map(function ($record) {
            $schoolYear = $record->YearSection?->SchoolYear;
            $semesterName = $schoolYear?->Semester?->semester_name ?? 'N/A';
            $schoolYearString = $schoolYear ? "{$schoolYear->start_year}-{$schoolYear->end_year}" : 'N/A';
            $programName = $record->YearSection?->Course?->course_name ?? 'N/A';

            $subjects = $record->Subjects->map(function ($enrolledSubject) {
                $subjectDetails = $enrolledSubject->YearSectionSubjects?->Subject;
                $midterm = $enrolledSubject->midterm_grade;
                $final = $enrolledSubject->final_grade;

                $finalComputedGrade = computeFinalGrade($midterm, $final);

                return [
                    'subject_code'      => $subjectDetails?->subject_code,
                    'descriptive_title' => $subjectDetails?->descriptive_title,
                    'grade'             => $finalComputedGrade,
                    'credit_units'      => $subjectDetails?->credit_units,
                ];
            })->values()->toArray();

            return [
                'semester'   => $semesterName,
                'schoolyear' => $schoolYearString,
                'program'    => $programName,
                'school'     => 'Opol Community College',
                'subjects'   => $subjects,
            ];
        })->values()->toArray();

        // 2. Get and transform old grading records (Existing)
        $oldData = StudentGrade::where('id_no', $info->user_id_no)->get();

        $transformedOldData = $oldData->groupBy(function ($grade) {
            return $grade->school_year . '|' . $grade->semester . '|' . $grade->program;
        })->map(function ($group) {
            $firstItem = $group->first();
            $subjects = $group->map(function ($item) {
                return [
                    'subject_code'      => $item->subject_code,
                    'descriptive_title' => $item->subject,
                    'grade'             => $item->grade,
                    'credit_units'      => $item->units,
                ];
            })->values()->toArray();

            return [
                'semester'   => ucfirst($firstItem->semester),
                'schoolyear' => $firstItem->school_year,
                'program'    => $firstItem->program . ($firstItem->major ? " MAJOR IN {$firstItem->major}" : ''),
                'school'     => 'Opol Community College',
                'subjects'   => $subjects,
            ];
        })->values()->toArray();

        // 3. Get and transform the NEW Academic Records
        // Make sure to import App\Models\AcademicRecord at the top of your controller
        $academicRecords = \App\Models\AcademicRecord::where('student_id', $student->id)
            ->with('subjects') // Eager load the subjects relationship
            ->get();

        $transformedAcademicRecords = $academicRecords->map(function ($record) {
            // Format the semester to match existing outputs (e.g., 'First', 'Second', 'Summer')
            $formattedSemester = ucfirst($record->semester);

            $subjects = $record->subjects->map(function ($subject) {
                return [
                    'subject_code'      => $subject->subject_code,
                    'descriptive_title' => $subject->descriptive_title,
                    'grade'             => $subject->grade,
                    'credit_units'      => $subject->units, // Note: your schema called it 'units', but we output 'credit_units' to match the other arrays
                ];
            })->values()->toArray();

            return [
                'semester'   => $formattedSemester,
                'schoolyear' => $record->school_year,
                'program'    => $record->program . ($record->major ? " MAJOR IN {$record->major}" : ''),
                'school'     => $record->school_name,
                'subjects'   => $subjects,
            ];
        })->values()->toArray();


        // 4. Merge ALL data together: Old Data + Enrollment Data + Academic Records
        $combinedData = array_merge($transformedOldData, $transformedData, $transformedAcademicRecords);

        // 5. Sort chronologically by School Year, then by Semester
        $sortedCombinedData = collect($combinedData)->sort(function ($a, $b) {
            $semesterWeights = [
                'First'  => 3,
                '1st'    => 3,
                'Second' => 2,
                '2nd'    => 2,
                'Summer' => 1,
            ];

            // Descending School Year
            $yearComparison = strcmp($b['schoolyear'], $a['schoolyear']);

            // If same School Year, sort semesters ascending
            if ($yearComparison === 0) {
                $semA = $semesterWeights[ucfirst(strtolower($a['semester']))] ?? 4;
                $semB = $semesterWeights[ucfirst(strtolower($b['semester']))] ?? 4;

                return $semA <=> $semB;
            }

            return $yearComparison;
        })->values(); // Reset array keys after sorting

        return response()->json(['records' => $sortedCombinedData]);
    }

    public function searchSubjects(Request $request)
    {
        $subjects = YearSectionSubjects::where('school_year_id', $request->school_year_id)
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->select(
                'subject_code',
                'descriptive_title',
                'credit_units',
                'lecture_hours',
                'laboratory_hours',
            )
            ->groupBy(
                'subject_code',
                'descriptive_title',
                'credit_units',
                'lecture_hours',
                'laboratory_hours',
            )
            ->get();

        return response()->json($subjects);
    }
}
