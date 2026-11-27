<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * One row = "curriculum_term_subjects_id requires required_term_subject_id".
 * Several rows for the same entry mean all of them are required (AND).
 */
class PreRequisiteSubjects extends Model
{
    use HasFactory;

    protected $table = 'pre_requisite_subjects';
    protected $fillable = [
        'curriculum_term_subjects_id',
        'required_term_subject_id',
        'subject_id',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function Subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    /** The earlier curriculum entry that must be passed first. */
    public function RequiredEntry()
    {
        return $this->belongsTo(CurriculumTermSubject::class, 'required_term_subject_id');
    }
}
