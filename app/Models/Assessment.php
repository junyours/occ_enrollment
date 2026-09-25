<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Assessment extends Model
{
    use SoftDeletes;

    protected $table = 'assessments';

    protected $fillable = [
        'grading_category_id',
        'name',
        'max_score',
        'sort_order',
    ];
    
    protected $hidden = [
        'created_at',
        'updated_at',
    ];

    public function gradingCategory()
    {
        return $this->belongsTo(GradingCategory::class, 'grading_category_id');
    }
}
