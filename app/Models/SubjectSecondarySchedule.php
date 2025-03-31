<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SubjectSecondarySchedule extends Model
{
    use HasFactory;

    protected $table = 'subject_secondary_schedule';
    protected $fillable = [
        'year_section_subjects_id',
        'room_id',
        'day',
        'start_time',
        'end_time',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function Room()
    {
        return $this->belongsTo(Room::class, 'room_id');
    }

    public function YearSectionSubjects() 
    {
        return $this->belongsTo(YearSectionSubjects::class, 'year_section_subjects_id');
    }
}
