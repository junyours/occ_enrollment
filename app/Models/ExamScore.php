<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ExamScore extends Model
{
    use SoftDeletes;

    protected $table = 'exam_scores';

    protected $fillable = [
        'exam_id',
        'student_subject_id',
        'score',
    ];

    protected $hidden = [
        'created_at',
        'updated_at',
    ];
}
