<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NstpSection extends Model
{
    protected $table = 'nstp_sections';

    protected $fillable = [
        'nstp_component_id',
        'school_year_id',
        'section',
        'max_students',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function schedule()
    {
        return $this->hasOne(NstpSectionSchedule::class, 'nstp_section_id');
    }

    public function students()
    {
        return $this->hasManyThrough(
            StudentSubjectNstpSchedule::class,
            NstpSectionSchedule::class,
            'nstp_section_id',                // FK on schedules table
            'nstp_section_schedule_id',      // FK on student_subject table
            'id',                             // PK on sections
            'id'                        // PK on schedules
        );
    }
}
