<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentSubject extends Model
{
    use HasFactory;

    protected $table = 'student_subjects';
    protected $fillable = [
        'enrolled_students_id',
        'year_section_subjects_id',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function YearSectionSubjects()
    {
        return $this->belongsTo(YearSectionSubjects::class, 'year_section_subjects_id');
    }

    public function EnrolledStudent()
    {
        return $this->belongsTo(EnrolledStudent::class, 'enrolled_students_id');
    }
}
