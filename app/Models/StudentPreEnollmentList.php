<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentPreEnollmentList extends Model
{
    use HasFactory;

    protected $table = 'student_pre_enrollment_list';
    protected $fillable = [
        'student_id',
        'school_year_id',
        'student_type_id',
        'course_id',
        'year_level_id',
        'pre_enrollment_status',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];
}
