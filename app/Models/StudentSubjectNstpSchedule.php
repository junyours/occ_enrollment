<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentSubjectNstpSchedule extends Model
{
    protected $table = 'nstp_section_schedule';

    protected $fillable = [
        'nstp_section_id',
        'faculty_id',
        'room_id',
        'day',
        'start_time',
        'end_time',
    ];
}
