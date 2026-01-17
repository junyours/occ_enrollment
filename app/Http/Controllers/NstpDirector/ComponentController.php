<?php

namespace App\Http\Controllers\NstpDirector;

use App\Http\Controllers\Controller;
use App\Models\NstpComponent;
use App\Models\NstpSection;
use App\Models\NstpSectionSchedule;
use App\Models\Room;
use App\Models\SubjectSecondarySchedule;
use App\Models\User;
use App\Models\YearSectionSubjects;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ComponentController extends Controller
{
    public function viewSections($component)
    {
        return Inertia::render('NstpDirector/ComponentSection/Index', [
            'component' => $component
        ]);
    }
    public function getSections($component, Request $request)
    {
        $componentId = NstpComponent::where('component_name', $component)->first()->id;

        $sections = NstpSection::where('nstp_component_id', $componentId)
            ->where('school_year_id', $request->schoolYearId)
            ->with(['schedule.instructor.InstructorInfo', 'schedule.room'])
            ->get();

        return response()->json($sections);
    }

    public function addSection($schoolYearId, Request $request)
    {
        $componentId = NstpComponent::where('component_name', $request->component)->value('id');

        $lastSection = NstpSection::where('nstp_component_id', $componentId)
            ->where('school_year_id', $schoolYearId)
            ->orderBy('section', 'desc')
            ->value('section');

        $nextSection = $lastSection
            ? chr(ord(strtoupper($lastSection)) + 1)
            : 'A';

        $nstpSection = NstpSection::create([
            'nstp_component_id' => $componentId,
            'school_year_id' => $request->schoolYearId,
            'section' => $nextSection,
            'max_students' => 50,
        ]);

        NstpSectionSchedule::create([
            'nstp_section_id' => $nstpSection->id,
            'day' => 'TBA',
            'start_time' => 'TBA',
            'end_time' => 'TBA',
        ]);
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

    public function updateSection(Request $request)
    {
        // Find the record by ID
        $class = NstpSectionSchedule::find($request->id);

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

        $nstpSched = NstpSectionSchedule::select(
            'nstp_section_schedules.id',
            'day',
            'end_time',
            'room_id',
            'start_time',
        )
            ->where('school_year_id', '=', $request->schoolYearID)
            ->where('room_id', '=', $request->roomID)
            ->join('nstp_sections', 'nstp_sections.id', '=', 'nstp_section_schedules.id')
            ->where('nstp_section_schedules.room_id', '=', $request->roomID)
            ->get();

        return response()->json(['main' => $mainSched, 'second' => $secondSched, 'nstp' => $nstpSched]);
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

        $nstpSched = NstpSectionSchedule::select(
            'nstp_section_schedules.id',
            'day',
            'end_time',
            'faculty_id',
            'start_time',
        )
            ->where('faculty_id', $request->instructorId)
            ->join('nstp_sections', 'nstp_sections.id', '=', 'nstp_section_schedules.id')
            ->where('school_year_id', $request->schoolYearID)
            ->get();

        return response()->json(['yearSectionSubjectsSched' => $instructor, 'nstpSched' => $nstpSched], 200);
    }

    public function viewRoomsSchedules()
    {
        return Inertia::render('NstpDirector/Schedules/Room/Index');
    }

    public function getRoomsSchedules(Request $request)
    {
        $rooms = Room::select('rooms.id', 'room_name')
            ->with([
                'Schedules' => function ($query) use ($request) {
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
                        ->where('school_year_id', '=', $request->schoolYearID);

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
                        ->where('school_year_id', '=', $request->schoolYearID);

                    // Combine primary and secondary schedules using union
                    $query->union($secondarySchedules);
                }
            ])
            ->orderBy('room_name', 'asc')
            ->get();

        return response()->json($rooms);
    }

    public function viewFacultiesSchedules()
    {
        return Inertia::render('NstpDirector/Schedules/Faculty/Index');
    }

    public function getFacultiesSchedules(Request $request)
    {
        return User::select('users.id', 'faculty_id', 'first_name', 'middle_name', 'last_name', 'active')
            ->with([
                'Schedules' => function ($query) use ($request) {
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
                        ->where('school_year_id', '=', $request->schoolYearId);
                }
            ])
            ->join('faculty', 'users.id', '=', 'faculty.faculty_id')
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->where('active', '=', 1)
            ->orderBy('last_name', 'asc')
            ->get();
    }
}
