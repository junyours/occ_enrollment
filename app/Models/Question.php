<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Question extends Model
{
     use SoftDeletes;
     
     protected $fillable = ['criteria_id', 'text', 'position'];

    public function criteria()
    {
        return $this->belongsTo(Criteria::class);
    }
}
