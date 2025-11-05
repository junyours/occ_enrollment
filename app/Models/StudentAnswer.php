<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StudentAnswer extends Model
{
    use HasFactory;

    protected $fillable = [
        'evaluation_question_id',
        'student_id',
        'student_subject_id', // ✅ added
        'rating',
        'anonymous',
    ];

    public function evaluationQuestion()
    {
        return $this->belongsTo(EvaluationQuestion::class);
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
