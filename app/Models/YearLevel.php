<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Models\CurriculumTerm;

class YearLevel extends Model
{
    use HasFactory;

    protected $table = 'year_level';
    protected $fillable = [
        'year_level',
        'year_level_name',
    ];

    protected $hidden = [
        'created_at',
        'updated_at'
    ];

    public function CurriculumTerm()
    {
        return $this->hasMany(CurriculumTerm::class, 'year_level_id');
    }

    public function YearSection()
    {
        return $this->hasMany(YearSection::class, 'year_level_id');
    }
}
