<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentSubjectNstpSchedule extends Model
{
    protected $table = 'student_subject_nstp_schedule';

    protected $fillable = [
        'nstp_section_id',
        'faculty_id',
        'room_id',
        'day',
        'start_time',
        'end_time',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];
}
