<?php

namespace App\Http\Controllers\NstpDirector;

use App\Http\Controllers\Controller;
use App\Models\EnrolledStudent;
use App\Models\NstpComponent;
use App\Models\NstpSection;
use App\Models\NstpSectionSchedule;
use App\Models\Room;
use App\Models\StudentSubjectNstpSchedule;
use App\Models\SubjectSecondarySchedule;
use App\Models\User;
use App\Models\YearSectionSubjects;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ComponentController extends Controller
{

    public function viewDashboard()
    {
        return Inertia::render('NstpDirector/Dashboard/Index');
    }

    public function getDashboardData(Request $request)
    {
        $schoolYearId = $request->schoolYearId;

        // 1. Component Stats (Optimized)
        $componentStats = DB::table('nstp_components as c')
            ->leftJoin('nstp_sections as s', function ($join) use ($schoolYearId) {
                $join->on('s.nstp_component_id', '=', 'c.id')
                    ->where('s.school_year_id', '=', $schoolYearId);
            })
            ->leftJoin('nstp_section_schedules as ss', 'ss.nstp_section_id', '=', 's.id')
            ->leftJoin('student_subject_nstp_schedule as sns', 'sns.nstp_section_schedule_id', '=', 'ss.id')
            ->groupBy('c.id', 'c.component_name')
            ->select(
                'c.component_name',
                DB::raw('COUNT(sns.id) as total_students'),
                DB::raw('COUNT(DISTINCT s.id) as total_sections')
            )
            ->get();

        // 2. Summary Stats (Combined into one query where possible)
        $facultyQuery = DB::table('nstp_section_schedules as ss')
            ->join('nstp_sections as s', 'ss.nstp_section_id', '=', 's.id')
            ->where('s.school_year_id', $schoolYearId)
            ->selectRaw("
            COUNT(CASE WHEN ss.faculty_id IS NOT NULL THEN 1 END) as assigned,
            COUNT(CASE WHEN ss.faculty_id IS NULL THEN 1 END) as unassigned
        ")
            ->first();

        $totalStudents = $componentStats->sum('total_students');
        $totalSections = $componentStats->sum('total_sections');

        // 3. Section Utilization
        $sectionUtilization = DB::table('nstp_sections as s')
            ->leftJoin('nstp_section_schedules as ss', 'ss.nstp_section_id', '=', 's.id')
            ->leftJoin('student_subject_nstp_schedule as sns', 'sns.nstp_section_schedule_id', '=', 'ss.id')
            ->join('nstp_components as c', 's.nstp_component_id', '=', 'c.id') // Join components here
            ->where('s.school_year_id', $schoolYearId)
            ->groupBy('s.id', 's.section', 's.max_students', 'c.component_name')
            ->select(
                's.section',
                's.max_students',
                'c.component_name', // Select this for filtering
                DB::raw('COUNT(sns.id) as enrolled')
            )
            ->get();

        // 4. Gender (Filtered by School Year)
        $genderStats = DB::table('student_subject_nstp_schedule as sns')
            ->join('nstp_section_schedules as ss', 'sns.nstp_section_schedule_id', '=', 'ss.id')
            ->join('nstp_sections as s', 'ss.nstp_section_id', '=', 's.id')
            ->join('nstp_components as c', 's.nstp_component_id', '=', 'c.id') // JOIN COMPONENTS
            ->join('student_subjects as subj', 'subj.id', '=', 'sns.student_subject_id')
            ->join('enrolled_students as es', 'es.id', '=', 'subj.enrolled_students_id')
            ->join('user_information as ui', 'ui.user_id', '=', 'es.student_id')
            ->where('s.school_year_id', $schoolYearId)
            ->groupBy('c.component_name', 'ui.gender') // GROUP BY BOTH
            ->select('c.component_name', 'ui.gender', DB::raw('COUNT(*) as total'))
            ->get();

        return response()->json([
            'summary' => [
                'totalStudents' => $totalStudents,
                'totalSections' => $totalSections,
                'assignedFaculty' => $facultyQuery->assigned ?? 0,
                'unassignedFaculty' => $facultyQuery->unassigned ?? 0,
            ],
            'components' => $componentStats,
            'sections' => $sectionUtilization,
            'gender' => $genderStats,
        ]);
    }
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
            ->with([
                'schedule.instructor.InstructorInfo',
                'schedule.room',
            ])
            ->withCount('students')
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

    public function viewSectionStudents($component, $section)
    {
        return Inertia::render('NstpDirector/ComponentSection/StudentList/Index', [
            'component' => $component,
            'section' => $section
        ]);
    }

    public function getSectionSudents($component, $section, Request $request)
    {
        $componentId = NstpComponent::where('component_name', $request->component)->value('id');

        $students = NstpSection::select('student_subject_nstp_schedule.id', 'user_id_no', 'first_name', 'middle_name', 'last_name', 'course_name_abbreviation', 'year_section.section', 'year_level_id')
            ->where('nstp_sections.section', $section)
            ->where('nstp_component_id', $componentId)
            ->where('nstp_sections.school_year_id', $request->schoolYearId)
            ->join('nstp_section_schedules', 'nstp_section_schedules.nstp_section_id', '=', 'nstp_sections.id')
            ->join('student_subject_nstp_schedule', 'nstp_section_schedules.id', '=', 'student_subject_nstp_schedule.nstp_section_schedule_id')
            ->join('student_subjects', 'student_subjects.id', '=', 'student_subject_nstp_schedule.student_subject_id')
            ->join('enrolled_students', 'enrolled_students.id', '=', 'student_subjects.enrolled_students_id')
            ->join('users', 'users.id', '=', 'enrolled_students.student_id')
            ->join('user_information', 'user_information.user_id', '=', 'users.id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->orderBy('last_name', 'asc')
            ->get();

        return response()->json($students);
    }

    public function removeSection(Request $request)
    {
        $request->validate([
            'id' => 'required|integer',
        ]);

        // Correct way: find() automatically looks at the 'id' column
        $section = NstpSection::find($request->id);

        if ($section) {
            // Delete related schedules first
            NstpSectionSchedule::where('nstp_section_id', $section->id)->delete();

            // Delete the section
            $section->delete();
        }
    }

    public function removeStudent(Request $request)
    {
        $request->validate([
            'id' => 'required|integer',
        ]);

        StudentSubjectNstpSchedule::where('id', $request->id)->delete();
    }

    public function moveStudent(Request $request)
    {
        $request->validate([
            'studentSubejctNstpSchedId' => 'required|integer',
            'nstpSectionSchedId' => 'required|integer',
        ]);

        StudentSubjectNstpSchedule::where('id', $request->studentSubejctNstpSchedId)->update([
            'nstp_section_schedule_id' => $request->nstpSectionSchedId
        ]);
    }

    public function changeSectionInfo(Request $request)
    {
        NstpSection::findOrFail($request->nstpSectionId)
            ->update([
                'max_students' => $request->maxStudent,
                'section' => $request->section
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

        $nstpSched = NstpSectionSchedule::select(
            'nstp_sections.id as nstp_section_id',
            'nstp_section_schedules.id',
            'component_name',
            'day',
            'end_time',
            'faculty_id',
            'room_id',
            'start_time',
            'room_name',
            'first_name',
            'middle_name',
            'last_name',
            'school_year_id',
            'section',
            DB::raw('3 as lecture_hours'),
            DB::raw('0 as laboratory_hours'),
            DB::raw('null as secondary_schedule'),
        )
            ->join('nstp_sections', 'nstp_sections.id', '=', 'nstp_section_schedules.nstp_section_id')
            ->join('nstp_components', 'nstp_components.id', '=', 'nstp_sections.nstp_component_id')
            ->leftJoin('rooms', 'rooms.id', '=', 'nstp_section_schedules.room_id')
            ->leftJoin('users', 'users.id', '=', 'nstp_section_schedules.faculty_id')
            ->leftJoin('user_information', 'users.id', '=', 'user_information.user_id')
            ->where('school_year_id', $request->schoolYearID)
            ->get();

        return response()->json(['yearSectionSubjectsSched' => $rooms, 'nstpSched' => $nstpSched]);
    }

    public function viewFacultiesSchedules()
    {
        return Inertia::render('NstpDirector/Schedules/Faculty/Index');
    }

    public function getFacultiesSchedules(Request $request)
    {
        $yearSectionSched = User::select('users.id', 'faculty_id', 'first_name', 'middle_name', 'last_name', 'active')
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
            DB::raw('3 as lecture_hours'),
            DB::raw('0 as laboratory_hours'),
            DB::raw('null as secondary_schedule'),
        )
            ->join('nstp_sections', 'nstp_sections.id', '=', 'nstp_section_schedules.nstp_section_id')
            ->join('nstp_components', 'nstp_components.id', '=', 'nstp_sections.nstp_component_id')
            ->leftJoin('rooms', 'rooms.id', '=', 'nstp_section_schedules.room_id')
            ->where('school_year_id', $request->schoolYearId)
            ->withCount([
                'studentSubjects as student_count'
            ])
            ->get();

        return response()->json(['yearSectionSubjectsSched' => $yearSectionSched, 'nstpSched' => $nstpSched]);
    }

    public function getAllComponentSections(Request $request)
    {
        return NstpSection::select(
            'nstp_sections.id',
            'nstp_component_id',
            'school_year_id',
            'section',
            'max_students',
            'component_name'
        )
            ->join('nstp_components', 'nstp_sections.nstp_component_id', '=', 'nstp_components.id')
            ->where('school_year_id', $request->schoolYearId)
            ->with('schedule')
            ->withCount('students')
            ->orderBy('nstp_component_id', 'asc')
            ->orderBy('section', 'asc')
            ->get();
    }

    public function getStudentsWithNstp(Request $request)
    {
        $schoolYearId = $request->schoolYearId;

        $student = User::select('id')
            ->orWhere('user_id_no', 'like', '%' . $request->studentId)
            ->first();

        // if student id not exist
        if (!$student) {
            return response()->json(['message' => 'No student found'], 400);
        }

        $studentInfo = User::where('users.id', $student->id)
            ->join('user_information', 'users.id', '=', 'user_information.user_id')
            ->select('users.id', 'user_id_no', 'user_information.first_name', 'user_information.middle_name', 'user_information.last_name')
            ->first();

        $enrolled = EnrolledStudent::where('school_year_id', $schoolYearId)
            ->where('student_id', $student->id)
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->first();

        if (!$enrolled) {
            return response()->json(['message' => $studentInfo->first_name . ' ' . $studentInfo->middle_name . ' ' . $studentInfo->last_name . ' is not enrolled.'], 400);
        }

        $enrolledStudent = EnrolledStudent::select('enrolled_students.id')
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->where('school_year_id', '=', $request->schoolYearId)
            ->where('student_id', '=', $student->id)
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

        $hasNstp = collect($classes)->contains('type', 'nstp');

        if (!$hasNstp) {
            return response()->json(['message' => $studentInfo->first_name . ' ' . $studentInfo->middle_name . ' ' . $studentInfo->last_name . ' has no NSTP subject.'], 400);
        }

        return response()->json([
            'message' => 'success',
            'studentInfo' => $studentInfo,
            'classes' => $classes
        ]);
    }

    public function enrollStudent(Request $request)
    {
        StudentSubjectNstpSchedule::create([
            'nstp_section_schedule_id' => $request->nstpSectionScheduleId,
            'student_subject_id' => $request->studentNstpSubjectId,
        ]);
    }
}
