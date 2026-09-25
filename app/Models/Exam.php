<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Exam extends Model
{
    protected $table = 'exams';

    protected $fillable = [
        'year_section_subject_id',
        'period',
        'name',
        'max_score'
    ];

    protected $hidden = [
        'created_at',
        'updated_at',
    ];
}
