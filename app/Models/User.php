<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use HasFactory, Notifiable;

    protected $fillable = [
        'user_id_no',
        'password',
        'user_role',
        'password_change'
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'created_at',
        'updated_at'
    ];

    public function username()
    {
        return 'user_id_no';
    }

    public function Faculty()
    {
        return $this->hasOne(Faculty::class, 'faculty_id');
    }

    public function InstructorInfo()
    {
        return $this->hasOne(UserInformation::class, 'user_id');
    }

    public function Student()
    {
        return $this->hasOne(Student::class, 'student_id');
    }

    public function UserInformation()
    {
        return $this->hasOne(UserInformation::class, 'user_id');
    }


    public function EvaluatorInformation()
    {
        return $this->hasOne(UserInformation::class, 'user_id');
    }


    public function InstructorInformation()
    {
        return $this->hasOne(UserInformation::class, 'user_id');
    }

    public function StudentInformation()
    {
        return $this->hasOne(UserInformation::class, 'user_id');
    }

    public function Schedules()
    {
        return $this->hasMany(YearSectionSubjects::class, 'faculty_id');
    }

    public function StudentAttendance()
    {
        return $this->hasMany(StudentAttendance::class, 'student_id');
    }
}

