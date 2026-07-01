<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AcademicRecordSubject extends Model
{
    protected $fillable = [
        'academic_record_id',
        'subject_code',
        'descriptive_title',
        'grade',
        're_exam',
        'units'
    ];
}
