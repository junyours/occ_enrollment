<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Language extends Model
{
     protected $fillable = [
        'name',
        'code'
    ];

    // One language has many keywords
    public function keywords()
    {
        return $this->hasMany(FeedbackKeyword::class);
    }
}
