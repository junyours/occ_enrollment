<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentAttendance extends Model
{
    use HasFactory;

    protected $table = 'student_attendance';
    protected $fillable = [
        'year_section_subjects_id',
        'student_id',
        'attendance_date',
        'attendance_status',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function YearSectionSubjects()
    {
        return $this->belongsTo(YearSectionSubjects::class, 'year_section_subjects_id');
    }
}
