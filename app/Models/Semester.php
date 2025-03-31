<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Semester extends Model
{
    use HasFactory;

    protected $table = 'semesters';
    protected $fillable = [
        'semester_name',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];
}
