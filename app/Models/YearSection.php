<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\EnrolledStudent;

class YearSection extends Model
{
    use HasFactory;

    protected $table = 'year_section';
    protected $fillable = [
        'school_year_id',
        'course_id',
        'year_level_id',
        'section',
        'max_students',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function EnrolledStudents()
    {
        return $this->hasMany(EnrolledStudent::class, 'year_section_id');
    }

    public function Course()
    {
        return $this->belongsTo(Course::class, 'course_id');
    }

    public function YearLevel()
    {
        return $this->belongsTo(YearLevel::class, 'year_level_id');
    }

    public function SchoolYear()
    {
        return $this->belongsTo(SchoolYear::class, 'school_year_id');
    }

    public function getStudentCountAttribute()
    {
        return $this->EnrolledStudents()->count();
    }

    public function Classes()
    {
        return $this->hasMany(YearSectionSubjects::class, 'year_section_id');
    }
}
