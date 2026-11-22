<?php

namespace App\Models\OAuth;

use App\Models\User;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Laravel\Passport\Client as PassportClient;

/**
 * A school app registered to use "Continue with SIS-OCC".
 */
class Client extends PassportClient
{
    public function settings(): HasOne
    {
        return $this->hasOne(ClientSetting::class, 'oauth_client_id');
    }

    public function maintainers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'oauth_client_maintainers', 'oauth_client_id', 'user_id')
            ->withPivot('added_by')
            ->withTimestamps();
    }

    /**
     * School-owned apps go straight back to the app after sign-in, without
     * an "allow access?" screen. MIS turns this off for anything else.
     */
    public function skipsAuthorization(Authenticatable $user, array $scopes): bool
    {
        return (bool) $this->settings?->skips_consent;
    }
}
