<?php

namespace App\Http\Controllers;

use App\Models\NstpSectionSchedule;
use App\Models\Room;
use App\Models\SubjectSecondarySchedule;
use App\Models\User;
use App\Models\YearSectionSubjects;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ScheduleContoller extends Controller
{
    public function viewFacultySchedules()
    {
        return Inertia::render('Schedules/FacultySchedules');
    }

    function getFacultySchedules(Request $request)
    {
        $yearSectionSched = User::select(
            'users.id',
            'faculty_id',
            'first_name',
            'middle_name',
            'last_name',
            'faculty.active'
        )
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
                        ->join(
                            'subjects',
                            'subjects.id',
                            '=',
                            'year_section_subjects.subject_id'
                        )
                        ->leftJoin(
                            'rooms',
                            'rooms.id',
                            '=',
                            'year_section_subjects.room_id'
                        )
                        ->join(
                            'year_section',
                            'year_section.id',
                            '=',
                            'year_section_subjects.year_section_id'
                        )
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
                                    'end_time'
                                )
                                    ->leftJoin(
                                        'rooms',
                                        'rooms.id',
                                        '=',
                                        'subject_secondary_schedule.room_id'
                                    );
                            }
                        ])
                        ->withCount(
                            'SubjectEnrolledStudents as student_count'
                        )
                        ->where(
                            'school_year_id',
                            $request->schoolYearId
                        );
                }
            ])
            ->join(
                'faculty',
                'users.id',
                '=',
                'faculty.faculty_id'
            )
            ->join(
                'user_information',
                'users.id',
                '=',
                'user_information.user_id'
            )
            ->where('faculty.active', 1)
            ->orderBy('last_name', 'asc')
            ->get();

        $nstpSched = NstpSectionSchedule::select(
            'nstp_sections.id as nstp_section_id',
            'nstp_section_schedules.id',
            'day',
            'start_time',
            'end_time',
            'faculty_id',
            'room_id',
            'room_name',
            'school_year_id',

            // Normalize NSTP → regular schedule structure
            DB::raw("CONCAT('SECTION ', UPPER(section)) as class_code"),
            DB::raw("CONCAT('NSTP-', UPPER(component_name)) as descriptive_title"),

            DB::raw('3 as lecture_hours'),
            DB::raw('0 as laboratory_hours'),
            DB::raw('null as subject_id'),
            DB::raw('null as year_section_id'),
            DB::raw('null as secondary_schedule'),

            // Useful for React if you want to identify NSTP
            DB::raw("'nstp' as schedule_type")
        )
            ->join(
                'nstp_sections',
                'nstp_sections.id',
                '=',
                'nstp_section_schedules.nstp_section_id'
            )
            ->join(
                'nstp_components',
                'nstp_components.id',
                '=',
                'nstp_sections.nstp_component_id'
            )
            ->leftJoin(
                'rooms',
                'rooms.id',
                '=',
                'nstp_section_schedules.room_id'
            )
            ->where(
                'school_year_id',
                $request->schoolYearId
            )
            ->withCount([
                'studentSubjects as student_count'
            ])
            ->get();

        foreach ($nstpSched as $nstp) {
            $faculty = $yearSectionSched->firstWhere(
                'faculty_id',
                $nstp->faculty_id
            );

            if ($faculty) {
                $faculty->Schedules->push($nstp);
            }
        }

        return response()->json($yearSectionSched);
    }

    public function viewRoomSchedules()
    {
        return Inertia::render('Schedules/RoomSchedules');
    }

    public function getRoomSchedules(Request $request)
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
}
