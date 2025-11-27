<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class GradeEditRequest extends Model
{
    protected $table = 'grade_edit_requests';

    protected $fillable = [
        'year_section_subjects_id',
        'period',
        'status',
        'request_date',
        'rejection_date',
        'approval_date',
        'submission_date',
        'rejection_message',
        'changes',
    ];

    protected $hidden = [
        'created_at',
        'updated_at',
    ];
}
