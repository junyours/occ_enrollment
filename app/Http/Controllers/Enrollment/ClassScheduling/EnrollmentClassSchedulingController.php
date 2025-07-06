<?php

namespace App\Http\Controllers\Enrollment\ClassScheduling;

use App\Http\Controllers\Controller;
use App\Models\Faculty;
use App\Models\Room;
use App\Models\SchoolYear;
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

    public function getEnrollmentRoomSchedules(Request $request)
    {
        $user = Auth::user();
        $schoolYear = $this->getPreparingOrOngoingSchoolYear()['school_year'];

        // Primary Schedules (Main Schedule)
        $mainSched = YearSectionSubjects::select(
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
            ->where('school_year_id', '=', $schoolYear->id)
            ->where('room_id', '=', $request->room_id)
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->get();

        // Secondary Schedules
        $secondSched = SubjectSecondarySchedule::select(
            'subject_secondary_schedule.day',
            'descriptive_title',
            'subject_secondary_schedule.end_time',
            'year_section_subjects.faculty_id',
            'year_section_subjects.id',
            'subject_secondary_schedule.room_id',
            'subject_secondary_schedule.start_time',
            'subject_id',
            'year_section_id',
            'first_name',
            'middle_name',
            'last_name',
            'class_code',
            'school_year_id'
        )
            ->where('school_year_id', '=', $schoolYear->id)
            ->where('subject_secondary_schedule.room_id', '=', $request->room_id)
            ->join('year_section_subjects', 'year_section_subjects.id', '=', 'subject_secondary_schedule.year_section_subjects_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->get();

        // 🔹 Use concat() instead of merge() to ensure all schedules are kept
        $allSchedules = $mainSched->concat($secondSched);

        // Return as JSON
        return response()->json($allSchedules);
    }


    public function getEnrollmentFacultiesSchedules($schoolYearId, $departmentId)
    {
        return User::select('users.id', 'faculty_id', 'first_name', 'middle_name', 'last_name', 'active')
            ->with([
                'Schedules' => function ($query) use ($schoolYearId) {
                    $query->select('room_name', 'day', 'descriptive_title', 'end_time', 'faculty_id', 'year_section_subjects.id', 'room_id', 'start_time', 'subject_id', 'year_section_id', 'class_code', 'school_year_id')
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
            ->where('active', '=', 1)
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
                    $secondarySchedules = DB::table('subject_secondary_schedule')
                        ->select(
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
}
