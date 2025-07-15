<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SiteSetting extends Model
{
    use HasFactory;

    protected $table = 'site_settings';
    protected $fillable = [
        'maintenance_mode',
        'blocked_roles',
    ];

    protected $casts = [
        'maintenance_mode' => 'boolean',
        'blocked_roles' => 'array',
    ];

    public static function current()
    {
        return self::first();
    }
}
