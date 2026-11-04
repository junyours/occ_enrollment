<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class ActivityLog extends Model
{
    use HasFactory;

    protected $table = 'activity_logs';

    protected $fillable = [
        'user_id',
        'action',
        'subject_type',
        'subject_id',
        'target_type',
        'target_id',
        'description',
        'properties',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'properties' => 'array',
    ];

    public static function normalizeAction(string $action): string
    {
        // Keep activity/resource namespaces, while accepting the older role-prefixed names.
        foreach (['academic_dean.', 'super_admin.'] as $prefix) {
            if (str_starts_with($action, $prefix)) {
                return substr($action, strlen($prefix));
            }
        }

        return $action;
    }

    public function getActionAttribute($value): string
    {
        return self::normalizeAction((string) $value);
    }

    public function setActionAttribute($value): void
    {
        $this->attributes['action'] = self::normalizeAction((string) $value);
    }
    
    /**
     * Who performed the action
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * The model the activity is about (Student, Enrollment, Grade, etc.)
     */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }
}
