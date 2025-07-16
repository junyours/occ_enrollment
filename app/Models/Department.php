<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\Course;
use App\Models\Room;

class Department extends Model
{
    use HasFactory;

    protected $table = 'department';
    protected $fillable = [
        'department_name',
        'department_name_abbreviation',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function Course()
    {
        return $this->hasMany(Course::class, 'department_id');
    }

    public function Room()
    {
        return $this->hasMany(Room::class, 'department_id');
    }

    public function Faculty()
    {
        return $this->hasMany(Faculty::class, 'department_id');
    }

    public function enrolledStudents()
    {
        return $this->hasManyThrough(
            EnrolledStudent::class,
            YearSection::class,
            'course_id',         // FK on year_section
            'year_section_id',  // FK on enrolled_students
            'id',                // department.id
            'id'           // year_section.id
        );
    }
}
