<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GradeSubmission extends Model // ✅ Singular class name
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
    ];

    protected $hidden = [
        'created_at',
        'updated_at',
    ];
}
