<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FesStudentGrade extends Model
{
    protected $table = 'fes_student_grades';
    protected $fillable = [
        'id_no',
        'subject_code',
        'subject',
        'year_level',
        'stud_lastname',
        'stud_firstname',
        'stud_middlename',
        'school_year',
        'semester',
        'midterm',
        'final',
        'finalGrade'
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];
}
