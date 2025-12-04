<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Criteria extends Model
{
     protected $fillable = [
        'title',
        'recommendation',
        'suggestion',
        'position',
    ];
     use SoftDeletes;

    protected $dates = ['deleted_at'];

    public function questions()
{
    return $this->hasMany(Question::class)->orderBy('position');
}

}
