<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** A grade matched to a curriculum subject by hand. See App\Services\CurriculumAudit. */
class StudentGradeMatch extends Model
{
    public const PENDING = 'pending';
    public const APPROVED = 'approved';
    public const REJECTED = 'rejected';

    protected $table = 'student_grade_matches';

    protected $fillable = [
        'student_id',
        'course_id',
        'source_type',
        'source_id',
        'subject_id',
        'status',
        'note',
        'requested_by',
        'decided_by',
        'decided_at',
    ];

    protected $casts = [
        'decided_at' => 'datetime',
    ];
}
