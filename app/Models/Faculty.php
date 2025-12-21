<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Faculty extends Model
{
    use HasFactory;

    protected $table = 'faculty';
    protected $fillable = [
        'faculty_id',
        'department_id',
        'active',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function User()
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    public function Department()
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function Schedules()
    {
        return $this->hasMany(YearSectionSubjects::class, 'room_id');
    }

    public function yearSectionSubjects()
    {
        return $this->hasMany(
            YearSectionSubjects::class,
            'faculty_id',
            'faculty_id'
        );
    }

    public function gradeSubmissions()
    {
        return $this->hasManyThrough(
            GradeSubmission::class,
            YearSectionSubjects::class,
            'faculty_id',                  // FK on year_section_subjects
            'year_section_subjects_id',     // FK on grade_submissions
            'faculty_id',                  // local key on faculty
            'id'                            // local key on year_section_subjects
        );
    }
}
