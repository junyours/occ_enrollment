<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeedbackAnalysis extends Model
{
    protected $fillable = [
        'evaluation_feedback_id',
        'feedback_category_id',
        'type',
        'match_count'
    ];

    // Analysis belongs to feedback
    public function feedback()
    {
        return $this->belongsTo(EvaluationFeedback::class, 'evaluation_feedback_id');
    }

    // Analysis belongs to category
    public function category()
    {
        return $this->belongsTo(FeedbackCategory::class);
    }
}
