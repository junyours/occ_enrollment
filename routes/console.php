<?php

use Illuminate\Foundation\Inspiring;
use App\Services\ClassAnnouncements;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Posts scheduled class announcements when they are due. Needs the
// scheduler's cron (php artisan schedule:run every minute); without it,
// due posts still go out the next time anyone opens the app.
Schedule::call(fn() => app(ClassAnnouncements::class)->releaseDue())
    ->everyMinute()
    ->name('announcements:release')
    ->withoutOverlapping();

// "Continue with SIS-OCC": delete expired and revoked codes and tokens once
// they're more than a week old, so the oauth_* tables don't keep growing.
Schedule::command('passport:purge --hours=168')->dailyAt('02:30');
