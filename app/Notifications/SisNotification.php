<?php

namespace App\Notifications;

use App\Notifications\Channels\SisDatabaseChannel;
use Illuminate\Notifications\Notification;

/**
 * The shape every notification in the system shares, so the web app and
 * the mobile app can show any of them: a stable type, a category, what it
 * is about, and data with a plain-text title and body, the actor, and a
 * link that names a screen rather than a web address.
 */
abstract class SisNotification extends Notification
{
    /** enrollment | grades | requests | classes | account | system */
    abstract public function category(): string;

    /** The stable event key stored in `type`, e.g. announcement.posted. */
    abstract public function databaseType(object $notifiable): string;

    /**
     * [
     *   'title' => string,
     *   'body' => string,
     *   'actor' => ['id' => int, 'name' => string] | null,
     *   'link' => ['screen' => string, 'params' => array] | null,
     * ]
     */
    abstract public function toArray(object $notifiable): array;

    /** What it is about, as ['type' => 'announcement', 'id' => 40], or null. */
    public function subject(): ?array
    {
        return null;
    }

    // Saved for the bell and the in-app list. Push and email can be added
    // here later without changing any notification.
    public function via(object $notifiable): array
    {
        return [SisDatabaseChannel::class];
    }
}
