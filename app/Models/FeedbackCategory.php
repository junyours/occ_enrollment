<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FeedbackCategory extends Model
{
    protected $fillable = [
        'name',
        'description',
        'recommendation'
    ];

    // Category → many keywords
    public function keywords()
    {
        return $this->hasMany(FeedbackKeyword::class);
    }

    // Category → many analysis results
    public function analyses()
    {
        return $this->hasMany(FeedbackAnalysis::class);
    }
}
