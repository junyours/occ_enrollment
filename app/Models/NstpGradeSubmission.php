<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class NstpGradeSubmission extends Model
{
    use HasFactory;

    protected $table = 'nstp_grade_submissions';

    protected $fillable = [
        'nstp_section_id',

        'midterm_status',
        'midterm_submitted_at',
        'midterm_verified_at',
        'midterm_rejection_message',
        'midterm_deployed_at',
        'final_status',
        'final_submitted_at',
        'final_verified_at',
        'final_rejection_message',
        'final_deployed_at',
    ];

    protected $hidden = [
        'created_at',
        'updated_at',
    ];

    // Inside NstpGradeSubmission.php
    public function nstpSection()
    {
        return $this->belongsTo(NstpSection::class, 'nstp_section_id');
    }

    // Inside NstpSection.php
    public function schedules()
    {
        return $this->hasMany(NstpSectionSchedule::class, 'nstp_section_id');
    }
}
