<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use HasFactory;

    protected $table = 'subjects';
    protected $fillable = [
        'type',
        'subject_code',
        'descriptive_title',
        'credit_units',
        'lecture_hours',
        'laboratory_hours',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function Schedules()
    {
        return $this->hasMany(YearSectionSubjects::class, 'subject_id');
    }
}
