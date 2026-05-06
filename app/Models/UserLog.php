<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Prunable;
use Illuminate\Database\Eloquent\Builder;

class UserLog extends Model
{
    use Prunable; // 3. Add the trait inside the class

    protected $fillable = [
        'user_id',
        'method',
        'endpoint',
        'ip_address',
        'status_code',  
        'payload',
    ];

    protected $casts = [
        'payload' => 'array',
    ];

    // Optional: Setup relationship back to User
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function prunable(): Builder
    {
        return static::query()->where('created_at', '<', now()->subDays(30));
    }
}
