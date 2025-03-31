<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PreRequisiteSubjects extends Model
{
    use HasFactory;

    protected $table = 'pre_requisite_subjects';
    protected $fillable = [
        'curriculum_term_subjects_id',
        'subject_id',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function Subject()
    {
        return $this->hasOne(Subject::class, 'subject_id');
    }
}
