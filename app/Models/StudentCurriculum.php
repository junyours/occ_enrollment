<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A curriculum staff set by hand for a student in a program. See App\Services\StudentCurricula. */
class StudentCurriculum extends Model
{
    protected $table = 'student_curricula';

    protected $fillable = [
        'student_id',
        'course_id',
        'curriculum_id',
        'set_by',
    ];
}
