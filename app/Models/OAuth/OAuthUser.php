<?php

namespace App\Models\OAuth;

use App\Models\Concerns\RequiresPasswordChange;
use App\Models\User;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Passport\Contracts\OAuthenticatable;
use Laravel\Passport\HasApiTokens;

/**
 * The SIS account as seen by the `api` guard (Bearer tokens from Passport).
 *
 * It reads the same `users` table as App\Models\User. It exists because
 * Passport's HasApiTokens and Sanctum's HasApiTokens define the same methods
 * with different signatures, so they can't share one model. Sanctum keeps
 * serving the mobile app and CSG attendance; this model serves OAuth only.
 */
class OAuthUser extends Authenticatable implements OAuthenticatable
{
    use HasApiTokens, RequiresPasswordChange;

    protected $table = 'users';

    protected $guarded = ['*'];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'active' => 'boolean',
    ];

    /**
     * The full SIS user record, with its relations.
     */
    public function account(): User
    {
        return User::with('information')->findOrFail($this->getKey());
    }
}
