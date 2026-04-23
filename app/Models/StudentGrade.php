<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentGrade extends Model
{
    protected $table = 'student_grades';

    protected $fillable = [
        'school_year',
        'semester',
        'program',
        'major',
        'year_level',
        'id_no',
        'last_name',
        'first_name',
        'middle_name',
        'sex',
        'subject_code',
        'subject',
        'units',
        'grade',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];
}
