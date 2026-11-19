<?php

namespace App\Notifications;

/** A teacher posted an announcement in a class the student takes. */
class AnnouncementPosted extends SisNotification
{
    public function __construct(
        private int $announcementId,
        private int $classId,
        private string $className,
        private string $excerpt,
        private ?array $actor,
    ) {}

    public function category(): string
    {
        return 'classes';
    }

    public function databaseType(object $notifiable): string
    {
        return 'announcement.posted';
    }

    public function subject(): ?array
    {
        return ['type' => 'announcement', 'id' => $this->announcementId];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => "New announcement · {$this->className}",
            'body' => $this->excerpt,
            'actor' => $this->actor,
            'link' => [
                'screen' => 'class.announcements',
                'params' => [
                    'class_id' => $this->classId,
                    'announcement_id' => $this->announcementId,
                ],
            ],
        ];
    }
}
