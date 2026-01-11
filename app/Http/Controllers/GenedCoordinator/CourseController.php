<?php

namespace App\Http\Controllers\GenedCoordinator;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\Room;
use App\Models\SubjectSecondarySchedule;
use App\Models\User;
use App\Models\YearLevel;
use App\Models\YearSection;
use App\Models\YearSectionSubjects;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class CourseController extends Controller
{
    function viewSections($hashedCourseID, Request $request)
    {
        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseID)
            ->first();

        if (!$course) {
            return Inertia::render('Errors/ErrorPage', [
                'status' => 404,
                'message' => 'Course not found'
            ])->toResponse($request)->setStatusCode(403);
        }

        return Inertia::render('GenedCoordinator/CourseSection/Index', [
            'course' => $course,
            'hashedCourseID' => $hashedCourseID
        ]);
    }

    public function getSections($hashedCourseID, Request $request)
    {
        $course = DB::table('course')
            ->select('id')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseID)
            ->first();

        if (!$course) {
            return response()->json(['message' => 'course not found'], 404);
        }


        return YearLevel::select('year_level.id', 'year_level_name')
            ->with([
                'YearSection' => function ($query) use ($request, $course) {
                    $query->select(
                        'year_section.id',
                        'year_section.school_year_id',
                        'year_section.course_id',
                        'year_section.year_level_id',
                        'year_section.section',
                        'year_section.max_students'
                    )
                        ->where('school_year_id', '=', $request->schoolYearId)
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

    public function openClass($hashedCourseID, $yearlevel, Request $request)
    {
        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseID)
            ->first();

        $section = $request->query('section');

        $yearLevels = [
            'First-Year' => '1',
            'Second-Year' => '2',
            'Third-Year' => '3',
            'Fourth-Year' => '4'
        ];

        $yearLevelNumber = $yearLevels[$yearlevel] ?? '';

        if (!$course) {
            return Inertia::render('Errors/ErrorPage', [
                'status' => 404,
                'message' => 'Course not found'
            ])->toResponse($request)->setStatusCode(403);
        }

        return Inertia::render('GenedCoordinator/GenEdClassScheduling/Index', [
            'course' => $course,
            'yearlevel' => $yearLevelNumber,
            'section' => $section,
        ]);
    }

    public function getSubjects($hashedCourseID, $yearlevel, Request $request)
    {
        $course = DB::table('course')
            ->where(DB::raw('MD5(id)'), '=', $hashedCourseID)
            ->first();

        $section = $request->query('section');

        $yearLevels = [
            'First-Year' => '1',
            'Second-Year' => '2',
            'Third-Year' => '3',
            'Fourth-Year' => '4'
        ];

        $yearLevelNumber = $yearLevels[$yearlevel] ?? '';


        $yearSection = YearSection::where('school_year_id', '=', $request->schoolYearId)
            ->where('course_id', '=', $course->id)
            ->where('year_level_id', '=', $yearLevelNumber)
            ->where('section', '=', $section)
            ->first();

        $classes = YearSectionSubjects::where('year_section_id', $yearSection->id)
            ->with([
                'Instructor.InstructorInfo',
                'Room',
                'Subject',
                'SecondarySchedule.Room'
            ])
            ->get();

        return response()->json($classes);
    }

    public function getAllRooms()
    {
        $rooms = Room::all();

        return response()->json($rooms);
    }

    public function getAllInstructors()
    {
        $instructors = User::select('users.id', 'first_name', 'last_name', 'middle_name')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->join('faculty', 'users.id', '=', 'faculty.faculty_id')
            ->where('active', '=', 1)
            ->whereIn('users.user_role', ['faculty', 'program_head', 'registrar', 'evaluator'])
            ->orderBy('last_name', 'ASC')
            ->get();

        return response()->json($instructors);
    }

    public function getRoomSchedules(Request $request)
    {

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
            ->where('school_year_id', '=', $request->schoolYearID)
            ->where('room_id', '=', $request->roomID)
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
            ->where('school_year_id', '=', $request->schoolYearID)
            ->where('subject_secondary_schedule.room_id', '=', $request->roomID)
            ->join('year_section_subjects', 'year_section_subjects.id', '=', 'subject_secondary_schedule.year_section_subjects_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->get();

        return response()->json(['main' => $mainSched, 'second' => $secondSched]);
    }

    public function getInstructorSchedules(Request $request)
    {
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
            ->where('school_year_id', '=', $request->schoolYearID)
            ->where('faculty_id', '=', $request->instructorId)
            ->with('SecondarySchedule')
            ->join('year_section', 'year_section.id', '=', 'year_section_subjects.year_section_id')
            ->join('subjects', 'subjects.id', '=', 'year_section_subjects.subject_id')
            ->leftJoin('users', 'users.id', '=', 'year_section_subjects.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->get();

        return response()->json($instructor, 200);
    }

    public function updateClass(Request $request)
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
}
