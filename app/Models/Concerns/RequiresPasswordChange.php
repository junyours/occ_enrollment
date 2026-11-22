<?php

namespace App\Models\Concerns;

use Illuminate\Support\Carbon;

/**
 * Accounts created on or after the cut-off must replace their first password
 * before they can use the SIS, the mobile app or any app signed in through SIS-OCC.
 */
trait RequiresPasswordChange
{
    public function requiresPasswordChange(): bool
    {
        return in_array($this->getAttribute('password_change'), [false, 0, '0'], true)
            && $this->created_at !== null
            && $this->created_at->gte(Carbon::parse('2026-10-26 00:00:00', config('app.timezone')));
    }
}
