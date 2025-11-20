<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserPresentAddress extends Model
{
    protected $table = 'user_present_address';
    protected $fillable = [
        'user_id',
        'street',
        'barangay',
        'barangay_code',
        'city',
        'city_code',
        'province',
        'province_code',
        'region',
        'region_code',
        'zip_code',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];
}
