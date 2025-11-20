<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserParents extends Model
{
    protected $table = 'user_parents';
    protected $fillable = [
        'user_id',
        'father_first_name',
        'father_last_name',
        'father_middle_name',
        'father_suffix',
        'father_contact_number',
        'mother_first_name',
        'mother_maiden_last_name',
        'mother_middle_name',
        'mother_suffix',
        'mother_contact_number',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];
}
