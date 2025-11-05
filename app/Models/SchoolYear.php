<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SchoolYear extends Model
{
    use HasFactory;

    protected $table = 'school_years';
    protected $fillable = [
        'semester_id',
        'start_year',
        'end_year',
        'start_date',
        'end_date',
        'is_current',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function Semester()
    {
        return $this->belongsTo(Semester::class, 'semester_id');
    }

    public function YearSection()
    {
        return $this->hasMany(YearSection::class, 'school_year_id');
    }

    public function evaluations()
    {
        return $this->hasMany(Evaluation::class);
    }
}
