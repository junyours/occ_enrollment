<?php

namespace App\Notifications\Channels;

use App\Notifications\SisNotification;
use Illuminate\Notifications\Channels\DatabaseChannel;
use Illuminate\Notifications\Notification;

/**
 * Laravel's database channel, plus the category and subject columns every
 * SIS notification fills, so lists and unread counts can filter on them.
 */
class SisDatabaseChannel extends DatabaseChannel
{
    protected function buildPayload($notifiable, Notification $notification)
    {
        $payload = parent::buildPayload($notifiable, $notification);

        if ($notification instanceof SisNotification) {
            $subject = $notification->subject();

            $payload += [
                'category' => $notification->category(),
                'subject_type' => $subject['type'] ?? null,
                'subject_id' => $subject['id'] ?? null,
            ];
        }

        return $payload;
    }
}
