<?php

namespace App\Notifications;

use App\Services\InstructorDashboard;
use Illuminate\Support\Carbon;

/**
 * A teacher tells a student they have missed several meetings of a class in
 * a row: one more and they reach the school's limit for being dropped, or
 * they have reached it.
 */
class AbsenceNotice extends SisNotification
{
    public const TYPE = 'attendance.absence_notice';

    /** @param string[] $dates The absences in a row, oldest first (Y-m-d). */
    public function __construct(
        private int $studentSubjectId,
        private int $classId,
        private string $classTitle,
        private string $section,
        private array $dates,
        private array $teacher,
    ) {}

    public function category(): string
    {
        return 'classes';
    }

    public function databaseType(object $notifiable): string
    {
        return self::TYPE;
    }

    public function subject(): ?array
    {
        return ['type' => 'student_subject', 'id' => $this->studentSubjectId];
    }

    public function toArray(object $notifiable): array
    {
        $count = count($this->dates);
        $next = $count >= InstructorDashboard::DROP_AFTER
            ? 'That’s the school’s limit for being dropped from the class. Please see your teacher as soon as possible.'
            : 'One more absence in a row and you’ll be dropped from the class. Please talk to your teacher.';

        return [
            'title' => "Absences in {$this->classTitle}",
            'body' => "You’ve missed {$count} meetings of {$this->classTitle} ({$this->section}) in a row: "
                . self::dateList($this->dates) . ". {$next}",
            'actor' => $this->teacher,
            'link' => [
                'screen' => 'class.attendance',
                'params' => ['class_id' => $this->classId],
            ],
        ];
    }

    /** "Nov 23 and Nov 25", "Nov 18, Nov 23 and Nov 25", or "Nov 4 to Nov 25" for a long run. */
    public static function dateList(array $dates): string
    {
        $days = array_values(array_unique(array_map(fn($date) => Carbon::parse($date)->format('M j'), $dates)));

        return match (true) {
            count($days) > 3 => $days[0] . ' to ' . end($days),
            count($days) > 1 => implode(', ', array_slice($days, 0, -1)) . ' and ' . end($days),
            default => $days[0] ?? '',
        };
    }
}
