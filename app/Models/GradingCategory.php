<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class GradingCategory extends Model
{
    use SoftDeletes;

    protected $table = 'grading_categories';

    protected $fillable = [
        'year_section_subject_id',
        'period',
        'name',
        'weight',
        'sort_order',
    ];

    public function assessments()
    {
        return $this->hasMany(Assessment::class, 'grading_category_id');
    }

    protected $hidden = [
        'created_at',
        'updated_at',
    ];
}
