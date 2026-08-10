<?php

namespace App\Http\Controllers;

use App\Models\NstpSectionSchedule;
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

        // Remove faculties with no schedules
        $yearSectionSched = $yearSectionSched
            ->filter(fn($faculty) => $faculty->Schedules->isNotEmpty())
            ->values();

        return response()->json($yearSectionSched);
    }

    public function viewRoomSchedules()
    {
        return Inertia::render('Schedules/RoomSchedules');
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
}
