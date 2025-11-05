<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EvaluationQuestion extends Model
{
    protected $table = 'evaluation_questions';

    protected $fillable = [
        'evaluation_session_id',
        'question_id',
        'question_text',
        'question_position',
        'criteria_id',
        'criteria_title',
        'criteria_position',
    ];

    public function evaluation()
    {
        return $this->belongsTo(Evaluation::class);
    }

    public function question()
    {
        return $this->belongsTo(Question::class);
    }

    public function criteria()
    {
        return $this->belongsTo(Criteria::class);
    }
    
}
