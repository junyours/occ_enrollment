<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\AbsenceNotice;
use App\Services\ClassAnnouncements;
use App\Services\InstructorDashboard;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class InstructorDashboardController extends Controller
{
    /** Roles that teach classes. They land on this dashboard after signing in. */
    public const ROLES = ['faculty', 'evaluator', 'nstp_faculty', 'program_head'];

    public function view(Request $request, InstructorDashboard $dashboard)
    {
        return Inertia::render('InstructorDashboard/Dashboard', [
            'dashboard' => fn() => $dashboard->build($request->user()->id),
        ]);
    }

    /** The same dashboard for the mobile app, as JSON. */
    public function mobile(Request $request, InstructorDashboard $dashboard)
    {
        // The role middleware answers with a web page, so check here.
        abort_unless(in_array($request->user()->user_role, self::ROLES, true), 403, 'Only teachers have a dashboard.');

        return response()
            ->json($dashboard->build($request->user()->id))
            ->header('Cache-Control', 'private, no-store');
    }

    /**
     * Sends a student an in-app notice about their absences in a row, from
     * their teacher. Once per absence: sending again before the student
     * misses another meeting sends nothing.
     */
    public function notifyAbsences(Request $request, InstructorDashboard $dashboard, ClassAnnouncements $people, int $studentSubjectId)
    {
        $teacher = $request->user();
        abort_unless(in_array($teacher->user_role, self::ROLES, true), 403, 'Only teachers can send absence notices.');

        return DB::transaction(function () use ($teacher, $dashboard, $people, $studentSubjectId) {
            // One sender at a time per student, so a double click sends once.
            DB::table('student_subjects')->where('id', $studentSubjectId)->lockForUpdate()->first();

            $notice = $dashboard->absenceNotice($studentSubjectId);

            abort_unless($notice, 404, 'Student not found in this class.');
            abort_unless((string) $notice['teacher_id'] === (string) $teacher->id, 403, 'You are not assigned to this class.');
            abort_if($notice['dropped'], 422, 'This student has been dropped from the class.');
            abort_if(count($notice['dates']) < InstructorDashboard::WARN_AT, 422, 'This student no longer has absences in a row.');

            if ($notice['notified_at']) {
                return response()->json(['sent' => false, 'notified_at' => $notice['notified_at']]);
            }

            $student = User::find($notice['student_id']);
            abort_unless($student, 404, 'Student not found.');

            $student->notify(new AbsenceNotice(
                $studentSubjectId,
                $notice['class_id'],
                $notice['class_title'],
                $notice['section'],
                $notice['dates'],
                ['id' => (int) $teacher->id, 'name' => $people->personName($people->person((int) $teacher->id))],
            ));

            return response()->json(['sent' => true, 'notified_at' => now()->toIso8601String()]);
        });
    }
}
