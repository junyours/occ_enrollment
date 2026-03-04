<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeedbackKeyword extends Model
{
    protected $fillable = [
        'feedback_category_id',
        'language_id',
        'keyword',
        'type',
        'sentiment',
    ];

    // Keyword belongs to category
    public function category()
    {
        return $this->belongsTo(FeedbackCategory::class, 'feedback_category_id');
    }

    // Keyword belongs to language
    public function language()
    {
        return $this->belongsTo(Language::class);
    }
}
