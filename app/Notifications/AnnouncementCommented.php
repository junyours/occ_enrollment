<?php

namespace App\Notifications;

/** A student commented on one of the teacher's announcements. */
class AnnouncementCommented extends SisNotification
{
    public function __construct(
        private int $announcementId,
        private int $classId,
        private string $className,
        private string $comment,
        private array $actor,
    ) {}

    public function category(): string
    {
        return 'classes';
    }

    public function databaseType(object $notifiable): string
    {
        return 'announcement.commented';
    }

    public function subject(): ?array
    {
        return ['type' => 'announcement', 'id' => $this->announcementId];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'title' => "New comment · {$this->className}",
            'body' => "{$this->actor['name']}: {$this->comment}",
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
