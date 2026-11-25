<?php

namespace App\Services;

use App\Models\User;
use App\Notifications\GradesReleased;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

/**
 * Tells a class's students that their midterm or final grades are out.
 * Each student hears once per class and period, so deploying again (say,
 * after an undeploy to fix something) doesn't repeat it. Dropped students
 * aren't told.
 */
class GradeReleaseNotices
{
    /** Sends the notices; returns how many students were told. */
    public function send(int $classId, string $period): int
    {
        $title = DB::table('year_section_subjects as ys')
            ->join('subjects as sub', 'sub.id', '=', 'ys.subject_id')
            ->where('ys.id', $classId)
            ->value('sub.descriptive_title');

        if ($title === null) {
            return 0;
        }

        $alreadyTold = DB::table('notifications')
            ->where('type', GradesReleased::TYPE)
            ->where('subject_type', 'year_section_subject')
            ->where('subject_id', $classId)
            ->where('data->link->params->period', $period)
            ->pluck('notifiable_id');

        $students = User::query()
            ->whereIn('id', DB::table('student_subjects as ss')
                ->join('enrolled_students as e', 'e.id', '=', 'ss.enrolled_students_id')
                ->where('ss.year_section_subjects_id', $classId)
                ->where(fn($query) => $query->whereNull('ss.dropped')->orWhere('ss.dropped', 0))
                ->select('e.student_id'))
            ->whereNotIn('id', $alreadyTold)
            ->get();

        Notification::send($students, new GradesReleased($classId, $period, $title));

        return $students->count();
    }
}
