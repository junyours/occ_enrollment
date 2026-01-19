<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StudentSubjectNstpSchedule extends Model
{
    protected $table = 'student_subject_nstp_schedule';

    protected $fillable = [
        'nstp_section_schedule_id',
        'student_subject_id',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function NstpSectionSchedule()
    {
        return $this->belongsTo(NstpSectionSchedule::class, 'nstp_section_schedule_id');
    }
}
