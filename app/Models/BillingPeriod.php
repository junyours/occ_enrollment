<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingPeriod extends Model
{
    protected $fillable = [
        'billing_school_year_id',
        'billing_semester_id',
    ];

    public function schoolYear()
    {
        return $this->belongsTo(BillingSchoolYear::class, 'billing_school_year_id');
    }

    public function semester()
    {
        return $this->belongsTo(BillingSemester::class, 'billing_semester_id');
    }

    public function accounts()
    {
        return $this->hasMany(BillingAccount::class);
    }
}
