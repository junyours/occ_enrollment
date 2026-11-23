<?php

namespace App\Services;

use App\Models\SchoolYear;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Who may enter, submit or unsubmit a class's grades for a period, and
 * when. Only the class's own teacher, and:
 * - grades can be entered while the period's upload is open;
 * - they can be submitted once it has opened, even after it closes (the
 *   registrar sees those as late);
 * - a submission can be withdrawn while upload is open;
 * - grades the registrar sent back (rejected) can be fixed and resubmitted
 *   at any time.
 */
class GradeUploadGate
{
    /** A regular class: its teacher, school year and submission statuses. */
    public function regularClass(int $classId): ?array
    {
        $row = DB::table('year_section_subjects as ys')
            ->join('year_section as sec', 'sec.id', '=', 'ys.year_section_id')
            ->leftJoin('grade_submissions as gs', 'gs.year_section_subjects_id', '=', 'ys.id')
            ->where('ys.id', $classId)
            ->first(['ys.faculty_id', 'sec.school_year_id', 'gs.midterm_status', 'gs.final_status']);

        return $row ? $this->context($row) : null;
    }

    /**
     * An NSTP class, by its schedule id. NSTP grading keys its submission
     * row by the schedule's id (see ClassController::viewNstpClass).
     */
    public function nstpSchedule(int $scheduleId): ?array
    {
        $row = DB::table('nstp_section_schedules as nss')
            ->join('nstp_sections as ns', 'ns.id', '=', 'nss.nstp_section_id')
            ->leftJoin('nstp_grade_submissions as gs', 'gs.nstp_section_id', '=', 'nss.id')
            ->where('nss.id', $scheduleId)
            ->first(['nss.faculty_id', 'ns.school_year_id', 'gs.midterm_status', 'gs.final_status']);

        return $row ? $this->context($row) : null;
    }

    /** The NSTP class a student's subject record belongs to. */
    public function nstpStudent(int $studentSubjectId): ?array
    {
        $scheduleId = DB::table('student_subject_nstp_schedule')
            ->where('student_subject_id', $studentSubjectId)
            ->value('nstp_section_schedule_id');

        return $scheduleId ? $this->nstpSchedule((int) $scheduleId) : null;
    }

    /** Stops anyone but the class's teacher. */
    public function assertTeacher(?array $context, ?object $user): void
    {
        abort_unless($context, 404, 'Class not found.');
        abort_unless(
            $user && (string) $context['teacher_id'] === (string) $user->id,
            403,
            'You are not assigned to this class.'
        );
    }

    /**
     * What the teacher can do with one period's grades right now, plus the
     * upload's status and times, for the grades page.
     */
    public function permissions(array $context, string $period, ?CarbonInterface $now = null): array
    {
        $schoolYear = $context['school_year'];
        $window = $schoolYear ? $schoolYear->gradeUploadStatus($period, $now) : 'not_set';
        $times = $schoolYear ? $schoolYear->gradeUploadWindows($now)[$period] : ['opens_at' => null, 'closes_at' => null];
        $rejected = $context['statuses'][$period] === 'rejected';

        return [
            'status' => $window,
            'opens_at' => $times['opens_at'],
            'closes_at' => $times['closes_at'],
            'can_edit' => $window === 'open' || $rejected,
            'can_submit' => in_array($window, ['open', 'closed'], true) || $rejected,
            'can_cancel' => $window === 'open',
            // A draft submitted now would be after the closing time.
            'late' => $window === 'closed' && $context['statuses'][$period] === 'draft',
        ];
    }

    /**
     * Adds to a grades page's school year what the teacher can do with each
     * period now (grade_upload), and allow_upload_* for the grade sheet and
     * its upload button: true while that period's grades can be entered.
     */
    public function describe(?SchoolYear $schoolYear, ?array $context): ?SchoolYear
    {
        if (! $schoolYear || ! $context) {
            return $schoolYear;
        }

        $upload = [];

        foreach (SchoolYear::GRADE_PERIODS as $period) {
            $upload[$period] = $this->permissions($context, $period);
        }

        $schoolYear->setAttribute('grade_upload', $upload);
        $schoolYear->setAttribute('allow_upload_midterm', $upload['midterm']['can_edit']);
        $schoolYear->setAttribute('allow_upload_final', $upload['final']['can_edit']);

        return $schoolYear;
    }

    /** Why the action isn't allowed now, or null if it is. */
    public function refusal(array $context, string $period, string $action, ?CarbonInterface $now = null): ?string
    {
        $allowed = $this->permissions($context, $period, $now);

        if ($allowed["can_{$action}"]) {
            return null;
        }

        $label = ucfirst($period);
        $schoolYear = $context['school_year'];

        return match ($allowed['status']) {
            'not_set' => "{$label} grade upload hasn't opened yet.",
            'scheduled' => "{$label} grade upload opens on " . $this->when($schoolYear->getAttribute("{$period}_upload_opens_at")) . '.',
            'closed' => "{$label} grade upload closed on " . $this->when($schoolYear->getAttribute("{$period}_upload_closes_at")) . '. Ask the registrar if something needs to change.',
            // Open, but this action isn't one of the open ones.
            default => "{$label} grades can't be changed right now.",
        };
    }

    private function context(object $row): array
    {
        return [
            'teacher_id' => $row->faculty_id,
            'school_year' => $row->school_year_id ? SchoolYear::find($row->school_year_id) : null,
            // A class nobody opened yet has no submission row: still a draft.
            'statuses' => [
                'midterm' => $row->midterm_status ?? 'draft',
                'final' => $row->final_status ?? 'draft',
            ],
        ];
    }

    // "Fri, Dec 5, 2026, 11:59 PM", in the school's time zone.
    private function when(?CarbonInterface $time): string
    {
        return $time ? $time->copy()->timezone(config('app.timezone'))->format('D, M j, Y, g:i A') : 'an unknown date';
    }
}
