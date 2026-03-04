<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UnknownFeedbackKeyword extends Model
{
    protected $table = 'unknown_feedback_keywords';

    protected $fillable = [
        'term',
        'count',
        'sample_text',
        'status',
        'language_id',
    ];

    /*
    |--------------------------------------------------------------------------
    | Relationships
    |--------------------------------------------------------------------------
    */

    // Optional: if you linked language_id
    public function language()
    {
        return $this->belongsTo(Language::class);
    }

    /*
    |--------------------------------------------------------------------------
    | Scopes (Helpful Queries)
    |--------------------------------------------------------------------------
    */

    // Pending unknown words
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeRejected($query)
{
    return $query->where('status', 'rejected');
}

    // Approved words
    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    /*
    |--------------------------------------------------------------------------
    | Helpers
    |--------------------------------------------------------------------------
    */

    public function approve()
    {
        $this->update(['status' => 'approved']);
    }

    public function reject()
    {
        $this->update(['status' => 'rejected']);
    }
}
