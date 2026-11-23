<?php

namespace App\Services;

use App\Models\SchoolYear;
use App\Models\User;
use App\Notifications\GradeUploadClosing;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Reminds teachers whose grades aren't submitted that a period's grade
 * upload closes soon: 3 days before and the day before, counting school
 * calendar days. Runs daily; each teacher gets each reminder once.
 */
class GradeUploadReminders
{
    private const DAYS_BEFORE = [3, 1];

    /** Sends today's reminders; returns how many went out. */
    public function send(?CarbonInterface $now = null): int
    {
        $now ??= now();
        $zone = config('app.timezone');
        $today = $now->copy()->timezone($zone)->startOfDay();
        $sent = 0;

        $schoolYears = SchoolYear::query()
            ->where(fn($query) => $query
                ->where('midterm_upload_closes_at', '>', $now)
                ->orWhere('final_upload_closes_at', '>', $now))
            ->get();

        foreach ($schoolYears as $schoolYear) {
            foreach (SchoolYear::GRADE_PERIODS as $period) {
                $closesAt = $schoolYear->getAttribute("{$period}_upload_closes_at");

                if (! $closesAt || $schoolYear->gradeUploadStatus($period, $now) !== 'open') {
                    continue;
                }

                $daysLeft = (int) $today->diffInDays($closesAt->copy()->timezone($zone)->startOfDay(), false);

                if (! in_array($daysLeft, self::DAYS_BEFORE, true)) {
                    continue;
                }

                foreach ($this->pendingByTeacher($schoolYear->id, $period) as $teacherId => $classes) {
                    $teacher = User::find($teacherId);

                    if (! $teacher || $this->remindedToday((int) $teacherId, $schoolYear->id, $period, $today)) {
                        continue;
                    }

                    $teacher->notify(new GradeUploadClosing(
                        $schoolYear->id,
                        $period,
                        $daysLeft,
                        (int) $classes,
                        $closesAt->copy()->timezone($zone)->format('D, M j, g:i A'),
                    ));
                    $sent++;
                }
            }
        }

        return $sent;
    }

    /**
     * Classes per teacher in the school year whose period isn't submitted
     * yet: regular classes and NSTP classes together.
     */
    private function pendingByTeacher(int $schoolYearId, string $period): array
    {
        $unsubmitted = fn($query) => $query
            // No row yet means nobody opened the class: still a draft.
            ->whereNull("gs.{$period}_status")
            ->orWhereIn("gs.{$period}_status", ['draft', 'rejected']);

        $regular = DB::table('year_section_subjects as ys')
            ->join('year_section as sec', 'sec.id', '=', 'ys.year_section_id')
            ->leftJoin('grade_submissions as gs', 'gs.year_section_subjects_id', '=', 'ys.id')
            ->where('sec.school_year_id', $schoolYearId)
            ->whereNotNull('ys.faculty_id')
            ->where($unsubmitted)
            ->groupBy('ys.faculty_id')
            ->selectRaw('ys.faculty_id, count(*) as classes')
            ->pluck('classes', 'faculty_id');

        // An NSTP class is a section schedule; its submission row is keyed by
        // the schedule's id (see GradeUploadGate::nstpSchedule).
        $nstp = DB::table('nstp_section_schedules as nss')
            ->join('nstp_sections as ns', 'ns.id', '=', 'nss.nstp_section_id')
            ->leftJoin('nstp_grade_submissions as gs', 'gs.nstp_section_id', '=', 'nss.id')
            ->where('ns.school_year_id', $schoolYearId)
            ->whereNotNull('nss.faculty_id')
            ->where($unsubmitted)
            ->groupBy('nss.faculty_id')
            ->selectRaw('nss.faculty_id, count(*) as classes')
            ->pluck('classes', 'faculty_id');

        $pending = [];

        foreach ([$regular, $nstp] as $counts) {
            foreach ($counts as $teacherId => $classes) {
                $pending[$teacherId] = ($pending[$teacherId] ?? 0) + (int) $classes;
            }
        }

        return $pending;
    }

    private function remindedToday(int $teacherId, int $schoolYearId, string $period, CarbonInterface $today): bool
    {
        return DB::table('notifications')
            ->where('notifiable_id', $teacherId)
            ->where('type', 'grades.upload_closing')
            ->where('subject_type', 'school_year')
            ->where('subject_id', $schoolYearId)
            ->where('data->link->params->period', $period)
            ->where('created_at', '>=', $today)
            ->exists();
    }
}
