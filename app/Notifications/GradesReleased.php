<?php

namespace App\Notifications;

/** A class's midterm or final grades were released to its students. */
class GradesReleased extends SisNotification
{
    public const TYPE = 'grades.released';

    public function __construct(
        private int $classId,
        private string $period,
        private string $classTitle,
    ) {}

    public function category(): string
    {
        return 'grades';
    }

    public function databaseType(object $notifiable): string
    {
        return self::TYPE;
    }

    public function subject(): ?array
    {
        return ['type' => 'year_section_subject', 'id' => $this->classId];
    }

    public function toArray(object $notifiable): array
    {
        $label = $this->period === 'final' ? 'Final' : 'Midterm';

        return [
            'title' => "{$label} grade released",
            'body' => "Your {$this->period} grade in {$this->classTitle} is now available.",
            'actor' => null,
            'link' => [
                'screen' => 'enrollment.record',
                'params' => ['class_id' => $this->classId, 'period' => $this->period],
            ],
        ];
    }
}
