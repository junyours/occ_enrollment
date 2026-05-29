<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BillingAccount extends Model
{
    protected $fillable = [
        'student_id',
        'billing_period_id',
    ];

    public function student()
    {
        return $this->belongsTo(User::class, 'student_id');
    }

    public function period()
    {
        return $this->belongsTo(BillingPeriod::class, 'billing_period_id');
    }

    public function items()
    {
        return $this->hasMany(BillingItem::class);
    }
}
