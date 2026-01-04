<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EnrolledStudent extends Model
{
    use HasFactory;

    protected $table = 'enrolled_students';
    protected $fillable = [
        'student_id',
        'year_section_id',
        'student_type_id',
        'evaluator_id',
        'enroll_type',
        'date_enrolled',
        'registration_number',
        'evaluated',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function User()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function Evaluator()
    {
        return $this->belongsTo(User::class, 'evaluator_id');
    }

    public function Student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function StudentSubject()
    {
        return $this->hasMany(StudentSubject::class, 'enrolled_students_id');
    }

    public function Subjects()
    {
        return $this->hasMany(StudentSubject::class, 'enrolled_students_id');
    }

    public function YearSection()
    {
        return $this->belongsTo(YearSection::class, 'year_section_id');
    }

    public function StudentType()
    {
        return $this->belongsTo(StudentType::class, 'student_type_id');
    }

    public function getStudentCountAttribute()
    {
        return $this->enrolledStudents()->count();
    }

    public function GraduationRequirements()
    {
        return $this->hasOne(GraduationRequirement::class, 'enrolled_student_id');
    }
}
