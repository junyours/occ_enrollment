<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GradeSubmission extends Model
{
    use HasFactory;

    protected $table = 'grade_submissions';

    protected $fillable = [
        'year_section_subjects_id',
        'submitted_at',
        'is_submitted',
        'is_verified',
        'verified_at',
        'is_rejected',
        'rejection_message',
        'deployed_at',
        'is_deployed',

        /* new settings */
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

    public function yearSectionSubject()
    {
        return $this->belongsTo(
            YearSectionSubjects::class,
            'year_section_subjects_id',
            'id'
        );
    }
}
