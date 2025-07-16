<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserInformation extends Model
{
    use HasFactory;

    protected $table = 'user_information';
    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'middle_name',
        'gender',
        'birthday',
        'contact_number',
        'email_address',
        'present_address',
        'zip_code',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];
}
