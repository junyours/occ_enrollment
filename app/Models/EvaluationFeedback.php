<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EvaluationFeedback extends Model
{
    use HasFactory;

    protected $fillable = [
        'evaluation_session_id',
        'student_id',
        'student_subject_id', // ✅ added
        'strengths',
        'weaknesses',
        'anonymous',
    ];

    public function evaluationSession()
    {
        return $this->belongsTo(Evaluation::class, 'evaluation_session_id');
    }

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function studentSubject()
    {
        return $this->belongsTo(StudentSubject::class); // ✅ new relationship
    }
}
