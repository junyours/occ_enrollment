<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserInformation extends Model
{
    use HasFactory;

    protected $table = 'user_information';
    protected $fillable = [
        'user_id',
        'first_name',
        'last_name',
        'middle_name',
        'gender',
        'birthday',
        'contact_number',
        'email_address',
        'present_address',
        'zip_code',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];


    // user_information.user_id → users.id
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }


    // A student can be enrolled many times through EnrolledStudents
    public function enrolledStudents()
    {
        return $this->hasMany(EnrolledStudent::class, 'student_id', 'user_id');
    }

    // Shortcut to get all the student's YearSection objects
    public function yearSections()
    {
        return $this->hasManyThrough(
            YearSection::class,
            EnrolledStudent::class,
            'student_id',        // FK on enrolled_students
            'id',                // PK on year_section
            'user_id',           // Local key on user_information
            'year_section_id'    // FK on enrolled_students
        );
    }

    // Shortcut to get the courses of the student's enrollments
    public function courses()
    {
        return $this->hasManyThrough(
            Course::class,
            EnrolledStudent::class,
            'student_id',
            'id',
            'user_id',
            'year_section_id'
        )->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->join('course', 'course.id', '=', 'year_section.course_id')
            ->select('course.*');
    }

    // All school years the student has been enrolled under
    public function schoolYears()
    {
        return $this->hasManyThrough(
            SchoolYear::class,
            EnrolledStudent::class,
            'student_id',
            'id',
            'user_id',
            'year_section_id'
        )
            ->join('year_section', 'year_section.id', '=', 'enrolled_students.year_section_id')
            ->join('school_year', 'school_year.id', '=', 'year_section.school_year_id')
            ->select('school_year.*');
    }


    // All subject enrollments for the student
    public function studentSubjects()
    {
        return $this->hasManyThrough(
            StudentSubject::class,
            EnrolledStudent::class,
            'student_id',
            'enrolled_students_id',
            'user_id',
            'id'
        );
    }

    // All class schedules the student is in
    public function yearSectionSubjects()
    {
        return $this->hasManyThrough(
            YearSectionSubjects::class,
            StudentSubject::class,
            'enrolled_students_id',
            'id',
            null,
            'year_section_subjects_id'
        );
    }


    public function attendance()
    {
        return $this->hasMany(StudentAttendance::class, 'student_id', 'user_id');
    }
}
