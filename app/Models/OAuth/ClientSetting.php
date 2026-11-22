<?php

namespace App\Models\OAuth;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * The school's rules for one app: who may sign in and whether it's switched on.
 * Also the subject of the app's entries in activity_logs.
 */
class ClientSetting extends Model
{
    public const STATUS_ACTIVE = 'active';
    public const STATUS_SUSPENDED = 'suspended';

    protected $table = 'oauth_client_settings';

    protected $fillable = [
        'oauth_client_id',
        'description',
        'homepage_url',
        'allowed_roles',
        'requires_enrollment',
        'skips_consent',
        'status',
        'created_by',
    ];

    protected $casts = [
        'allowed_roles' => 'array',
        'requires_enrollment' => 'boolean',
        'skips_consent' => 'boolean',
    ];

    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class, 'oauth_client_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function isActive(): bool
    {
        return $this->status === self::STATUS_ACTIVE;
    }
}
