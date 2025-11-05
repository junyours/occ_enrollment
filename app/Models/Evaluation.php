<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Evaluation extends Model
{
    use SoftDeletes;

    protected $table = 'evaluation';

    protected $fillable = [
        'school_year_id',
        'start_date',
        'end_date',
        'status',
    ];

    public function schoolYear()
    {
        return $this->belongsTo(SchoolYear::class);
    }
    public function questions() 
    {
        return $this->belongsToMany(Question::class, 'evaluation_questions');
    }
    public function evaluationQuestions()
{
    return $this->hasMany(EvaluationQuestion::class, 'evaluation_session_id');
}


}
