<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class AssessmentScore extends Model
{
    use SoftDeletes;

    protected $table = 'assessment_scores';

    protected $fillable = [
        'assessment_id',
        'student_subject_id',
        'score',
    ];

    protected $hidden = [
        'created_at',
        'updated_at',
    ];
}
