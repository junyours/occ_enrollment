<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AcademicRecord extends Model
{
    protected $fillable = [
        'student_id',
        'record_type',
        'school_name',
        'school_year',
        'semester',
        'program',
        'major'
    ];

    // Add this relationship
    public function subjects()
    {
        return $this->hasMany(AcademicRecordSubject::class, 'academic_record_id');
    }
}
