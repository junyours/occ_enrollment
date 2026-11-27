<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CurriculumTermSubject extends Model
{
    use HasFactory;

    protected $table = 'curriculum_term_subjects';
    protected $fillable = [
        'curriculum_term_id',
        'subject_id',
        'requisite_subject_name',
        'required_year_level_id',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function Subject()
    {
        return $this->belongsTo(Subject::class, 'subject_id');
    }

    public function PreRequisiteSubjects()
    {
        return $this->hasMany(PreRequisiteSubjects::class, 'curriculum_term_subjects_id');
    }

    public function CurriculumTerm()
    {
        return $this->belongsTo(CurriculumTerm::class, 'curriculum_term_id');
    }

    /** Optional year standing, e.g. year level 3 = "3rd Year Standing". */
    public function RequiredYearLevel()
    {
        return $this->belongsTo(YearLevel::class, 'required_year_level_id');
    }
}
