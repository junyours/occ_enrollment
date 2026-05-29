<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingSchoolYear extends Model
{
    protected $fillable = [
        'school_year_name'
    ];

    public function periods()
    {
        return $this->hasMany(BillingPeriod::class);
    }
}
