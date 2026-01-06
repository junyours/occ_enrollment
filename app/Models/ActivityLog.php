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
        'description',
        'ip_address',
        'user_agent',
    ];

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
