<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NstpSection extends Model
{
    protected $table = 'nstp_sections';

    protected $fillable = [
        'nstp_component_id',
        'school_year_id',
        'section',
        'max_students',
    ];

    public function schedule()
    {
        return $this->hasOne(NstpSectionSchedule::class, 'nstp_section_id');
    }
}
