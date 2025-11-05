<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentDraft extends Model
{
   protected $fillable = [
        'student_id',
        'evaluation_id',
        'student_subject_id',
        'answers',
        'strengths',
        'weaknesses',
        'anonymous',
    ];

    protected $casts = [
        'answers' => 'array',
        'anonymous' => 'boolean',
    ];
}
