<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NstpSectionSchedule extends Model
{
    protected $table = 'nstp_section_schedules';

    protected $fillable = [
        'nstp_section_id',
        'faculty_id',
        'room_id',
        'day',
        'start_time',
        'end_time',
    ];

    public function Instructor()
    {
        return $this->belongsTo(User::class, 'faculty_id');
    }

    public function Room()
    {
        return $this->belongsTo(Room::class, 'room_id');
    }
}

