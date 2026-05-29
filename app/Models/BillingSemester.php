<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingSemester extends Model
{
    protected $fillable = [
        'semester_name'
    ];

    public function periods()
    {
        return $this->hasMany(BillingPeriod::class);
    }
}
