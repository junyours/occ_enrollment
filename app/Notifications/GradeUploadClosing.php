<?php

namespace App\Notifications;

/** A period's grade upload closes soon and some of the teacher's classes haven't submitted. */
class GradeUploadClosing extends SisNotification
{
    public function __construct(
        private int $schoolYearId,
        private string $period,
        private int $daysLeft,
        private int $classes,
        private string $closesAt,
    ) {}

    public function category(): string
    {
        return 'grades';
    }

    public function databaseType(object $notifiable): string
    {
        return 'grades.upload_closing';
    }

    public function subject(): ?array
    {
        return ['type' => 'school_year', 'id' => $this->schoolYearId];
    }

    public function toArray(object $notifiable): array
    {
        $label = ucfirst($this->period);
        $when = $this->daysLeft === 1 ? 'tomorrow' : "in {$this->daysLeft} days";
        $classes = $this->classes === 1
            ? '1 of your classes hasn’t'
            : "{$this->classes} of your classes haven’t";

        return [
            'title' => "{$label} grades close {$when}",
            'body' => "{$classes} been submitted. Grade upload closes {$this->closesAt}.",
            'actor' => null,
            'link' => [
                'screen' => 'classes',
                'params' => [
                    'school_year_id' => $this->schoolYearId,
                    'period' => $this->period,
                ],
            ],
        ];
    }
}
