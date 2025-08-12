<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    use HasFactory;

    protected $table = 'course';
    protected $fillable = [
        'department_id',
        'course_name',
        'major',
        'course_name_abbreviation',
    ];
    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function Department()
    {
        return $this->belongsTo(Department::class, 'department_id');
    }

    public function YearSection()
    {
        return $this->hasMany(YearSection::class, 'course_id');
    }

    public function Curriculum()
    {
        return $this->hasMany(Curriculum::class, 'course_id');
    }

    public function enrolledStudents()
    {
        return $this->hasManyThrough(
            EnrolledStudent::class,
            YearSection::class,
            'course_id',       // FK on year_sections
            'year_section_id', // FK on enrolled_students
            'id',              // PK on courses
            'id'               // PK on year_sections
        );
    }
}
